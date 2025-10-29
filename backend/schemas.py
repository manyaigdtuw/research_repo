from pydantic import BaseModel, EmailStr, validator
from typing import Optional, Dict, Any, List
from datetime import date, datetime
from enum import Enum


# ---------------- ENUMS ----------------
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


class UserRole(str, Enum):
    SUPERADMIN = "SUPERADMIN"
    INSTITUTE = "INSTITUTE"


class RequestStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


# ---------------- DOCUMENT SCHEMAS ----------------
class DocumentBase(BaseModel):
    filename: str
    content: str
    extracted_data: Optional[Dict[str, Any]] = None

    medical_system: MedicalSystem
    research_category: ResearchCategory

    project_title: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    institution: Optional[str] = None
    investigator_name: Optional[str] = None
    sanction_date: Optional[date] = None
    project_status: ProjectStatus = ProjectStatus.ONGOING

    objectives: Optional[str] = None
    study_protocol: Optional[str] = None
    outcomes: Optional[str] = None

    article_title: Optional[str] = None
    publication_year: Optional[int] = None
    authors: Optional[str] = None
    journal_name: Optional[str] = None


class DocumentCreate(DocumentBase):
    uploaded_by_id: Optional[int] = None


class DocumentUpdate(BaseModel):
    medical_system: Optional[MedicalSystem] = None
    research_category: Optional[ResearchCategory] = None
    project_title: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    institution: Optional[str] = None
    investigator_name: Optional[str] = None
    sanction_date: Optional[date] = None
    project_status: Optional[ProjectStatus] = None
    objectives: Optional[str] = None
    study_protocol: Optional[str] = None
    outcomes: Optional[str] = None
    article_title: Optional[str] = None
    publication_year: Optional[int] = None
    authors: Optional[str] = None
    journal_name: Optional[str] = None


class Document(DocumentBase):
    id: int
    created_at: datetime
    uploaded_by_id: Optional[int] = None

    class Config:
        from_attributes = True


# ---------------- FILTER SCHEMAS ----------------
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


# ---------------- USER SCHEMAS ----------------
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    institution: Optional[str] = None
    role: UserRole


class UserCreate(UserBase):
    password: str

    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    institution: Optional[str] = None
    is_active: Optional[bool] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    created_by: Optional[int] = None

    class Config:
        from_attributes = True


# ---------------- USER REQUEST SCHEMAS ----------------
class UserCreateRequestBase(BaseModel):
    email: EmailStr
    full_name: str
    institution: str
    role: UserRole = UserRole.INSTITUTE  # Default to INSTITUTE role


class UserCreateRequestCreate(UserCreateRequestBase):
    pass


class UserCreateRequestUpdate(BaseModel):
    status: RequestStatus
    approved_by: Optional[int] = None


class UserCreateRequest(UserCreateRequestBase):
    id: int
    status: RequestStatus
    requested_at: datetime
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserCreateRequestWithApprover(UserCreateRequest):
    approver: Optional[UserResponse] = None


# ---------------- AUTH SCHEMAS ----------------
class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None