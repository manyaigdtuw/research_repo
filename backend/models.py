from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Date, Enum, JSON
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum
from pgvector.sqlalchemy import Vector

class MedicalSystem(enum.Enum):
    UNANI = "UNANI"
    AYURVEDA = "AYURVEDA"
    YOGA = "YOGA"
    SIDDHA = "SIDDHA"

class ResearchCategory(enum.Enum):
    CLINICAL_GRADE_A = "CLINICAL_GRADE_A"
    CLINICAL_GRADE_B = "CLINICAL_GRADE_B"
    CLINICAL_GRADE_C = "CLINICAL_GRADE_C"
    PRE_CLINICAL = "PRE_CLINICAL"
    FUNDAMENTAL = "FUNDAMENTAL"
    DRUG = "DRUG"

class ProjectStatus(enum.Enum):
    ONGOING = "ONGOING"
    COMPLETED = "COMPLETED"
    TERMINATED = "TERMINATED"

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    content = Column(Text)  # Store content for search and snippets
    embedding = Column(Vector(384))  # Vector embedding column
    extracted_data = Column(JSON)
    
    # Medical System and Research Category
    medical_system = Column(Enum(MedicalSystem), nullable=False)
    research_category = Column(Enum(ResearchCategory), nullable=False)
    
    # Project Details
    project_title = Column(String)
    start_year = Column(Integer)
    end_year = Column(Integer)
    institution = Column(String)
    investigator_name = Column(String)
    sanction_date = Column(Date)
    project_status = Column(Enum(ProjectStatus), default=ProjectStatus.ONGOING)
    
    # Research Details
    objectives = Column(Text)
    study_protocol = Column(Text)
    outcomes = Column(Text)
    
    # Publication Details
    article_title = Column(String)
    publication_year = Column(Integer)
    authors = Column(Text)
    journal_name = Column(String)
    
    created_at = Column(DateTime, default=datetime.utcnow)