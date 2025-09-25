
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse
import shutil
import os
import models
import schemas
import crud
import utils
from database import SessionLocal, engine
from config import STORAGE_PATH
from fastapi.middleware.cors import CORSMiddleware
import time
from typing import List

models.Base.metadata.create_all(bind=engine)
app = FastAPI(title="Research Repository")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/api/upload")
async def upload_research_paper(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload and process research paper"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        # Save file
        os.makedirs(STORAGE_PATH, exist_ok=True)
        file_location = os.path.join(STORAGE_PATH, file.filename)
        with open(file_location, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        # Extract text and metadata
        text_content = utils.pdf_to_text(file_location)
        metadata = utils.extract_paper_metadata(text_content)
        
        # Create paper record
        paper_data = schemas.ResearchPaperCreate(
            filename=file.filename,
            title=metadata['title'] or file.filename.replace('.pdf', ''),
            authors=metadata['authors'],
            abstract=metadata['abstract'],
            journal=metadata['journal'],
            content=text_content
        )
        
        db_paper = crud.create_research_paper(db, paper_data)
        
        # Add to vector index
        chunks, embeddings = utils.add_paper_to_index(text_content, db_paper.id)
        
        # Update paper with chunks and embeddings
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
            
            formatted_results.append(schemas.SearchResult(
                id=paper.id,
                title=paper.title or paper.filename,
                authors=paper.authors or [],
                abstract=paper.abstract or "",
                journal=paper.journal,
                publication_date=paper.publication_date,
                snippet=snippet,
                similarity_score=result['score'],
                filename=paper.filename
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
def delete_paper(paper_id: int, db: Session = Depends(get_db)):
    """Delete research paper"""
    success = crud.delete_research_paper(db, paper_id)
    if not success:
        raise HTTPException(status_code=404, detail="Paper not found")
    return {"message": "Paper deleted successfully"}

@app.get("/api/download/{paper_id}")
async def download_paper(paper_id: int, db: Session = Depends(get_db)):
    """Download research paper PDF"""
    paper = crud.get_research_paper(db, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    file_path = os.path.join(STORAGE_PATH, paper.filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=paper.filename,
        media_type='application/pdf'
    )