from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# PostgreSQL bağlantı bilgileri
DATABASE_URL = (
    "postgresql+psycopg2://postgres:kvew9438@localhost:5432/smart_traffic_db"
)

# Engine oluştur
engine = create_engine(
    DATABASE_URL,

    echo=True,

    connect_args={
        "client_encoding": "utf8"
    }
)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def get_db():
    """
    FastAPI dependency olarak kullanılacak veritabanı oturumu.
    """
    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()