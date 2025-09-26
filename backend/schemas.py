from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# Authentication Schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class User(UserBase):
    id: int
    is_admin: bool
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Project Schemas
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    investigatory_team: List[str] = []
    status: str  # ongoing, completed
    date_initialized: datetime

class ProjectCreate(ProjectBase):
    date_completed: Optional[datetime] = None

class Project(ProjectBase):
    id: int
    date_completed: Optional[datetime] = None
    created_by: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Research Paper Schemas
class ResearchPaperBase(BaseModel):
    title: str
    authors: List[str] = []
    abstract: Optional[str] = None
    journal: Optional[str] = None
    publication_date: Optional[datetime] = None
    keywords: List[str] = []
    category: Optional[str] = None
    project_id: Optional[int] = None

class ResearchPaperCreate(ResearchPaperBase):
    filename: str
    content: str

class ResearchPaper(ResearchPaperBase):
    id: int
    filename: str
    content: str
    chunks: Optional[List[str]] = None
    embeddings: Optional[List[List[float]]] = None
    uploaded_by: int
    uploaded_at: datetime
    
    class Config:
        from_attributes = True

# Search Schemas
class SearchResult(BaseModel):
    id: int
    title: str
    authors: List[str]
    abstract: str
    journal: Optional[str]
    publication_date: Optional[datetime]
    category: Optional[str]
    snippet: str
    similarity_score: float
    filename: str
    project_name: Optional[str] = None
    project_status: Optional[str] = None 

class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    total_count: int
    search_time: float