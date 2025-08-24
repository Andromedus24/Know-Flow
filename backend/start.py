#!/usr/bin/env python3
"""
Know-Flow Backend Startup Script
"""

import sys
import logging
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from config import config
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Main startup function"""
    try:
        logger.info("Starting Know-Flow Backend...")
        
        # Validate configuration
        logger.info("Validating configuration...")
        config.validate()
        logger.info("Configuration validated successfully")
        
        # Import and start the FastAPI app
        from main import app
        
        logger.info(f"Starting server on {config.HOST}:{config.PORT}")
        uvicorn.run(
            app,
            host=config.HOST,
            port=config.PORT,
            log_level="info" if config.DEBUG else "warning"
        )
        
    except ValueError as e:
        logger.error(f"Configuration error: {e}")
        logger.error("Please check your .env file and ensure all required variables are set")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Failed to start backend: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
