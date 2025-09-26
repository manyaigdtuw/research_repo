from sqlalchemy.orm import Session
import models, schemas
from typing import List
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Authentication CRUD
def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = pwd_context.hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        is_admin=True  # First user is admin
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# Project CRUD
def create_project(db: Session, project: schemas.ProjectCreate, user_id: int) -> models.Project:
    db_project = models.Project(**project.dict(), created_by=user_id)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def get_projects(db: Session, skip: int = 0, limit: int = 100) -> List[models.Project]:
    return db.query(models.Project).offset(skip).limit(limit).all()

def get_project_by_id(db: Session, project_id: int) -> models.Project:
    return db.query(models.Project).filter(models.Project.id == project_id).first()

def get_project_by_name(db: Session, name: str) -> models.Project:
    return db.query(models.Project).filter(models.Project.name == name).first()

# Research Paper CRUD
def create_research_paper(db: Session, paper: schemas.ResearchPaperCreate, user_id: int) -> models.ResearchPaper:
    db_paper = models.ResearchPaper(**paper.dict(), uploaded_by=user_id)
    db.add(db_paper)
    db.commit()
    db.refresh(db_paper)
    return db_paper

def get_research_paper(db: Session, paper_id: int) -> models.ResearchPaper:
    return db.query(models.ResearchPaper).filter(models.ResearchPaper.id == paper_id).first()

def get_research_papers_by_project(db: Session, project_id: int) -> List[models.ResearchPaper]:
    return db.query(models.ResearchPaper).filter(models.ResearchPaper.project_id == project_id).all()

def get_all_research_papers(db: Session) -> List[models.ResearchPaper]:
    return db.query(models.ResearchPaper).all()

def delete_research_paper(db: Session, paper_id: int) -> bool:
    paper = db.query(models.ResearchPaper).filter(models.ResearchPaper.id == paper_id).first()
    if paper:
        db.delete(paper)
        db.commit()
        return True
    return False