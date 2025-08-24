import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Configuration class for Know-Flow backend"""
    
    # Firebase Configuration
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "")
    FIREBASE_CLIENT_EMAIL: str = os.getenv("FIREBASE_CLIENT_EMAIL", "")
    FIREBASE_PRIVATE_KEY: str = os.getenv("FIREBASE_PRIVATE_KEY", "")
    FIRESTORE_PATH: Optional[str] = os.getenv("FIRESTORE_PATH")
    
    # API Keys
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    
    # Server Configuration
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Database Configuration
    DATABASE_COLLECTION_USERS: str = "users"
    DATABASE_COLLECTION_LESSON_PLANS: str = "lessonPlans"
    DATABASE_COLLECTION_PROMPTS: str = "prompts"
    DATABASE_COLLECTION_KNOWLEDGE_GRAPHS: str = "knowledgeGraphs"
    
    # Content Generation Configuration
    MAX_LESSONS_PER_PLAN: int = int(os.getenv("MAX_LESSONS_PER_PLAN", "10"))
    MAX_EXTERNAL_RESOURCES_PER_LESSON: int = int(os.getenv("MAX_EXTERNAL_RESOURCES_PER_LESSON", "5"))
    
    # Validation
    @classmethod
    def validate(cls) -> bool:
        """Validate that all required configuration is present"""
        required_fields = [
            "FIREBASE_PROJECT_ID",
            "FIREBASE_CLIENT_EMAIL", 
            "FIREBASE_PRIVATE_KEY",
            "OPENAI_API_KEY"
        ]
        
        missing_fields = []
        for field in required_fields:
            if not getattr(cls, field):
                missing_fields.append(field)
        
        if missing_fields:
            raise ValueError(f"Missing required configuration: {missing_fields}")
        
        return True
    
    @classmethod
    def get_firebase_config(cls) -> dict:
        """Get Firebase configuration dictionary"""
        return {
            "type": "service_account",
            "project_id": cls.FIREBASE_PROJECT_ID,
            "client_email": cls.FIREBASE_CLIENT_EMAIL,
            "private_key": cls.FIREBASE_PRIVATE_KEY.replace('\\n', '\n'),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{cls.FIREBASE_CLIENT_EMAIL}"
        }

# Global config instance
config = Config()
