import faiss
import pickle
import os

os.makedirs("embeddings", exist_ok=True)

# dimension of your embeddings
d = 1536  

index = faiss.IndexFlatL2(d)  # or whatever index type you use
with open("embeddings/faiss_index.pkl", "wb") as f:
    pickle.dump(index, f)

print("FAISS index initialized.")
