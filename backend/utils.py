import os
import fitz  # PyMuPDF
import faiss
import numpy as np
import pickle
import re
import requests
import json
from typing import List, Dict, Any, Optional
from config import STORAGE_PATH, FAISS_INDEX_PATH, EMBEDDING_MODEL, CHUNK_SIZE, CHUNK_OVERLAP, OPENROUTER_API_KEY, OPENROUTER_BASE_URL, EMBEDDING_DIMENSION

# Load or initialize FAISS index
def initialize_faiss_index(dimension: int = EMBEDDING_DIMENSION):
    """Initialize or load FAISS index with proper dimension"""
    if os.path.exists(FAISS_INDEX_PATH):
        try:
            with open(FAISS_INDEX_PATH, "rb") as f:
                index = pickle.load(f)
            # Verify dimension matches
            if index.d == dimension:
                return index
            else:
                print(f"Dimension mismatch: expected {dimension}, got {index.d}. Creating new index.")
        except Exception as e:
            print(f"Error loading FAISS index: {e}. Creating new index.")
    
    # Create new index
    index = faiss.IndexFlatL2(dimension)
    print(f"Created new FAISS index with dimension {dimension}")
    return index

# Initialize FAISS index
faiss_index = initialize_faiss_index()

def pdf_to_text(pdf_path: str) -> str:
    """Extract text from PDF"""
    text = ""
    try:
        doc = fitz.open(pdf_path)
        for page in doc:
            text += page.get_text() + "\n"
        doc.close()
    except Exception as e:
        print(f"Error reading PDF: {e}")
        raise
    return text

def chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """Split text into overlapping chunks"""
    if not text or len(text.strip()) == 0:
        return []
        
    chunks = []
    start = 0
    text_length = len(text)
    
    while start < text_length:
        end = min(start + size, text_length)
        chunk = text[start:end].strip()
        
        if chunk:  # Only add non-empty chunks
            chunks.append(chunk)
            
        start += size - overlap
        
        # Break if we're not making progress
        if start >= text_length or (chunks and start <= chunks[-1].start):
            break
            
    return chunks

def get_embeddings_openrouter(texts: List[str]) -> List[List[float]]:
    """Get embeddings using OpenRouter API"""
    if not OPENROUTER_API_KEY:
        raise ValueError("OpenRouter API key not configured")
    
    if not texts:
        return []
    
    embeddings = []
    
    # Process in batches to avoid rate limits
    batch_size = 10  # Adjust based on API limits
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        
        try:
            response = requests.post(
                f"{OPENROUTER_BASE_URL}/embeddings",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:3000",  # Required by OpenRouter
                    "X-Title": "Research Repository"  # Required by OpenRouter
                },
                json={
                    "model": EMBEDDING_MODEL,
                    "input": batch
                },
                timeout=30  # 30 second timeout
            )
            
            if response.status_code == 200:
                data = response.json()
                batch_embeddings = [item['embedding'] for item in data['data']]
                embeddings.extend(batch_embeddings)
                print(f"Successfully processed batch {i//batch_size + 1}")
            else:
                print(f"OpenRouter API error: {response.status_code} - {response.text}")
                # Fallback: return zero vectors
                fallback_embedding = [0.0] * EMBEDDING_DIMENSION
                embeddings.extend([fallback_embedding] * len(batch))
                
        except requests.exceptions.RequestException as e:
            print(f"Request error: {e}")
            # Fallback: return zero vectors
            fallback_embedding = [0.0] * EMBEDDING_DIMENSION
            embeddings.extend([fallback_embedding] * len(batch))
        except Exception as e:
            print(f"Unexpected error: {e}")
            fallback_embedding = [0.0] * EMBEDDING_DIMENSION
            embeddings.extend([fallback_embedding] * len(batch))
    
    return embeddings

def extract_paper_metadata(text: str) -> Dict[str, Any]:
    """Extract metadata from research paper text"""
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    metadata = {
        'title': '',
        'authors': [],
        'abstract': '',
        'journal': '',
        'publication_date': None,
        'keywords': []
    }
    
    # Extract title (usually one of the first non-empty lines)
    for i, line in enumerate(lines[:20]):  # Check first 20 lines
        if (50 < len(line) < 300 and 
            not line.startswith('Abstract') and 
            not line.startswith('Keywords') and
            not line.isupper() and
            not any(word in line.lower() for word in ['received', 'accepted', 'vol.', 'pp.'])):
            metadata['title'] = line
            break
    
    # Extract authors (look for patterns with commas, 'et al', or affiliations)
    for i, line in enumerate(lines):
        line_lower = line.lower()
        if ('et al' in line_lower or 
            (',' in line and len(line) < 500 and 
             any(indicator in line_lower for indicator in ['university', 'institute', 'department', 'college', '@']))):
            # Clean up author line
            authors = re.split(r',|\band\b|&', line)
            authors = [author.strip() for author in authors if author.strip()]
            metadata['authors'] = authors
            break
    
    # Extract abstract
    abstract_start = -1
    for i, line in enumerate(lines):
        if 'abstract' in line.lower():
            abstract_start = i + 1
            break
    
    if abstract_start != -1:
        abstract_lines = []
        for j in range(abstract_start, min(abstract_start + 15, len(lines))):
            if (not lines[j].lower().startswith('keywords') and 
                not lines[j].lower().startswith('1.') and 
                not lines[j].lower().startswith('introduction')):
                abstract_lines.append(lines[j])
            else:
                break
        metadata['abstract'] = ' '.join(abstract_lines)
    
    # Extract journal/conference info
    for line in lines:
        line_lower = line.lower()
        if any(keyword in line_lower for keyword in ['journal', 'proceedings', 'conference', 'vol.', 'no.', 'pp.']):
            metadata['journal'] = line
            break
    
    # Extract year
    year_match = re.search(r'\b(19|20)\d{2}\b', text)
    if year_match:
        metadata['publication_date'] = year_match.group()
    
    # Extract keywords
    for i, line in enumerate(lines):
        if 'keyword' in line.lower():
            if i + 1 < len(lines):
                keyword_line = lines[i + 1]
                keywords = re.split(r'[;,]', keyword_line)
                metadata['keywords'] = [kw.strip() for kw in keywords if kw.strip()]
            break
    
    return metadata

