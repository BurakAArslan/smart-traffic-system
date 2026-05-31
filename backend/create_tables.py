from src.database.connection import engine
from src.database.base import Base

# Modelleri doğrudan import et
from src.database.models.route_history import RouteHistory
from src.database.models.user import User


def create_tables():
    print("Tablolar oluşturuluyor...")
    Base.metadata.create_all(bind=engine)
    print("Tüm tablolar başarıyla oluşturuldu.")


if __name__ == "__main__":
    create_tables()