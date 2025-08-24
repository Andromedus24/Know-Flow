from fastapi import FastAPI, HTTPException, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field, ValidationError
from typing import List, Dict, Any, Optional
import os
import json
from datetime import datetime, timedelta
import asyncio
from openai import AsyncOpenAI
import firebase_admin
from firebase_admin import credentials, firestore, auth
from dotenv import load_dotenv
import uuid
import logging
import time
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables first
load_dotenv()

# Verify required environment variables
required_env_vars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL', 
    'FIREBASE_PRIVATE_KEY',
    'OPENAI_API_KEY'
]

missing_vars = [key for key in required_env_vars if not os.getenv(key)]
if missing_vars:
    logger.error(f"Missing environment variables: {missing_vars}")
    exit(1)

# Initialize Firebase Admin SDK
service_account_info = {
    "type": "service_account",
    "project_id": os.getenv('FIREBASE_PROJECT_ID'),
    "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
    "private_key": os.getenv('FIREBASE_PRIVATE_KEY').replace('\\n', '\n'),
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{os.getenv('FIREBASE_CLIENT_EMAIL')}"
}

if not firebase_admin._apps:
    try:
        cred = credentials.Certificate(service_account_info)
        firebase_admin.initialize_app(cred)
        logger.info("Firebase initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {e}")
        exit(1)

db = firestore.client()

# Rate limiting storage
rate_limit_storage = {}

# Startup and shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Know-Flow API...")
    yield
    # Shutdown
    logger.info("Shutting down Know-Flow API...")

# Initialize FastAPI app
app = FastAPI(
    title="Know-Flow Learning API", 
    version="2.0.0",
    description="AI-powered learning management system API with enhanced features",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Enhanced middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # Configure appropriately for production
)

# Security
security = HTTPBearer()

# Enhanced Pydantic models
class UserPromptRequest(BaseModel):
    userId: str = Field(..., min_length=1, max_length=100, description="User identifier")
    prompt: str = Field(..., min_length=1, max_length=2000, description="Learning prompt or question")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context for the prompt")
    learningStyle: Optional[str] = Field(default="adaptive", description="Preferred learning style")

class UserPromptGetResponse(BaseModel):
    userId: str
    lessons: List[Dict[str, Any]]
    success: bool = True
    message: str = "Success"
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class UserPromptPostResponse(BaseModel):
    success: bool
    message: str
    userId: str
    prompt: str
    planId: Optional[str] = None
    estimatedDuration: Optional[int] = None
    difficulty: Optional[str] = None

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    details: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    requestId: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    database: str
    ai_service: str
    timestamp: str
    version: str
    uptime: float

# Enhanced error handling
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            error="Validation Error",
            details=str(exc),
            requestId=str(uuid.uuid4())
        ).dict()
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    request_id = str(uuid.uuid4())
    logger.error(f"Unhandled exception {request_id}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error="Internal Server Error",
            details="An unexpected error occurred",
            requestId=request_id
        ).dict()
    )

# Rate limiting middleware
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host
    current_time = time.time()
    
    # Clean old entries
    rate_limit_storage = {k: v for k, v in rate_limit_storage.items() 
                         if current_time - v['timestamp'] < 60}
    
    if client_ip in rate_limit_storage:
        if rate_limit_storage[client_ip]['count'] >= 100:  # 100 requests per minute
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content=ErrorResponse(
                    error="Rate limit exceeded",
                    details="Too many requests. Please try again later."
                ).dict()
            )
        rate_limit_storage[client_ip]['count'] += 1
    else:
        rate_limit_storage[client_ip] = {'count': 1, 'timestamp': current_time}
    
    response = await call_next(request)
    return response

app.middleware("http")(rate_limit_middleware)

# Enhanced authentication dependency
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

# Dependency for Firebase client
def get_firestore_client():
    return db

# Enhanced health check endpoint
@app.get("/", tags=["Health"], response_model=Dict[str, str])
async def root():
    """Health check endpoint"""
    return {
        "message": "Know-Flow Learning API is running",
        "version": "2.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "status": "healthy"
    }