def add_paper_to_index(text: str, paper_id: int) -> tuple:
    """Add paper text to FAISS index"""
    try:
        chunks = chunk_text(text)
        print(f"Created {len(chunks)} chunks for paper {paper_id}")
        
        if not chunks:
            return [], []
        
        embeddings = get_embeddings_openrouter(chunks)
        
        if embeddings and len(embeddings) == len(chunks):
            # Convert to numpy array
            embedding_array = np.array(embeddings).astype("float32")
            
            # Verify dimension
            if embedding_array.shape[1] != faiss_index.d:
                print(f"Embedding dimension mismatch: expected {faiss_index.d}, got {embedding_array.shape[1]}")
                return chunks, []
            
            # Create IDs: paper_id * 10000 + chunk_index (allows up to 10k chunks per paper)
            ids = np.array([paper_id * 10000 + i for i in range(len(chunks))])
            
            # Add to FAISS index
            faiss_index.add_with_ids(embedding_array, ids)
            
            # Save updated index
            os.makedirs(os.path.dirname(FAISS_INDEX_PATH), exist_ok=True)
            with open(FAISS_INDEX_PATH, "wb") as f:
                pickle.dump(faiss_index, f)
            
            print(f"Successfully added paper {paper_id} to FAISS index with {len(chunks)} chunks")
            return chunks, embeddings
        else:
            print(f"Failed to get embeddings for paper {paper_id}")
            return chunks, []
            
    except Exception as e:
        print(f"Error adding paper to index: {e}")
        return [], []

def semantic_search(query: str, top_k: int = 10) -> List[Dict[str, Any]]:
    """Perform semantic search using FAISS and OpenRouter embeddings"""
    try:
        # Get query embedding
        query_embedding = get_embeddings_openrouter([query])
        if not query_embedding:
            return []
        
        query_vector = np.array([query_embedding[0]]).astype("float32")
        
        # Search in FAISS
        distances, indices = faiss_index.search(query_vector, top_k)
        
        results = []
        for i, (distance, idx) in enumerate(zip(distances[0], indices[0])):
            if idx != -1:
                paper_id = idx // 10000
                chunk_index = idx % 10000
                results.append({
                    'paper_id': int(paper_id),
                    'chunk_index': int(chunk_index),
                    'similarity_score': float(1 / (1 + distance)),  # Convert distance to similarity
                    'distance': float(distance)
                })
        
        return results
        
    except Exception as e:
        print(f"Error in semantic search: {e}")
        return []

def hybrid_search(query: str, papers: List, top_k: int = 10) -> List[Dict[str, Any]]:
    """Combine semantic and keyword search"""
    # Semantic search
    semantic_results = semantic_search(query, top_k * 2)
    
    # Keyword search
    keyword_results = []
    query_terms = set(term.lower() for term in query.split() if len(term) > 2)
    
    if query_terms:
        for paper in papers:
            content = f"{paper.title or ''} {paper.abstract or ''} {paper.content or ''}".lower()
            matches = sum(1 for term in query_terms if term in content)
            if matches > 0:
                keyword_results.append({
                    'paper_id': paper.id,
                    'keyword_matches': matches,
                    'content': content
                })
    
    # Combine and rank results
    combined_results = []
    seen_papers = set()
    
    # Add semantic results first
    for result in semantic_results:
        if result['paper_id'] not in seen_papers:
            paper = next((p for p in papers if p.id == result['paper_id']), None)
            if paper:
                combined_results.append({
                    'paper': paper,
                    'score': result['similarity_score'],
                    'type': 'semantic',
                    'chunk_index': result['chunk_index']
                })
                seen_papers.add(paper.id)
    
    # Add keyword results
    for result in keyword_results:
        if result['paper_id'] not in seen_papers:
            paper = next((p for p in papers if p.id == result['paper_id']), None)
            if paper:
                combined_results.append({
                    'paper': paper,
                    'score': result['keyword_matches'] / len(query_terms),
                    'type': 'keyword',
                    'chunk_index': 0
                })
                seen_papers.add(paper.id)
    
    # Sort by score and return top_k
    combined_results.sort(key=lambda x: x['score'], reverse=True)
    return combined_results[:top_k]

def get_relevant_snippet(content: str, query: str, max_length: int = 300) -> str:
    """Extract a relevant snippet showing query terms"""
    if not content or not query:
        return content[:max_length] + "..." if len(content) > max_length else content
    
    content_lower = content.lower()
    query_terms = [term for term in query.lower().split() if len(term) > 2]
    
    if not query_terms:
        return content[:max_length] + "..." if len(content) > max_length else content
    
    # Find the best match position
    best_position = -1
    for term in query_terms:
        pos = content_lower.find(term)
        if pos != -1 and (best_position == -1 or pos < best_position):
            best_position = pos
    
    if best_position != -1:
        start = max(0, best_position - 100)
        end = min(len(content), best_position + 200)
        snippet = content[start:end]
        
        if start > 0:
            snippet = "..." + snippet
        if end < len(content):
            snippet = snippet + "..."
        
        return snippet
    
    # Fallback to beginning
    return content[:max_length] + "..." if len(content) > max_length else content