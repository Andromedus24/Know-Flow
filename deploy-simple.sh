#!/bin/bash

# Know-Flow Simple Deployment Script (No Docker Required)
set -e

echo "🚀 Starting Know-Flow simple deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    print_status "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
print_status "Activating virtual environment..."
source venv/bin/activate

# Install backend dependencies
print_status "Installing backend dependencies..."
pip install -r backend/requirements.txt

# Build frontend
print_status "Building frontend..."
npm run build

# Check if build was successful
if [ ! -d "build" ]; then
    print_error "Frontend build failed"
    exit 1
fi

print_status "✅ Frontend built successfully"

# Test backend configuration
print_status "Testing backend configuration..."
cd backend
python -c "from config import config; print('Configuration loaded successfully')" 2>/dev/null || {
    print_warning "Backend configuration needs environment variables"
    print_status "You can set them up later for full functionality"
}

cd ..

# Show deployment status
echo ""
print_status "🎉 Simple deployment completed successfully!"
echo ""
echo "Frontend build is ready in the 'build' folder"
echo "You can deploy it to any static hosting service:"
echo ""
echo "  - Vercel: vercel --prod"
echo "  - Netlify: netlify deploy --prod --dir=build"
echo "  - GitHub Pages: npm run deploy"
echo "  - Firebase Hosting: firebase deploy --only hosting"
echo ""
echo "Backend dependencies are installed in the virtual environment"
echo "To run the backend, you'll need to:"
echo "  1. Set up environment variables in backend/.env"
echo "  2. Run: cd backend && python start.py"
echo ""
echo "To serve the frontend locally:"
echo "  npx serve -s build"
