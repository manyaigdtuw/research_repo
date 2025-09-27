# Research Repository - Advanced Research Document Management System

![License](https://img.shields.io/badge/license-MIT-green.svg) 
![Build](https://img.shields.io/badge/build-passing-brightgreen) 
![Python](https://img.shields.io/badge/python-3.8+-blue.svg) 
![React](https://img.shields.io/badge/react-18-blue.svg) 
![FastAPI](https://img.shields.io/badge/fastapi-0.95+-teal.svg) 
![PostgreSQL](https://img.shields.io/badge/postgresql-12+-blue.svg)

 **Overview**  
Research Repository is a comprehensive web application designed for managing, searching, and organizing research papers and academic documents. It combines modern web technologies with powered search capabilities to create an efficient research management platform.

##  Features

### Advanced Search
- **Natural Language Search**: Query research papers using everyday language  
- **Semantic Search**: AI-powered understanding of research content and context  
- **Hybrid Search**: Combines keyword matching with semantic understanding  
- **Real-time Filtering**: Filter results by category, project, and publication date  

### Document Management
- **PDF Upload & Processing**: Automated text extraction and metadata handling  
- **Smart Categorization**: Organize papers by research categories (Clinical, Applied Research, etc.)  
- **Project Association**: Link papers to specific research projects  
- **Batch Processing**: Efficient handling of multiple document uploads  

### User Management
- **Role-based Access**: Admin and regular user roles   
- **Admin Dashboard**: Comprehensive management interface  

### Project Organization
- **Project Tracking**: Manage research projects with team members and timelines  
- **Status Monitoring**: Track project progress (ongoing/completed)  
- **Team Collaboration**: Assign papers to specific projects and teams  

## Technology Stack

**Frontend**
- React 18 - Modern UI framework  
- Axios - HTTP client for API communication  
- React Router - Client-side routing  
- CSS3 - Custom responsive design with modern styling  

**Backend**
- FastAPI - High-performance Python web framework  
- SQLAlchemy - Database ORM  
- PostgreSQL - Primary database  
- JWT - Secure authentication  

** AI & Search**
- FAISS - Facebook's similarity search library  
- OpenRouter API - Embedding generation and AI capabilities  
- PyMuPDF - PDF text extraction  

**Deployment & Infrastructure**
- PostgreSQL - Data persistence  
- File System Storage - Document storage management  

---

##  Installation & Setup

### Prerequisites
- Python 3.8+  
- Node.js 16+  
- PostgreSQL 12+  
- npm or yarn  

### Backend Setup
Clone the repository
```bash
git clone <repository-url>
cd research-repository
```
#### Set up Python environment
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```
#### Install Python dependencies
```bash
pip install -r requirements.txt
```
#### Environment Configuration
Create a .env file in the backend directory:
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/researchrepo
OPENROUTER_API_KEY=sk-or-v1-...
JWT_SECRET_KEY=your-secret-key
STORAGE_PATH=./storage/pdfs
FAISS_INDEX_PATH=./embeddings/faiss_index.pkl
EMBEDDING_MODEL=text-embedding-3-large
```
#### Database Setup
```bash
# The application will create tables automatically on first run
# Ensure PostgreSQL is running and database exists
```
#### Start Backend Server
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
### Frontend Setup
Navigate to frontend directory and install dependencies
```bash
cd frontend
npm install
```
#### Start development server
```bash
npm start
```

## Project Structure
```bash
research-repository/
├── backend/
│   ├── main.py              # FastAPI application entry point
│   ├── models.py            # SQLAlchemy database models
│   ├── schemas.py           # Pydantic schemas for data validation
│   ├── crud.py              # Database operations
│   ├── auth.py              # Authentication utilities
│   ├── utils.py             # AI search and PDF processing utilities
│   ├── config.py            # Configuration settings
│   ├── database.py          # Database connection setup
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SearchPage.jsx
│   │   │   ├── SearchResults.jsx
│   │   │   ├── AdminUploadPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   └── ProjectManagement.jsx
│   │   ├── api.js           # API service functions
│   │   ├── App.js           # Main application component
│   │   └── App.css          # Application styles
│   └── package.json
└── storage/
    └── pdfs/                # Uploaded PDF storage
```

## API Endpoints
#### Authentication
POST /api/auth/register - User registration
POST /api/auth/login - User login
GET /api/auth/me - Get current user info

#### Projects
POST /api/projects - Create new project (Admin only)
GET /api/projects - Get all projects

#### Research Papers
POST /api/upload - Upload research paper (Admin only)
GET /api/search - Search papers
GET /api/papers - Get all papers
GET /api/papers/{id} - Get specific paper
DELETE /api/papers/{id} - Delete paper (Admin only)
GET /api/download/{id} - Download paper PDF

## Usage Guide
#### For Researchers
Search Papers: Use the search bar with natural language queries
Filter Results: Use category and project filters to narrow results
Download Papers: Click download button to get PDF copies

#### For Administrators
Login: Access admin features with admin account
Upload Papers: Use the upload form to add new research papers
Manage Projects: Create and organize research projects
Manage Metadata: Add detailed metadata during upload

#### Upload Process
Fill in paper metadata (title, authors, abstract, etc.)
Select appropriate category and project association
Upload PDF file
System automatically processes and indexes the content
