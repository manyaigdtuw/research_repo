from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import date
from enum import Enum

class MedicalSystem(str, Enum):
    UNANI = "UNANI"
    AYURVEDA = "AYURVEDA"
    YOGA = "YOGA"
    SIDDHA = "SIDDHA"

class ResearchCategory(str, Enum):
    CLINICAL_GRADE_A = "CLINICAL_GRADE_A"
    CLINICAL_GRADE_B = "CLINICAL_GRADE_B"
    CLINICAL_GRADE_C = "CLINICAL_GRADE_C"
    PRE_CLINICAL = "PRE_CLINICAL"
    FUNDAMENTAL = "FUNDAMENTAL"
    DRUG = "DRUG"

class ProjectStatus(str, Enum):
    ONGOING = "ONGOING"
    COMPLETED = "COMPLETED"
    TERMINATED = "TERMINATED"


class DocumentBase(BaseModel):
    filename: str
    content: str
    extracted_data: Optional[Dict[str, Any]] = None
    
    # Medical System and Research Category
    medical_system: MedicalSystem
    research_category: ResearchCategory
    
    # Project Details
    project_title: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    institution: Optional[str] = None
    investigator_name: Optional[str] = None
    sanction_date: Optional[date] = None
    project_status: ProjectStatus = ProjectStatus.ONGOING
    
    # Research Details
    objectives: Optional[str] = None
    study_protocol: Optional[str] = None
    outcomes: Optional[str] = None
    
    # Publication Details
    article_title: Optional[str] = None
    publication_year: Optional[int] = None
    authors: Optional[str] = None
    journal_name: Optional[str] = None

class DocumentCreate(DocumentBase):
    pass

class Document(DocumentBase):
    id: int
    created_at: date
    class Config:
        from_attributes = True

class DocumentUploadForm(BaseModel):
    medical_system: MedicalSystem
    research_category: ResearchCategory
    
    # Project Details
    project_title: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    institution: Optional[str] = None
    investigator_name: Optional[str] = None
    sanction_date: Optional[date] = None
    project_status: ProjectStatus = ProjectStatus.ONGOING
    
    # Publication Details
    article_title: Optional[str] = None
    publication_year: Optional[int] = None
    authors: Optional[str] = None
    journal_name: Optional[str] = None
    
    # Research Details
    objectives: Optional[str] = None
    study_protocol: Optional[str] = None
    outcomes: Optional[str] = None

class SearchFilters(BaseModel):
    medical_system: Optional[MedicalSystem] = None
    research_category: Optional[ResearchCategory] = None
    institution: Optional[str] = None
    author: Optional[str] = None
    journal: Optional[str] = None
    year_from: Optional[int] = None
    year_to: Optional[int] = None
    project_status: Optional[ProjectStatus] = None
    investigator: Optional[str] = None