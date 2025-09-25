from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class ResearchPaper(Base):
    __tablename__ = "research_papers"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    title = Column(String, index=True)
    authors = Column(JSON)  # Store as list of authors
    abstract = Column(Text)
    publication_date = Column(DateTime)
    journal = Column(String)
    keywords = Column(JSON)  # Store as list of keywords
    content = Column(Text)  # Full text content
    embeddings = Column(JSON)  # Store chunk embeddings
    chunks = Column(JSON)  # Store text chunks
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)