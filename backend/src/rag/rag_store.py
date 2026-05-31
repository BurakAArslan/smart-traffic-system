import os
import chromadb
from sentence_transformers import SentenceTransformer


BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VECTOR_DB_DIR = os.path.join(BASE_DIR, "vector_db")

COLLECTION_NAME = "traffic_safety_knowledge"

_client = None
_collection = None
_embedding_model = None


def get_embedding_model():
    global _embedding_model

    if _embedding_model is None:
        print("Embedding modeli yükleniyor...")
        _embedding_model = SentenceTransformer(
            "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        )
        print("Embedding modeli yüklendi.")

    return _embedding_model


def get_client():
    global _client

    if _client is None:
        _client = chromadb.PersistentClient(path=VECTOR_DB_DIR)

    return _client


def get_collection():
    global _collection

    if _collection is None:
        client = get_client()
        _collection = client.get_or_create_collection(name=COLLECTION_NAME)

    return _collection


def embed_text(text: str):
    model = get_embedding_model()
    return model.encode(text).tolist()