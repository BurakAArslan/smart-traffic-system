from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.database.connection import get_db
from src.database.models.user import User

from src.auth.schemas import (
    UserRegister,
    UserResponse,
    UserLogin,
    TokenResponse,
)

from src.auth.security import (
    hash_password,
    verify_password,
    create_access_token,
)
from src.auth.schemas import (
    UpdateUsernameRequest,
    ChangePasswordRequest,
)
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # Kullanıcı adı kontrolü
    existing_username = (
        db.query(User)
        .filter(User.username == user_data.username)
        .first()
    )

    if existing_username:
        raise HTTPException(
            status_code=400,
            detail="Bu kullanıcı adı zaten kullanılıyor."
        )

    # Email kontrolü
    existing_email = (
        db.query(User)
        .filter(User.email == user_data.email)
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Bu e-posta adresi zaten kullanılıyor."
        )

    # Yeni kullanıcı oluştur
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hash_password(user_data.password)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post("/login", response_model=TokenResponse)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    # Kullanıcıyı email ile bul
    user = (
        db.query(User)
        .filter(User.email == user_data.email)
        .first()
    )

    # Kullanıcı yoksa veya şifre yanlışsa
    if not user or not verify_password(
        user_data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="E-posta veya şifre hatalı."
        )

    # JWT token oluştur
    access_token = create_access_token(
        {"sub": str(user.id)}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

from src.auth.security import get_current_user


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email
    }

@router.put("/update-username")
def update_username(
    data: UpdateUsernameRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Aynı kullanıcı adı var mı?
    existing = (
        db.query(User)
        .filter(User.username == data.new_username)
        .first()
    )

    if existing and existing.id != current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Bu kullanıcı adı zaten kullanılıyor."
        )

    current_user.username = data.new_username
    db.commit()
    db.refresh(current_user)

    return {
        "message": "Kullanıcı adı başarıyla güncellendi.",
        "username": current_user.username,
    }
@router.put("/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Mevcut şifre kontrolü
    if not verify_password(
        data.current_password,
        current_user.hashed_password
    ):
        raise HTTPException(
            status_code=400,
            detail="Mevcut şifre yanlış."
        )

    # Yeni şifreyi hashle
    current_user.hashed_password = hash_password(
        data.new_password
    )

    db.commit()

    return {
        "message": "Şifre başarıyla değiştirildi."
    }