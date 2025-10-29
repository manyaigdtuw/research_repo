from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import shutil, os
import models
import schemas
from typing import List
import crud
import database
import utils
from database import SessionLocal, engine
from config import STORAGE_PATH, MEDICAL_SYSTEMS, RESEARCH_CATEGORIES, PROJECT_STATUS, JWT_SECRET_KEY, ALGORITHM
from typing import Optional
import json
from auth import create_access_token, verify_token, get_password_hash, verify_password
from datetime import timedelta
from fastapi import Form
import csv
import io
from fastapi.responses import StreamingResponse
from typing import List, Optional



models.Base.metadata.create_all(bind=engine)
app = FastAPI(title="Research Repository")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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
    token_data = verify_token(token)
    if token_data is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = crud.get_user_by_email(db, email=token_data.email)
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user

# Auth endpoints
@app.post("/api/auth/login")
def login(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud.authenticate_user(db, user_data.email, user_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value}
    )
    
    user_response = schemas.UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        institution=user.institution,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@app.get("/api/auth/me")
def get_current_user_info(current_user: models.User = Depends(get_current_user)):
    return schemas.UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        institution=current_user.institution,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )

# User management endpoints (Superadmin only)
@app.post("/api/users")
def create_user_account(
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role != models.UserRole.SUPERADMIN:
        raise HTTPException(status_code=403, detail="Only superadmin can create accounts")
    
    new_user = crud.create_user_account(db, user_data, current_user.id)
    if not new_user:
        raise HTTPException(status_code=400, detail="User already exists or creation failed")
    
    return {"message": "User created successfully", "user_id": new_user.id}

@app.get("/api/users")
def get_all_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    users = crud.get_all_users(db, current_user)
    return users

# Upload endpoint - only for SUPERADMIN and INSTITUTE
@app.post("/api/upload")
async def upload_document(
    medical_system: str = Form(...),
    research_category: str = Form(...),
    project_title: Optional[str] = Form(None),
    start_year: Optional[int] = Form(None),
    end_year: Optional[int] = Form(None),
    institution: Optional[str] = Form(None),
    investigator_name: Optional[str] = Form(None),
    sanction_date: Optional[str] = Form(None),
    project_status: str = Form("ONGOING"),
    article_title: Optional[str] = Form(None),
    publication_year: Optional[int] = Form(None),
    authors: Optional[str] = Form(None),
    journal_name: Optional[str] = Form(None),
    objectives: Optional[str] = Form(None),
    study_protocol: Optional[str] = Form(None),
    outcomes: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Check if user has permission to upload
    if current_user.role not in [models.UserRole.SUPERADMIN, models.UserRole.INSTITUTE]:
        raise HTTPException(status_code=403, detail="Only superadmin and institute users can upload documents")
    
    # Save file
    file_location = os.path.join(STORAGE_PATH, file.filename)
    with open(file_location, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Extract text from PDF
    text_content = utils.pdf_to_text(file_location)
    
    # Extract metadata
    extracted_metadata = utils.extract_metadata_from_text(text_content)
    
    # Use institution from user if not provided
    if not institution and current_user.institution:
        institution = current_user.institution
    
    # Create document with all metadata
    doc_data = schemas.DocumentCreate(
        filename=file.filename,
        content=text_content,
        extracted_data=extracted_metadata,
        medical_system=medical_system,
        research_category=research_category,
        project_title=project_title,
        start_year=start_year,
        end_year=end_year,
        institution=institution,
        investigator_name=investigator_name,
        sanction_date=sanction_date,
        project_status=project_status,
        article_title=article_title or extracted_metadata.get('title'),
        publication_year=publication_year or extracted_metadata.get('year'),
        authors=authors or extracted_metadata.get('authors'),
        journal_name=journal_name or extracted_metadata.get('journal'),
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

# Search endpoint - PUBLIC ACCESS (No authentication required)
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
    """Get available options for filters - PUBLIC ACCESS"""
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

@app.get("/api/download/{document_id}")
async def download_document(
    document_id: int, 
    db: Session = Depends(get_db)
):
    """Download document - PUBLIC ACCESS"""
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
def rebuild_faiss_index(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Rebuild FAISS index from all documents in database"""
    if current_user.role != models.UserRole.SUPERADMIN:
        raise HTTPException(status_code=403, detail="Only superadmin can rebuild index")
    
    try:
        utils.rebuild_faiss_from_database()
        return {"message": "FAISS index rebuilt successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error rebuilding index: {str(e)}")

# Debug endpoints - superadmin only
@app.get("/api/debug/faiss-status")
def debug_faiss_status(
    current_user: models.User = Depends(get_current_user)
):
    """Debug endpoint to check FAISS index status"""
    if current_user.role != models.UserRole.SUPERADMIN:
        raise HTTPException(status_code=403, detail="Only superadmin can access debug endpoints")
    
    total_vectors = utils.faiss_index.ntotal
    return {
        "total_vectors": total_vectors,
        "index_file_exists": os.path.exists(utils.FAISS_INDEX_PATH),
        "index_path": utils.FAISS_INDEX_PATH
    }

@app.get("/api/debug/documents")
def debug_documents(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Debug endpoint to list all documents"""
    if current_user.role != models.UserRole.SUPERADMIN:
        raise HTTPException(status_code=403, detail="Only superadmin can access debug endpoints")
    
    documents = db.query(models.Document).all()
    return [{
        "id": doc.id,
        "filename": doc.filename,
        "title": doc.article_title or doc.project_title,
        "content_length": len(doc.content) if doc.content else 0,
        "medical_system": doc.medical_system.value if doc.medical_system else None,
        "research_category": doc.research_category.value if doc.research_category else None
    } for doc in documents]

# Create initial superadmin (run once)
@app.post("/api/create-initial-superadmin")
def create_initial_superadmin(
    email: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(...),
    db: Session = Depends(get_db)
):
    # Check if superadmin already exists
    existing_superadmin = db.query(models.User).filter(models.User.role == models.UserRole.SUPERADMIN).first()
    if existing_superadmin:
        raise HTTPException(status_code=400, detail="Superadmin already exists")
    
    hashed_password = get_password_hash(password)
    superadmin = models.User(
        email=email,
        hashed_password=hashed_password,
        full_name=full_name,
        role=models.UserRole.SUPERADMIN,
        is_active=True
    )
    db.add(superadmin)
    db.commit()
    db.refresh(superadmin)
    
    return {"message": "Initial superadmin created successfully"}

@app.post("/api/upload/bulk")
async def upload_documents_bulk(
    csv_file: UploadFile = File(...),
    pdf_files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Bulk upload documents using CSV for metadata and multiple PDF files
    """
    # Check permissions
    if current_user.role not in [models.UserRole.SUPERADMIN, models.UserRole.INSTITUTE]:
        raise HTTPException(status_code=403, detail="Only superadmin and institute users can upload documents")
    
    if not csv_file.filename.lower().endswith('.csv'):
        raise HTTPException(status_code=400, detail="CSV file required")
    
    results = []
    errors = []
    
    try:
        # Read CSV content
        csv_content = await csv_file.read()
        csv_text = csv_content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_text))
        
        # Create mapping of filename to PDF file
        pdf_map = {pdf.filename: pdf for pdf in pdf_files}
        
        # Process each row in CSV
        for row_num, row in enumerate(csv_reader, start=2):  # row_num starts at 2 (header is row 1)
            try:
                filename = row.get('filename', '').strip()
                if not filename:
                    errors.append(f"Row {row_num}: Missing filename")
                    continue
                
                # Check if PDF exists for this row
                if filename not in pdf_map:
                    errors.append(f"Row {row_num}: PDF file '{filename}' not found in uploaded files")
                    continue
                
                pdf_file = pdf_map[filename]
                
                # Validate required fields
                medical_system = row.get('medical_system', '').strip()
                research_category = row.get('research_category', '').strip()
                
                if not medical_system:
                    errors.append(f"Row {row_num}: Missing medical_system")
                    continue
                if not research_category:
                    errors.append(f"Row {row_num}: Missing research_category")
                    continue
                
                # Validate enum values
                try:
                    medical_system_enum = models.MedicalSystem(medical_system)
                    research_category_enum = models.ResearchCategory(research_category)
                except ValueError as e:
                    errors.append(f"Row {row_num}: Invalid enum value - {e}")
                    continue
                
                # Save PDF file
                file_location = os.path.join(STORAGE_PATH, filename)
                with open(file_location, "wb") as f:
                    shutil.copyfileobj(pdf_file.file, f)
                
                # Extract text from PDF
                text_content = utils.pdf_to_text(file_location)
                
                if not text_content.strip():
                    errors.append(f"Row {row_num}: Could not extract text from {filename}")
                    os.remove(file_location)
                    continue
                
                # Parse optional fields
                def parse_optional_int(value):
                    return int(value) if value and value.strip() else None
                
                def parse_optional_date(value):
                    return value if value and value.strip() else None
                
                # Create document data
                doc_data = schemas.DocumentCreate(
                    filename=filename,
                    content=text_content,
                    extracted_data={},  # Empty since we're using CSV metadata
                    medical_system=medical_system_enum,
                    research_category=research_category_enum,
                    project_title=row.get('project_title', '').strip() or None,
                    start_year=parse_optional_int(row.get('start_year')),
                    end_year=parse_optional_int(row.get('end_year')),
                    institution=row.get('institution', '').strip() or None,
                    investigator_name=row.get('investigator_name', '').strip() or None,
                    sanction_date=parse_optional_date(row.get('sanction_date')),
                    project_status=row.get('project_status', 'ONGOING').strip(),
                    article_title=row.get('article_title', '').strip() or None,
                    publication_year=parse_optional_int(row.get('publication_year')),
                    authors=row.get('authors', '').strip() or None,
                    journal_name=row.get('journal_name', '').strip() or None,
                    objectives=row.get('objectives', '').strip() or None,
                    study_protocol=row.get('study_protocol', '').strip() or None,
                    outcomes=row.get('outcomes', '').strip() or None
                )
                
                # Create document in database
                db_doc = crud.create_document(db, doc_data)
                
                # Add to FAISS for semantic search
                utils.add_to_faiss([text_content], [db_doc.id])
                
                # Store embedding in database
                utils.add_document_embedding(db, db_doc.id, text_content)
                
                results.append({
                    "filename": filename,
                    "doc_id": db_doc.id,
                    "status": "success"
                })
                
            except Exception as e:
                errors.append(f"Row {row_num}: Error processing {filename} - {str(e)}")
                continue
        
        return {
            "message": f"Bulk upload completed. {len(results)} successful, {len(errors)} errors.",
            "successful_uploads": results,
            "errors": errors
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing bulk upload: {str(e)}")

@app.get("/api/upload/bulk-template")
async def download_bulk_upload_template():
    """
    Download CSV template for bulk upload
    """
    template_content = """filename,medical_system,research_category,project_title,start_year,end_year,institution,investigator_name,sanction_date,project_status,article_title,publication_year,authors,journal_name,objectives,study_protocol,outcomes
example1.pdf,AYURVEDA,CLINICAL_GRADE_A,Research Project 1,2020,2023,CCRAS,Dr. John Doe,2020-01-15,ONGOING,Study on Ayurvedic Medicine,2023,John Doe et al,Journal of Ayurveda,Study objectives,Study protocol,Research outcomes
example2.pdf,UNANI,CLINICAL_GRADE_B,Research Project 2,2021,2024,CCRAS,Dr. Jane Smith,2021-03-20,COMPLETED,Unani Medicine Research,2024,Jane Smith et al,Unani Journal,Objectives here,Protocol details,Findings summary

# Required fields: filename, medical_system, research_category
# Medical System options: UNANI, AYURVEDA, YOGA, SIDDHA
# Research Category options: CLINICAL_GRADE_A, CLINICAL_GRADE_B, CLINICAL_GRADE_C, PRE_CLINICAL, FUNDAMENTAL, DRUG
# Project Status options: ONGOING, COMPLETED, TERMINATED
# Date format: YYYY-MM-DD
"""
    
    return Response(
        content=template_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=bulk_upload_template.csv"}
    )


@app.get("/api/export/documents")
async def export_documents(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Export all documents metadata to CSV
    """
    print("🔍 [EXPORT] Starting export process...")
    
    # Check permissions - only SUPERADMIN and INSTITUTE can export
    if current_user.role not in [models.UserRole.SUPERADMIN, models.UserRole.INSTITUTE]:
        print("❌ [EXPORT] Permission denied for user:", current_user.email)
        raise HTTPException(status_code=403, detail="Only superadmin and institute users can export documents")
    
    try:
        # Get all documents
        documents = db.query(models.Document).all()
        print(f"📊 [EXPORT] Found {len(documents)} documents")
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'filename', 'medical_system', 'research_category', 'project_title',
            'start_year', 'end_year', 'institution', 'investigator_name',
            'sanction_date', 'project_status', 'article_title', 'publication_year',
            'authors', 'journal_name', 'objectives', 'study_protocol', 'outcomes',
            'created_at', 'document_id'
        ])
        
        # Write data
        for doc in documents:
            print(f"📝 [EXPORT] Processing document: {doc.filename}")
            writer.writerow([
                doc.filename,
                doc.medical_system.value if doc.medical_system else '',
                doc.research_category.value if doc.research_category else '',
                doc.project_title or '',
                doc.start_year or '',
                doc.end_year or '',
                doc.institution or '',
                doc.investigator_name or '',
                doc.sanction_date.isoformat() if doc.sanction_date else '',
                doc.project_status.value if doc.project_status else '',
                doc.article_title or '',
                doc.publication_year or '',
                doc.authors or '',
                doc.journal_name or '',
                doc.objectives or '',
                doc.study_protocol or '',
                doc.outcomes or '',
                doc.created_at.isoformat() if doc.created_at else '',
                doc.id
            ])
        
        # Create response
        output.seek(0)
        csv_content = output.getvalue()
        print(f"✅ [EXPORT] CSV content generated, length: {len(csv_content)}")
        
        return StreamingResponse(
            io.BytesIO(csv_content.encode('utf-8')),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=documents_export.csv",
                "Content-Type": "text/csv; charset=utf-8"
            }
        )
        
    except Exception as e:
        print(f"❌ [EXPORT] Error exporting documents: {str(e)}")
        print(f"❌ [EXPORT] Error type: {type(e)}")
        import traceback
        print(f"❌ [EXPORT] Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error exporting documents: {str(e)}")
    
@app.get("/api/export/documents/filtered")
async def export_filtered_documents(
    medical_system: Optional[str] = None,
    research_category: Optional[str] = None,
    institution: Optional[str] = None,
    author: Optional[str] = None,
    journal: Optional[str] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    project_status: Optional[str] = None,
    investigator: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Export filtered documents metadata to CSV
    """
    # Check permissions
    if current_user.role not in [models.UserRole.SUPERADMIN, models.UserRole.INSTITUTE]:
        raise HTTPException(status_code=403, detail="Only superadmin and institute users can export documents")
    
    try:
        # Use the same filtering logic as search
        query = db.query(models.Document)
        
        if medical_system:
            query = query.filter(models.Document.medical_system == medical_system)
        if research_category:
            query = query.filter(models.Document.research_category == research_category)
        if institution:
            query = query.filter(models.Document.institution.ilike(f"%{institution}%"))
        if author:
            query = query.filter(models.Document.authors.ilike(f"%{author}%"))
        if journal:
            query = query.filter(models.Document.journal_name.ilike(f"%{journal}%"))
        if year_from:
            query = query.filter(models.Document.publication_year >= year_from)
        if year_to:
            query = query.filter(models.Document.publication_year <= year_to)
        if project_status:
            query = query.filter(models.Document.project_status == project_status)
        if investigator:
            query = query.filter(models.Document.investigator_name.ilike(f"%{investigator}%"))
        
        documents = query.all()
        
        # Create CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'filename', 'medical_system', 'research_category', 'project_title',
            'start_year', 'end_year', 'institution', 'investigator_name',
            'sanction_date', 'project_status', 'article_title', 'publication_year',
            'authors', 'journal_name', 'objectives', 'study_protocol', 'outcomes',
            'created_at', 'document_id'
        ])
        
        # Write data
        for doc in documents:
            writer.writerow([
                doc.filename,
                doc.medical_system.value if doc.medical_system else '',
                doc.research_category.value if doc.research_category else '',
                doc.project_title or '',
                doc.start_year or '',
                doc.end_year or '',
                doc.institution or '',
                doc.investigator_name or '',
                doc.sanction_date.isoformat() if doc.sanction_date else '',
                doc.project_status.value if doc.project_status else '',
                doc.article_title or '',
                doc.publication_year or '',
                doc.authors or '',
                doc.journal_name or '',
                doc.objectives or '',
                doc.study_protocol or '',
                doc.outcomes or '',
                doc.created_at.isoformat() if doc.created_at else '',
                doc.id
            ])
        
        # Create response
        output.seek(0)
        
        # Generate filename with filters
        filename = "documents_export"
        filters = []
        if medical_system:
            filters.append(f"medical_system_{medical_system}")
        if research_category:
            filters.append(f"research_category_{research_category}")
        if institution:
            filters.append(f"institution_{institution}")
        if filters:
            filename += "_" + "_".join(filters)
        filename += ".csv"
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8')),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Type": "text/csv; charset=utf-8"
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting documents: {str(e)}")
    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)