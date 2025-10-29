from sqlalchemy.sql import func
from sqlalchemy.orm import Session
import models, schemas
from typing import List, Optional
from auth import get_password_hash, verify_password


def create_document(db: Session, doc: schemas.DocumentCreate):
    db_doc = models.Document(**doc.dict())
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc

def get_document_by_id(db: Session, doc_id: int):
    return db.query(models.Document).filter(models.Document.id == doc_id).first()

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

def update_document(db: Session, doc_id: int, doc_update: schemas.DocumentUpdate):
    db_doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not db_doc:
        return None
    
    update_data = doc_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_doc, field, value)
    
    db.commit()
    db.refresh(db_doc)
    return db_doc

def delete_document(db: Session, doc_id: int):
    db_doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not db_doc:
        return False
    
    db.delete(db_doc)
    db.commit()
    return True


# User CRUD operations
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_id(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def create_user(db: Session, user: schemas.UserCreate, created_by: int = None):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        institution=user.institution,
        role=user.role,
        created_by=created_by
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        return None
    
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def get_all_users(db: Session, current_user: models.User):
    if current_user.role != models.UserRole.SUPERADMIN:
        # Institute users can only see themselves
        return [current_user]
    return db.query(models.User).all()

def create_user_account(db: Session, user_data: schemas.UserCreate, creator_id: int):
    # Only SUPERADMIN can create accounts
    creator = db.query(models.User).filter(models.User.id == creator_id).first()
    if creator.role != models.UserRole.SUPERADMIN:
        return None
    
    # Check if user already exists
    if get_user_by_email(db, user_data.email):
        return None
    
    return create_user(db, user_data, creator_id)

def deactivate_user(db: Session, user_id: int, current_user: models.User):
    # Only SUPERADMIN can deactivate users
    if current_user.role != models.UserRole.SUPERADMIN:
        return None
    
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user


# User Create Request CRUD operations
def create_user_request(db: Session, request_data: schemas.UserCreateRequestCreate):
    # Check if request already exists for this email
    existing_request = db.query(models.UserCreateRequest).filter(
        models.UserCreateRequest.email == request_data.email
    ).first()
    
    if existing_request:
        return None
    
    db_request = models.UserCreateRequest(**request_data.dict())
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    return db_request

def get_user_requests(db: Session, status: Optional[str] = None):
    query = db.query(models.UserCreateRequest)
    if status:
        query = query.filter(models.UserCreateRequest.status == status)
    return query.all()

def get_user_request_by_id(db: Session, request_id: int):
    return db.query(models.UserCreateRequest).filter(models.UserCreateRequest.id == request_id).first()

def update_user_request_status(db: Session, request_id: int, status: str, approved_by: int):
    db_request = get_user_request_by_id(db, request_id)
    if not db_request:
        return None
    
    db_request.status = status
    db_request.approved_by = approved_by
    db_request.approved_at = func.now()
    
    db.commit()
    db.refresh(db_request)
    return db_request