@app.get("/health", tags=["Health"], response_model=HealthResponse)
async def health_check():
    """Detailed health check with enhanced monitoring"""
    start_time = time.time()
    
    try:
        # Test Firebase connection
        db.collection("health").document("test").get()
        db_status = "connected"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "disconnected"
    
    try:
        # Test AI service (OpenAI)
        client = AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        ai_status = "connected"
    except Exception as e:
        logger.error(f"AI service health check failed: {e}")
        ai_status = "disconnected"
    
    return HealthResponse(
        status="healthy" if db_status == "connected" and ai_status == "connected" else "degraded",
        database=db_status,
        ai_service=ai_status,
        timestamp=datetime.utcnow().isoformat(),
        version="2.0.0",
        uptime=time.time() - start_time
    )

# Enhanced GET endpoint with better validation
@app.get("/api/user-prompt", response_model=UserPromptGetResponse, tags=["Learning"])
async def get_user_prompt(
    userId: str, 
    prompt: str,
    db_client: firestore.Client = Depends(get_firestore_client)
):
    """Get prompt from user and forward it to the POST endpoint with enhanced validation"""
    
    if not userId or len(userId.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Missing or invalid userId"
        )
    
    if not prompt or len(prompt.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Missing or invalid prompt"
        )
    
    try:
        logger.info(f"GET received - User: {userId}, Prompt: {prompt[:100]}...")
        
        # Create request object for POST endpoint
        request_data = UserPromptRequest(userId=userId.strip(), prompt=prompt.strip())
        
        # Call the POST endpoint internally
        post_response = await post_user_prompt(request_data, db_client)
        
        logger.info(f"POST response generated successfully for user {userId}")
        return post_response
        
    except Exception as e:
        logger.error(f"Error in GET /api/user-prompt: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to process request: {str(e)}"
        )

# Enhanced POST endpoint with better error handling and AI integration
@app.post("/api/user-prompt", response_model=UserPromptPostResponse, tags=["Learning"])
async def post_user_prompt(
    request: UserPromptRequest,
    db_client: firestore.Client = Depends(get_firestore_client)
):
    """Receive prompt from frontend partners and generate learning content with enhanced processing"""
    
    try:
        logger.info(f"Processing prompt from user {request.userId}: {request.prompt[:100]}...")
        
        # Validate user exists
        user_ref = db_client.collection("users").document(request.userId)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            # Create user if doesn't exist
            user_ref.set({
                "uid": request.userId,
                "createdAt": datetime.utcnow(),
                "lastActive": datetime.utcnow(),
                "learningPreferences": {
                    "learningStyle": request.learningStyle or "adaptive",
                    "difficultyLevel": "beginner",
                    "topicsOfInterest": [],
                    "timeAvailability": 30
                }
            })
            logger.info(f"Created new user: {request.userId}")
        
        # Store the prompt in Firestore with enhanced metadata
        prompt_data = {
            "userId": request.userId,
            "prompt": request.prompt,
            "context": request.context or {},
            "learningStyle": request.learningStyle or "adaptive",
            "timestamp": datetime.utcnow(),
            "status": "processing",
            "processingStarted": datetime.utcnow()
        }
        
        # Generate a unique plan ID
        plan_id = str(uuid.uuid4())
        prompt_data["planId"] = plan_id
        
        # Store in Firestore with better organization
        user_ref = db_client.collection("users").document(request.userId)
        prompt_ref = user_ref.collection("prompts").document(plan_id)
        prompt_ref.set(prompt_data)
        
        # Also store in a global prompts collection for analytics
        global_prompt_ref = db_client.collection("prompts").document(plan_id)
        global_prompt_ref.set({
            **prompt_data,
            "globalId": plan_id,
            "analytics": {
                "processingTime": None,
                "userSatisfaction": None,
                "completionRate": None
            }
        })
        
        # TODO: Integrate with enhanced content generation system
        # For now, acknowledge receipt with estimated processing time
        
        logger.info(f"Successfully processed prompt for user {request.userId}")
        
        return UserPromptPostResponse(
            success=True,
            message="Prompt received and processing started. AI agents are working on your personalized learning plan.",
            userId=request.userId,
            prompt=request.prompt,
            planId=plan_id,
            estimatedDuration=15,  # minutes
            difficulty="adaptive"
        )
        
    except Exception as e:
        logger.error(f"Error in POST /api/user-prompt: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to process prompt: {str(e)}"
        )

