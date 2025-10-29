import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:admin123@localhost:5432/research_db")
STORAGE_PATH = os.getenv("STORAGE_PATH", "./storage/pdfs")
FAISS_INDEX_PATH = os.path.join(BASE_DIR, "embeddings", "faiss_index.bin")  # Changed from .pkl to .bin
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4")
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 500))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 50))
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
OPENAI_API_KEY="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"

# Medical Systems (enum values)
MEDICAL_SYSTEMS = ["UNANI", "AYURVEDA", "YOGA", "SIDDHA"]

# Research Categories (enum values)
RESEARCH_CATEGORIES = [
    "CLINICAL_GRADE_A",
    "CLINICAL_GRADE_B", 
    "CLINICAL_GRADE_C",
    "PRE_CLINICAL",
    "FUNDAMENTAL",
    "DRUG"
]

# Project Status (enum values)
PROJECT_STATUS = ["ONGOING", "COMPLETED", "TERMINATED"]