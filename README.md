# Know-Flow: AI-Powered Learning Management System

Know-Flow is an intelligent learning management system that uses AI agents to create personalized learning plans, generate knowledge graphs, and adapt to individual learning styles.

## 🚀 Features

- **AI-Powered Content Generation**: Multi-agent system for creating comprehensive learning plans
- **Knowledge Graph Generation**: Visual representation of learning concepts and relationships
- **Personalized Learning**: Adapts to user preferences and learning pace
- **Real-time Progress Tracking**: Monitor learning progress and achievements
- **Modern Web Interface**: React-based frontend with responsive design
- **Scalable Backend**: FastAPI backend with Firebase integration

## 🏗️ Architecture

### Frontend (React + TypeScript)
- Modern React 19 with TypeScript
- Tailwind CSS for styling
- React Router for navigation
- Firebase authentication
- Responsive design for all devices

### Backend (Python + FastAPI)
- FastAPI for high-performance API
- Multi-agent AI system using Agno framework
- Firebase Firestore for data storage
- OpenAI and Anthropic integration
- Comprehensive error handling and logging

### AI Agents
- **Content Generator**: Creates learning plans and materials
- **Researcher**: Finds relevant external resources
- **Knowledge Graph Generator**: Builds concept relationships
- **Learning Orchestrator**: Coordinates all agents

## 🛠️ Setup & Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- Firebase project
- OpenAI API key
- Anthropic API key (optional)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create environment file:
```bash
cp .env.example .env
# Edit .env with your API keys and Firebase configuration
```

5. Start the backend:
```bash
python start.py
```

### Frontend Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm start
```

### Docker Setup

1. Build and run with Docker Compose:
```bash
docker-compose up --build
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-private-key

# API Keys
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Server Configuration
PORT=8000
HOST=0.0.0.0
DEBUG=false
```

## 📚 API Documentation

Once the backend is running, visit:
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### Key Endpoints

- `GET /api/user-prompt` - Generate learning plan from prompt
- `POST /api/user-prompt` - Submit learning prompt
- `GET /api/user/{userId}/plans` - Get user's learning plans

## 🧪 Testing

### Backend Tests
```bash
cd backend
python -m pytest
```

### Frontend Tests
```bash
npm test
```

## 🚀 Deployment

### Backend Deployment
```bash
cd backend
docker build -t know-flow-backend .
docker run -p 8000:8000 know-flow-backend
```

### Frontend Deployment
```bash
npm run build
# Deploy the build folder to your hosting service
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the configuration examples

## 🔄 Changelog

### v1.0.0
- Initial release with AI-powered learning system
- Multi-agent content generation
- Knowledge graph visualization
- Modern React frontend
- FastAPI backend with Firebase integration
