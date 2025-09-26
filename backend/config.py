import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:admin123@localhost:5432/researchrepo")
STORAGE_PATH = os.getenv("STORAGE_PATH", "./storage/pdfs")
FAISS_INDEX_PATH = os.getenv("FAISS_INDEX_PATH", "./embeddings/faiss_index.pkl")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-large")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "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")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 1000))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 100))
EMBEDDING_DIMENSION = int(os.getenv("EMBEDDING_DIMENSION", 3072))
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-super-secret-jwt-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30