# Enhanced user plans endpoint with pagination and filtering
@app.get("/api/user/{userId}/plans", tags=["Learning"])
async def get_user_plans(
    userId: str,
    status: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    db_client: firestore.Client = Depends(get_firestore_client)
):
    """Get all learning plans for a user with enhanced filtering and pagination"""
    try:
        user_ref = db_client.collection("users").document(userId)
        
        # Check if user exists
        if not user_ref.get().exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        plans_ref = user_ref.collection("lessonPlans")
        
        # Apply filters
        query = plans_ref
        if status:
            query = query.where("status", "==", status)
        
        # Apply pagination
        query = query.limit(limit).offset(offset)
        
        plans = []
        for doc in query.stream():
            plan_data = doc.to_dict()
            plan_data["planId"] = doc.id
            plans.append(plan_data)
        
        # Get total count for pagination
        total_query = plans_ref
        if status:
            total_query = total_query.where("status", "==", status)
        total_count = len(list(total_query.stream()))
        
        return {
            "success": True,
            "userId": userId,
            "plans": plans,
            "count": len(plans),
            "total": total_count,
            "pagination": {
                "limit": limit,
                "offset": offset,
                "hasMore": offset + limit < total_count
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting plans for user {userId}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to retrieve plans: {str(e)}"
        )

# New endpoint for learning analytics
@app.get("/api/user/{userId}/analytics", tags=["Analytics"])
async def get_user_analytics(
    userId: str,
    timeframe: str = "30d",  # 7d, 30d, 90d, 1y
    db_client: firestore.Client = Depends(get_firestore_client)
):
    """Get comprehensive learning analytics for a user"""
    try:
        # Calculate date range
        end_date = datetime.utcnow()
        if timeframe == "7d":
            start_date = end_date - timedelta(days=7)
        elif timeframe == "30d":
            start_date = end_date - timedelta(days=30)
        elif timeframe == "90d":
            start_date = end_date - timedelta(days=90)
        elif timeframe == "1y":
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=30)
        
        user_ref = db_client.collection("users").document(userId)
        
        # Get learning sessions
        sessions_ref = user_ref.collection("studySessions")
        sessions_query = sessions_ref.where("startTime", ">=", start_date)
        
        sessions = []
        total_study_time = 0
        for doc in sessions_query.stream():
            session_data = doc.to_dict()
            if session_data.get("duration"):
                total_study_time += session_data["duration"]
            sessions.append(session_data)
        
        # Get completed lessons
        plans_ref = user_ref.collection("lessonPlans")
        completed_plans = []
        for doc in plans_ref.where("status", "==", "completed").stream():
            completed_plans.append(doc.to_dict())
        
        # Calculate analytics
        analytics = {
            "userId": userId,
            "timeframe": timeframe,
            "totalStudyTime": total_study_time,  # minutes
            "averageSessionLength": total_study_time / len(sessions) if sessions else 0,
            "totalSessions": len(sessions),
            "completedPlans": len(completed_plans),
            "completionRate": len(completed_plans) / len(list(plans_ref.stream())) if plans_ref else 0,
            "studyStreak": 0,  # TODO: Implement streak calculation
            "topics": [],  # TODO: Implement topic analysis
            "learningProgress": {
                "beginner": 0,
                "intermediate": 0,
                "advanced": 0
            }
        }
        
        return {
            "success": True,
            "analytics": analytics,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting analytics for user {userId}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve analytics: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    logger.info(f"Starting Know-Flow API v2.0.0 on {host}:{port}")
    uvicorn.run(
        app, 
        host=host, 
        port=port,
        log_level="info",
        access_log=True
    )