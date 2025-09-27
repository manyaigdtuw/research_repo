from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, status, Form
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import shutil
import os
from fastapi import Query
import models
import schemas
import crud
import auth
import utils
from database import SessionLocal, engine
from config import STORAGE_PATH
from fastapi.middleware.cors import CORSMiddleware
import time
from typing import List, Optional
from datetime import datetime
import json

models.Base.metadata.create_all(bind=engine)
app = FastAPI(title="Research Repository")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    #allow_origins=["https://c84ece130d6d.ngrok-free.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = auth.verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    user = crud.get_user_by_username(db, username=username)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    return user

# Authentication endpoints
@app.post("/api/auth/register")
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return crud.create_user(db=db, user=user)

@app.post("/api/auth/login")
def login(form_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, username=form_data.username)
    if not user or not crud.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer", "is_admin": user.is_admin}

@app.get("/api/auth/me")
def get_current_user_info(current_user: models.User = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "email": current_user.email,
        "is_admin": current_user.is_admin,
        "is_active": current_user.is_active
    }

# Project endpoints
@app.post("/api/projects", response_model=schemas.Project)
def create_project(
    project: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to create projects")
    
    db_project = crud.get_project_by_name(db, name=project.name)
    if db_project:
        raise HTTPException(status_code=400, detail="Project name already exists")
    
    return crud.create_project(db=db, project=project, user_id=current_user.id)

@app.get("/api/projects", response_model=List[schemas.Project])
def get_projects(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    projects = crud.get_projects(db, skip=skip, limit=limit)
    return projects

# Research paper endpoints (protected)
@app.post("/api/upload")
async def upload_research_paper(
    file: UploadFile = File(...),
    title: str = Form(...),
    authors: str = Form(...),
    abstract: str = Form(""),
    journal: str = Form(""),
    publication_date: str = Form(""),
    keywords: str = Form(""),
    category: str = Form(...),
    project_id: Optional[int] = None,  # <-- keep as query param
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to upload papers")

    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    try:
        # Save file
        os.makedirs(STORAGE_PATH, exist_ok=True)
        file_location = os.path.join(STORAGE_PATH, file.filename)
        with open(file_location, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # Extract text for search indexing
        text_content = utils.pdf_to_text(file_location)

        # Parse JSON arrays from form data
        try:
            authors_list = json.loads(authors) if authors else []
        except:
            authors_list = [authors] if authors else []

        try:
            keywords_list = json.loads(keywords) if keywords else []
        except:
            keywords_list = [keywords] if keywords else []

        # Parse publication date
        pub_date = None
        if publication_date:
            try:
                pub_date = datetime.fromisoformat(publication_date.replace('Z', '+00:00'))
            except:
                try:
                    pub_date = datetime.strptime(publication_date, "%Y-%m-%d")
                except:
                    pub_date = None

        # Create paper record
        paper_data = schemas.ResearchPaperCreate(
            filename=file.filename,
            title=title,
            authors=authors_list,
            abstract=abstract,
            journal=journal,
            publication_date=pub_date,
            keywords=keywords_list,
            category=category,
            content=text_content,
            project_id=project_id  # <-- query param used here
        )

        db_paper = crud.create_research_paper(db, paper_data, current_user.id)

        # Add to search index
        chunks, embeddings = utils.add_paper_to_index(text_content, db_paper.id)
        db_paper.chunks = chunks
        db_paper.embeddings = embeddings
        db.commit()

        return {
            "message": "Research paper uploaded successfully",
            "paper_id": db_paper.id,
            "title": db_paper.title,
            "chunks_processed": len(chunks)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


# Public search endpoints (no authentication required)
@app.get("/api/search")
def search_papers(query: str, top_k: int = 10, db: Session = Depends(get_db)):
    """Search papers using hybrid search"""
    start_time = time.time()
    
    if not query.strip():
        return schemas.SearchResponse(
            query=query,
            results=[],
            total_count=0,
            search_time=0.0
        )
    
    try:
        # Get all papers for hybrid search
        all_papers = crud.get_all_research_papers(db)
        
        if not all_papers:
            return schemas.SearchResponse(
                query=query,
                results=[],
                total_count=0,
                search_time=0.0
            )
        
        # Perform hybrid search
        search_results = utils.hybrid_search(query, all_papers, top_k)
        
        # Format results
        formatted_results = []
        for result in search_results:
            paper = result['paper']
            chunk_index = result['chunk_index']
            
            # Get relevant snippet
            snippet = utils.get_relevant_snippet(
                paper.chunks[chunk_index] if paper.chunks and chunk_index < len(paper.chunks) else paper.content,
                query
            )
            
            # Get project info
            project_name = None
            project_status = None
            if paper.project_id:
                project = crud.get_project_by_id(db, paper.project_id)
                project_name = project.name if project else None
                project_status = project.status if project else None
            
            formatted_results.append(schemas.SearchResult(
                id=paper.id,
                title=paper.title or paper.filename,
                authors=paper.authors or [],
                abstract=paper.abstract or "",
                journal=paper.journal,
                publication_date=paper.publication_date,
                category=paper.category,
                snippet=snippet,
                similarity_score=result['score'],
                filename=paper.filename,
                project_name=project_name,
                project_status=project_status  
            ))
        
        search_time = time.time() - start_time
        
        return schemas.SearchResponse(
            query=query,
            results=formatted_results,
            total_count=len(formatted_results),
            search_time=search_time
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.get("/api/papers")
def get_all_papers(db: Session = Depends(get_db)):
    """Get all research papers"""
    papers = crud.get_all_research_papers(db)
    return papers

@app.get("/api/papers/{paper_id}")
def get_paper(paper_id: int, db: Session = Depends(get_db)):
    """Get specific paper details"""
    paper = crud.get_research_paper(db, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return paper

@app.delete("/api/papers/{paper_id}")
def delete_paper(
    paper_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Delete research paper"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete papers")
    
    success = crud.delete_research_paper(db, paper_id)
    if not success:
        raise HTTPException(status_code=404, detail="Paper not found")
    return {"message": "Paper deleted successfully"}

@app.get("/api/download/{paper_id}")
async def download_paper(
    paper_id: int,
    db: Session = Depends(get_db),
    view: bool = Query(False)  # <-- use Query for optional query parameters
):
    """Download or view research paper PDF"""
    paper = crud.get_research_paper(db, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    file_path = os.path.join(STORAGE_PATH, paper.filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    disposition = "inline" if view else "attachment"
    
    return FileResponse(
        path=file_path,
        filename=paper.filename,
        media_type="application/pdf",
        headers={"Content-Disposition": f"{disposition}; filename={paper.filename}"}
    )


@app.get("/")
def read_root():
    return {"message": "Research Repository API is running"}

@app.get("/api/documents/search")
def search_documents(query: str, top_k: int = 10, db: Session = Depends(get_db)):
    """Alternative search endpoint for compatibility"""
    return search_papers(query, top_k, db)