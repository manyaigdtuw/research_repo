from sqlalchemy import (
    Column, Integer, String, Text, ForeignKey, DateTime, Date, Enum, JSON, Boolean,
    Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base  # Import Base from database
from datetime import datetime
import enum
from pgvector.sqlalchemy import Vector


# ---------------- ENUMS ----------------
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


class UserRole(enum.Enum):
    SUPERADMIN = "SUPERADMIN"
    INSTITUTE = "INSTITUTE"


class RequestStatus(enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


# ---------------- MODELS ----------------

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    institution = Column(String)
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Self-reference (creator) - only SUPERADMIN can create users
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    creator = relationship("User", remote_side=[id])

    # Relationships
    documents = relationship("Document", back_populates="uploaded_by", cascade="all, delete-orphan")
    create_requests_approved = relationship("UserCreateRequest", back_populates="approver")
    users_created = relationship("User", back_populates="creator", remote_side=[created_by])


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    content = Column(Text)
    embedding = Column(Vector(384))
    extracted_data = Column(JSON)

    # Foreign key to User (who uploaded) - only SUPERADMIN and INSTITUTE can upload
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    uploaded_by = relationship("User", back_populates="documents")

    # Medical and Research details
    medical_system = Column(Enum(MedicalSystem), nullable=False)
    research_category = Column(Enum(ResearchCategory), nullable=False)

    # Project details
    project_title = Column(String)
    start_year = Column(Integer)
    end_year = Column(Integer)
    institution = Column(String)
    investigator_name = Column(String)
    sanction_date = Column(Date)
    project_status = Column(Enum(ProjectStatus), default=ProjectStatus.ONGOING)

    # Research details
    objectives = Column(Text)
    study_protocol = Column(Text)
    outcomes = Column(Text)

    # Publication details
    article_title = Column(String)
    publication_year = Column(Integer)
    authors = Column(Text)
    journal_name = Column(String)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Index for better search performance
    __table_args__ = (
        Index('ix_documents_medical_system', 'medical_system'),
        Index('ix_documents_research_category', 'research_category'),
        Index('ix_documents_institution', 'institution'),
        Index('ix_documents_publication_year', 'publication_year'),
        Index('ix_documents_project_status', 'project_status'),
    )


class UserCreateRequest(Base):
    __tablename__ = "user_create_requests"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    institution = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.INSTITUTE)
    status = Column(Enum(RequestStatus), default=RequestStatus.PENDING)
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationship to approver (SUPERADMIN)
    approver = relationship("User", back_populates="create_requests_approved")

    # Index for better query performance
    __table_args__ = (
        Index('ix_user_create_requests_status', 'status'),
        Index('ix_user_create_requests_requested_at', 'requested_at'),
    )