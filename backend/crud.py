from sqlalchemy.orm import Session
import models, schemas
from typing import List, Optional

def create_document(db: Session, doc: schemas.DocumentCreate):
    db_doc = models.Document(**doc.dict())
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc

def get_documents(db: Session):
    return db.query(models.Document).all()

def get_documents_with_filters(
    db: Session,
    medical_system: Optional[str] = None,
    research_category: Optional[str] = None,
    institution: Optional[str] = None,
    author: Optional[str] = None,
    journal: Optional[str] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    project_status: Optional[str] = None,
    investigator: Optional[str] = None
):
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
    
    return query.all()