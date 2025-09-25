from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class ResearchPaperBase(BaseModel):
    filename: str
    title: Optional[str] = None
    authors: Optional[List[str]] = None
    abstract: Optional[str] = None
    publication_date: Optional[datetime] = None
    journal: Optional[str] = None
    keywords: Optional[List[str]] = None
    content: str

class ResearchPaperCreate(ResearchPaperBase):
    pass

class ResearchPaper(ResearchPaperBase):
    id: int
    chunks: Optional[List[str]] = None
    embeddings: Optional[List[List[float]]] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class SearchResult(BaseModel):
    id: int
    title: str
    authors: List[str]
    abstract: str
    journal: Optional[str]
    publication_date: Optional[datetime]
    snippet: str
    similarity_score: float
    filename: str

class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    total_count: int
    search_time: float