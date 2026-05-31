import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))

if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader

from src.rag.rag_store import get_collection, embed_text


DOCS_DIR = os.path.join(BACKEND_DIR, "docs")


def load_document(file_path: str):

    ext = os.path.splitext(file_path)[1].lower()

    # PDF
    if ext == ".pdf":

        loader = PyPDFLoader(file_path)
        pages = loader.load()

        text = "\n".join([page.page_content for page in pages])

        return text

    # TXT
    elif ext == ".txt":

        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()

    return ""


def chunk_text(text: str):

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=900,
        chunk_overlap=150,
        separators=["\n\n", "\n", ".", " ", ""]
    )

    return splitter.split_text(text)


def build_knowledge_base():

    collection = get_collection()

    ids = []
    documents = []
    embeddings = []
    metadatas = []

    doc_files = os.listdir(DOCS_DIR)

    chunk_counter = 0

    for file_name in doc_files:

        file_path = os.path.join(DOCS_DIR, file_name)

        if not os.path.isfile(file_path):
            continue

        print(f"Yükleniyor: {file_name}")

        text = load_document(file_path)

        if not text.strip():
            print(f"Boş doküman: {file_name}")
            continue

        chunks = chunk_text(text)

        print(f"{file_name} -> {len(chunks)} chunk")

        for i, chunk in enumerate(chunks):

            chunk_id = f"{file_name}_{i}"

            embedding = embed_text(chunk)

            ids.append(chunk_id)
            documents.append(chunk)
            embeddings.append(embedding)

            metadatas.append({
                "source": file_name,
                "chunk_index": i
            })

            chunk_counter += 1

    if not ids:
        print("Hiç doküman eklenmedi.")
        return

    collection.upsert(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas
    )

    print(f"\nToplam chunk sayısı: {chunk_counter}")
    print("RAG bilgi tabanı başarıyla oluşturuldu.")


if __name__ == "__main__":
    build_knowledge_base()