from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import os
import json
from datetime import datetime
import asyncio
from openai import AsyncOpenAI
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
import uuid
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
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

# Initialize FastAPI app
app = FastAPI(
    title="Know-Flow Learning API", 
    version="1.0.0",
    description="AI-powered learning management system API"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Pydantic models with better validation
class UserPromptRequest(BaseModel):
    userId: str = Field(..., min_length=1, description="User identifier")
    prompt: str = Field(..., min_length=1, description="Learning prompt or question")

class UserPromptGetResponse(BaseModel):
    userId: str
    lessons: List[Dict[str, Any]]
    success: bool = True
    message: str = "Success"

class UserPromptPostResponse(BaseModel):
    success: bool
    message: str
    userId: str
    prompt: str
    planId: Optional[str] = None

class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    details: Optional[str] = None

# Dependency for Firebase client
def get_firestore_client():
    return db

# Routes
@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint"""
    return {
        "message": "Know-Flow Learning API is running",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check"""
    try:
        # Test Firebase connection
        db.collection("health").document("test").get()
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unhealthy")

# GET ENDPOINT - Get prompt from user and call POST
@app.get("/api/user-prompt", response_model=UserPromptGetResponse, tags=["Learning"])
async def get_user_prompt(
    userId: str, 
    prompt: str,
    db_client: firestore.Client = Depends(get_firestore_client)
):
    """Get prompt from user and forward it to the POST endpoint"""
    
    if not userId:
        raise HTTPException(status_code=400, detail="Missing userId")
    
    if not prompt:
        raise HTTPException(status_code=400, detail="Missing prompt")
    
    try:
        logger.info(f"GET received - User: {userId}, Prompt: {prompt}")
        
        # Create request object for POST endpoint
        request_data = UserPromptRequest(userId=userId, prompt=prompt)
        
        # Call the POST endpoint internally
        post_response = await post_user_prompt(request_data, db_client)
        
        logger.info(f"POST response: {post_response}")
        return post_response
        
    except Exception as e:
        logger.error(f"Error in GET /api/user-prompt: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# POST ENDPOINT - Receive prompt from partners
@app.post("/api/user-prompt", response_model=UserPromptPostResponse, tags=["Learning"])
async def post_user_prompt(
    request: UserPromptRequest,
    db_client: firestore.Client = Depends(get_firestore_client)
):
    """Receive prompt from frontend partners and generate learning content"""
    
    try:
        logger.info(f"Received prompt from user {request.userId}: {request.prompt}")
        
        # Store the prompt in Firestore
        prompt_data = {
            "userId": request.userId,
            "prompt": request.prompt,
            "timestamp": datetime.utcnow(),
            "status": "processing"
        }
        
        # Generate a unique plan ID
        plan_id = str(uuid.uuid4())
        prompt_data["planId"] = plan_id
        
        # Store in Firestore
        user_ref = db_client.collection("users").document(request.userId)
        prompt_ref = user_ref.collection("prompts").document(plan_id)
        prompt_ref.set(prompt_data)
        
        # TODO: Integrate with content generation system
        # For now, just acknowledge receipt
        
        logger.info(f"Successfully processed prompt for user {request.userId}")
        
        return UserPromptPostResponse(
            success=True,
            message="Prompt received and processing started",
            userId=request.userId,
            prompt=request.prompt,
            planId=plan_id
        )
        
    except Exception as e:
        logger.error(f"Error in POST /api/user-prompt: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user/{userId}/plans", tags=["Learning"])
async def get_user_plans(
    userId: str,
    db_client: firestore.Client = Depends(get_firestore_client)
):
    """Get all learning plans for a user"""
    try:
        user_ref = db_client.collection("users").document(userId)
        plans_ref = user_ref.collection("lessonPlans")
        plans = []
        
        for doc in plans_ref.stream():
            plan_data = doc.to_dict()
            plan_data["planId"] = doc.id
            plans.append(plan_data)
        
        return {
            "success": True,
            "userId": userId,
            "plans": plans,
            "count": len(plans)
        }
        
    except Exception as e:
        logger.error(f"Error getting plans for user {userId}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Starting Know-Flow API on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)