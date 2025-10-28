from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil, os
import models
import schemas
import crud
import database
import utils
from database import SessionLocal, engine
from config import STORAGE_PATH, MEDICAL_SYSTEMS, RESEARCH_CATEGORIES, PROJECT_STATUS
from typing import Optional
import json

models.Base.metadata.create_all(bind=engine)
app = FastAPI(title="Research Repository")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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

@app.get("/api/debug/faiss-status")
def debug_faiss_status():
    """Debug endpoint to check FAISS index status"""
    total_vectors = utils.faiss_index.ntotal
    return {
        "total_vectors": total_vectors,
        "index_file_exists": os.path.exists(utils.FAISS_INDEX_PATH),
        "index_path": utils.FAISS_INDEX_PATH
    }

@app.get("/api/debug/documents")
def debug_documents(db: Session = Depends(get_db)):
    """Debug endpoint to list all documents"""
    documents = db.query(models.Document).all()
    return [{
        "id": doc.id,
        "filename": doc.filename,
        "title": doc.article_title or doc.project_title,
        "content_length": len(doc.content) if doc.content else 0,
        "medical_system": doc.medical_system.value if doc.medical_system else None,
        "research_category": doc.research_category.value if doc.research_category else None
    } for doc in documents]

@app.post("/api/upload")
async def upload_document(
    # Medical System and Research Category (required)
    medical_system: str = Form(...),
    research_category: str = Form(...),
    
    # Project Details (optional)
    project_title: Optional[str] = Form(None),
    start_year: Optional[int] = Form(None),
    end_year: Optional[int] = Form(None),
    institution: Optional[str] = Form(None),
    investigator_name: Optional[str] = Form(None),
    sanction_date: Optional[str] = Form(None),
    project_status: str = Form("ONGOING"),
    
    # Publication Details (optional)
    article_title: Optional[str] = Form(None),
    publication_year: Optional[int] = Form(None),
    authors: Optional[str] = Form(None),
    journal_name: Optional[str] = Form(None),
    
    # Research Details (optional)
    objectives: Optional[str] = Form(None),
    study_protocol: Optional[str] = Form(None),
    outcomes: Optional[str] = Form(None),
    
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Save file
    file_location = os.path.join(STORAGE_PATH, file.filename)
    with open(file_location, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Extract text from PDF
    text_content = utils.pdf_to_text(file_location)
    
    # Extract metadata
    extracted_metadata = utils.extract_metadata_from_text(text_content)
    
    # Create document with all metadata
    doc_data = schemas.DocumentCreate(
        filename=file.filename,
        content=text_content,
        extracted_data=extracted_metadata,
        
        # Medical System and Research Category
        medical_system=medical_system,
        research_category=research_category,
        
        # Project Details
        project_title=project_title,
        start_year=start_year,
        end_year=end_year,
        institution=institution,
        investigator_name=investigator_name,
        sanction_date=sanction_date,
        project_status=project_status,
        
        # Publication Details
        article_title=article_title or extracted_metadata.get('title'),
        publication_year=publication_year or extracted_metadata.get('year'),
        authors=authors or extracted_metadata.get('authors'),
        journal_name=journal_name or extracted_metadata.get('journal'),
        
        # Research Details
        objectives=objectives,
        study_protocol=study_protocol,
        outcomes=outcomes
    )
    
    db_doc = crud.create_document(db, doc_data)

    # Add to FAISS for semantic search
    utils.add_to_faiss([text_content], [db_doc.id])
    
    # Also store embedding in database
    utils.add_document_embedding(db, db_doc.id, text_content)
    
    return {
        "message": "Document uploaded successfully", 
        "doc_id": db_doc.id,
        "extracted_metadata": extracted_metadata
    }

@app.get("/api/search")
def search_documents(
    query: Optional[str] = None,
    medical_system: Optional[str] = None,
    research_category: Optional[str] = None,
    institution: Optional[str] = None,
    author: Optional[str] = None,
    journal: Optional[str] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    project_status: Optional[str] = None,
    investigator: Optional[str] = None,
    db: Session = Depends(get_db)
):
    print(f"🔍 [SEARCH DEBUG] Received search request:")
    print(f"   Query: '{query}'")
    print(f"   Medical System: {medical_system}")
    print(f"   Research Category: {research_category}")
    print(f"   Institution: {institution}")
    print(f"   Author: {author}")
    print(f"   Journal: {journal}")
    print(f"   Year Range: {year_from}-{year_to}")
    print(f"   Project Status: {project_status}")
    print(f"   Investigator: {investigator}")
    
    # Check FAISS status
    print(f"   FAISS Total Vectors: {utils.faiss_index.ntotal}")
    
    # Base query
    results_query = db.query(models.Document)
    
    # Apply filters
    if medical_system:
        results_query = results_query.filter(models.Document.medical_system == medical_system)
    if research_category:
        results_query = results_query.filter(models.Document.research_category == research_category)
    if institution:
        results_query = results_query.filter(models.Document.institution.ilike(f"%{institution}%"))
    if author:
        results_query = results_query.filter(models.Document.authors.ilike(f"%{author}%"))
    if journal:
        results_query = results_query.filter(models.Document.journal_name.ilike(f"%{journal}%"))
    if year_from:
        results_query = results_query.filter(models.Document.publication_year >= year_from)
    if year_to:
        results_query = results_query.filter(models.Document.publication_year <= year_to)
    if project_status:
        results_query = results_query.filter(models.Document.project_status == project_status)
    if investigator:
        results_query = results_query.filter(models.Document.investigator_name.ilike(f"%{investigator}%"))
    
    # If there's a search query, use semantic search
    indices = []
    if query and query.strip():
        print(f"🎯 [SEARCH] Performing semantic search for: '{query}'")
        indices = utils.semantic_search(query.strip())
        print(f"📊 [SEARCH] Semantic search returned {len(indices)} results: {indices}")
        
        if indices:
            results_query = results_query.filter(models.Document.id.in_(indices))
        else:
            # No semantic results found
            print("❌ [SEARCH] No semantic results found")
            return []
    else:
        print("ℹ️ [SEARCH] No query provided, using filtered search only")
    
    # Execute the query
    results = results_query.all()
    print(f"✅ [SEARCH] Database query returned {len(results)} results")
    
    # If we have semantic search results, maintain their order
    if query and query.strip() and indices:
        results_dict = {doc.id: doc for doc in results}
        ordered_results = [results_dict[idx] for idx in indices if idx in results_dict]
        print(f"📋 [SEARCH] Ordered results: {[doc.id for doc in ordered_results]}")
    else:
        ordered_results = results
    
    medical_system_labels = {
        'UNANI': 'Unani',
        'AYURVEDA': 'Ayurveda', 
        'YOGA': 'Yoga',
        'SIDDHA': 'Siddha'
    }
    
    research_category_labels = {
        'CLINICAL_GRADE_A': 'Clinical Research Grade A',
        'CLINICAL_GRADE_B': 'Clinical Research Evidence Grade B',
        'CLINICAL_GRADE_C': 'Clinical Research Evidence Grade C', 
        'PRE_CLINICAL': 'Pre Clinical Research',
        'FUNDAMENTAL': 'Fundamental Research',
        'DRUG': 'Drug Research'
    }
    
    project_status_labels = {
        'ONGOING': 'Ongoing',
        'COMPLETED': 'Completed',
        'TERMINATED': 'Terminated'
    }

    formatted_results = [{
        "id": d.id,
        "filename": d.filename,
        "title": d.article_title or d.project_title or d.filename.replace('.pdf', ''),
        "authors": d.authors or "Unknown Authors",
        "journal": d.journal_name or "Unknown Publication",
        "year": d.publication_year,
        "medical_system": medical_system_labels.get(d.medical_system.value, d.medical_system.value),
        "research_category": research_category_labels.get(d.research_category.value, d.research_category.value),
        "institution": d.institution,
        "project_status": project_status_labels.get(d.project_status.value, d.project_status.value),
        "investigator": d.investigator_name,
        "project_title": d.project_title,
        "start_year": d.start_year,
        "end_year": d.end_year,
        "snippet": get_relevant_snippet(d.content, query) if query else (d.content[:300] + "..." if len(d.content) > 300 else d.content),
        "objectives": d.objectives,
        "study_protocol": d.study_protocol,
        "outcomes": d.outcomes,
        "created_at": d.created_at.isoformat() if d.created_at else None
    } for d in ordered_results]
    
    print(f"🎉 [SEARCH] Returning {len(formatted_results)} formatted results")
    return formatted_results


@app.get("/api/filters/options")
def get_filter_options(db: Session = Depends(get_db)):
    """Get available options for filters"""
    institutions = db.query(models.Document.institution).distinct().all()
    authors = db.query(models.Document.authors).distinct().all()
    journals = db.query(models.Document.journal_name).distinct().all()
    investigators = db.query(models.Document.investigator_name).distinct().all()
    
    # Return the enum values (not display names)
    return {
        "medical_systems": [ms.value for ms in models.MedicalSystem],
        "research_categories": [rc.value for rc in models.ResearchCategory],
        "project_status": [ps.value for ps in models.ProjectStatus],
        "institutions": [inst[0] for inst in institutions if inst[0]],
        "authors": [auth[0] for auth in authors if auth[0]],
        "journals": [jour[0] for jour in journals if jour[0]],
        "investigators": [inv[0] for inv in investigators if inv[0]]
    }

@app.get("/api/browse")
def browse_documents(db: Session = Depends(get_db)):
    documents = crud.get_documents(db)
    result = []

    for d in documents:
        result.append({
            "id": d.id,
            "filename": d.filename,
            "title": d.article_title or d.project_title or d.filename.replace(".pdf", ""),
            "authors": d.authors or "Unknown Authors",
            "journal": d.journal_name or "Unknown Journal",
            "publication_year": d.publication_year,
            "medical_system": d.medical_system.value if hasattr(d.medical_system, "value") else d.medical_system,
            "research_category": d.research_category.value if hasattr(d.research_category, "value") else d.research_category,
            "project_status": d.project_status.value if hasattr(d.project_status, "value") else d.project_status,
            "institution": d.institution,
            "investigator_name": d.investigator_name,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })

    return result


@app.get("/api/download/{document_id}")
async def download_document(document_id: int, db: Session = Depends(get_db)):
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_path = os.path.join(STORAGE_PATH, document.filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on server")
    
    return FileResponse(
        path=file_path,
        filename=document.filename,
        media_type='application/pdf'
    )

def get_relevant_snippet(content: str, query: str, max_length: int = 300) -> str:
    if not content or not query:
        return (content[:max_length] + "...") if len(content) > max_length else content
    
    content_lower = content.lower()
    query_lower = query.lower()
    query_terms = [term for term in query_lower.split() if len(term) > 2]
    
    if not query_terms:
        return content[:max_length] + "..." if len(content) > max_length else content
    
    best_position = -1
    best_term = ""
    
    for term in query_terms:
        pos = content_lower.find(term)
        if pos != -1 and (best_position == -1 or pos < best_position):
            best_position = pos
            best_term = term
    
    if best_position != -1:
        context_size = 100
        start = max(0, best_position - context_size)
        end = min(len(content), best_position + len(best_term) + context_size)
        
        snippet = content[start:end]
        
        if start > 0:
            snippet = "..." + snippet
        if end < len(content):
            snippet = snippet + "..."
            
        return snippet
    
    sections = ['abstract', 'introduction', 'conclusion', 'summary']
    for section in sections:
        section_pos = content_lower.find(section)
        if section_pos != -1:
            start = max(0, section_pos)
            end = min(len(content), start + max_length)
            snippet = content[start:end]
            if start > 0:
                snippet = "..." + snippet
            if end < len(content):
                snippet = snippet + "..."
            return snippet
    
    return content[:max_length] + "..." if len(content) > max_length else content

@app.post("/api/rebuild-index")
def rebuild_faiss_index(db: Session = Depends(get_db)):
    """Rebuild FAISS index from all documents in database"""
    try:
        utils.rebuild_faiss_from_database()
        return {"message": "FAISS index rebuilt successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error rebuilding index: {str(e)}")