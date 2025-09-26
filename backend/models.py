from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, ARRAY, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(Text)
    investigatory_team = Column(JSON, nullable=False)
    status = Column(String)  # ongoing, completed
    date_initialized = Column(DateTime)
    date_completed = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ResearchPaper(Base):
    __tablename__ = "research_papers"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    title = Column(String)
    authors = Column(JSON)
    abstract = Column(Text)
    journal = Column(String)
    publication_date = Column(DateTime, nullable=True)
    keywords = Column(ARRAY(String))
    category = Column(String)  # clinical, research_fundamental, etc.
    content = Column(Text)  # Full text content
    chunks = Column(JSON)  # Store text chunks
    embeddings = Column(JSON)  # Store embeddings
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)