import os
import fitz
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from database import SessionLocal
import models
from contextlib import contextmanager
import re
from datetime import datetime
from config import STORAGE_PATH, FAISS_INDEX_PATH, EMBEDDING_MODEL, CHUNK_SIZE, CHUNK_OVERLAP

# Ensure storage directory exists
os.makedirs(STORAGE_PATH, exist_ok=True)
os.makedirs(os.path.dirname(FAISS_INDEX_PATH), exist_ok=True)

# Load embedding model
embed_model = SentenceTransformer(EMBEDDING_MODEL)
dim = embed_model.get_sentence_embedding_dimension()

print(f"[UTILS] Embedding model loaded: {EMBEDDING_MODEL}")
print(f"[UTILS] Embedding dimension: {dim}")
print(f"[UTILS] FAISS index path: {FAISS_INDEX_PATH}")

# ✅ Initialize FAISS index (cosine similarity using inner product)
if os.path.exists(FAISS_INDEX_PATH):
    try:
        faiss_index = faiss.read_index(FAISS_INDEX_PATH)
        print(f"[FAISS] ✅ Loaded existing index with {faiss_index.ntotal} vectors from {FAISS_INDEX_PATH}")
    except Exception as e:
        print(f"[FAISS] ❌ Corrupted index file, reinitializing. Error: {e}")
        faiss_index = faiss.IndexIDMap(faiss.IndexFlatIP(dim))
else:
    faiss_index = faiss.IndexIDMap(faiss.IndexFlatIP(dim))
    print("[FAISS] 🔧 Created new empty index.")

@contextmanager
def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def pdf_to_text(pdf_path: str) -> str:
    """Extract text from a PDF using PyMuPDF (fitz)."""
    text = ""
    doc = fitz.open(pdf_path)
    for page in doc:
        text += page.get_text() + "\n"
    doc.close()
    return text

def extract_metadata_from_text(text: str) -> dict:
    """Heuristically extract metadata from PDF text."""
    metadata = {}
    lines = text.split('\n')

    # Extract a plausible title
    for line in lines:
        line = line.strip()
        if 20 < len(line) < 200 and not line.startswith(('Abstract', 'Keywords')) and not line.isupper():
            metadata['title'] = line
            break

    # Extract authors
    for line in lines:
        if 'et al' in line.lower() or ',' in line:
            metadata['authors'] = line
            break

    # Extract journal or publication info
    for line in lines:
        if any(k in line.lower() for k in ['journal', 'conference', 'vol.', 'pp.']):
            metadata['journal'] = line
            break

    # Extract year
    years = re.findall(r'\b(19|20)\d{2}\b', text)
    if years:
        metadata['year'] = int(max(years))

    return metadata

def chunk_text(text: str, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    """Chunk large text for embedding."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + size
        chunks.append(text[start:end])
        start += size - overlap
    return chunks

def add_to_faiss(texts, doc_ids):
    """Add a list of text chunks to FAISS index."""
    if not texts:
        print("[FAISS] ⚠️ No texts provided to add to FAISS")
        return

    print(f"[FAISS] 📥 Adding {len(texts)} text chunks to FAISS index")
    print(f"[FAISS] Document IDs: {doc_ids}")
    
    try:
        # Encode the texts
        embeddings = embed_model.encode(texts, normalize_embeddings=True)
        print(f"[FAISS] ✅ Generated embeddings with shape: {embeddings.shape}")
        
        # Convert IDs to numpy array
        ids = np.array(doc_ids).astype("int64")
        print(f"[FAISS] IDs array: {ids}")
        
        # Add to index
        faiss_index.add_with_ids(embeddings.astype("float32"), ids)
        
        # Save the index
        faiss.write_index(faiss_index, FAISS_INDEX_PATH)
        print(f"[FAISS] 💾 Saved index to {FAISS_INDEX_PATH}")
        print(f"[FAISS] ✅ Added {len(ids)} vectors. Total now: {faiss_index.ntotal}")
        
    except Exception as e:
        print(f"[FAISS] ❌ Error adding to FAISS: {e}")
        raise

def semantic_search(query, top_k=10):
    """Perform semantic search via FAISS."""
    print(f"[FAISS] 🔍 Starting semantic search for: '{query}'")
    print(f"[FAISS] Total vectors in index: {faiss_index.ntotal}")
    
    if faiss_index.ntotal == 0:
        print("[FAISS] ⚠️ Warning: index empty. No documents have been indexed.")
        return []

    try:
        query_vec = embed_model.encode([query], normalize_embeddings=True)
        print(f"[FAISS] Query vector shape: {query_vec.shape}")
        
        distances, indices = faiss_index.search(query_vec.astype("float32"), top_k)
        print(f"[FAISS] Raw search results - distances: {distances}, indices: {indices}")
        
        valid_indices = [int(idx) for idx in indices[0] if idx != -1]
        print(f"[FAISS] ✅ Search returned {len(valid_indices)} valid results: {valid_indices}")
        return valid_indices
        
    except Exception as e:
        print(f"[FAISS] ❌ Search error: {e}")
        return []

def get_doc_text_by_id(doc_id):
    """Retrieve document content from the database."""
    with get_db_session() as db:
        doc = db.query(models.Document).filter(models.Document.id == int(doc_id)).first()
        return doc.content if doc else None

def add_document_embedding(db, document_id: int, text: str):
    """Compute and store document embedding in DB."""
    try:
        embedding = embed_model.encode([text], normalize_embeddings=True)[0]
        doc = db.query(models.Document).filter(models.Document.id == document_id).first()
        if doc:
            doc.embedding = embedding.tolist()
            db.commit()
            print(f"[DB] ✅ Updated embedding for document ID {document_id}.")
        else:
            print(f"[DB] ❌ Document {document_id} not found for embedding storage")
    except Exception as e:
        print(f"[DB] ❌ Error storing embedding: {e}")

def rebuild_faiss_from_database():
    """Rebuild FAISS index from all documents in database."""
    print("[FAISS] 🔄 Rebuilding FAISS index from database...")
    
    with get_db_session() as db:
        documents = db.query(models.Document).all()
        print(f"[FAISS] Found {len(documents)} documents in database")
        
        texts = []
        doc_ids = []
        
        for doc in documents:
            if doc.content:
                texts.append(doc.content)
                doc_ids.append(doc.id)
                print(f"[FAISS] Adding document {doc.id}: {doc.filename}")
        
        if texts:
            # Clear existing index
            global faiss_index
            faiss_index = faiss.IndexIDMap(faiss.IndexFlatIP(dim))
            
            # Add all documents
            add_to_faiss(texts, doc_ids)
            print(f"[FAISS] ✅ Rebuilt index with {len(texts)} documents")
        else:
            print("[FAISS] ⚠️ No documents with content found in database")