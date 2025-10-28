import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
import utils

def rebuild_faiss():
    print("Rebuilding FAISS index from database...")
    utils.rebuild_faiss_from_database()
    print("Done!")

if __name__ == "__main__":
    rebuild_faiss()