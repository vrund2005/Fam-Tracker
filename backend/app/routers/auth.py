from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import jwt
from uuid import UUID

from app.database import get_db
from app.models import User, FamilyMember
from app.schemas import UserCreate, UserOut, Token
from app.config import settings
from app.auth_utils import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.get("/first-boot")
def check_first_boot(db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    return {"is_first_boot": total_users == 0}

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if this is the first user (bootstrap)
    total_users = db.query(User).count()
    
    # If not first user, require current user to be admin (role-based)
    if total_users > 0:
        # In a real API, we would use oauth2 security, but to handle boot & ease
        # we will enforce that registration of new users must be done by an admin.
        # We can implement a simple token check inside the header or rely on Admin API.
        # Let's check headers/cookies or require it via dependencies.
        # For simplicity, we will check if there is an admin token provided.
        # We can check authorization inside this route manually or via a dependency.
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is locked. Please add family members through the Admin dashboard."
        )

    # First user must be admin
    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        name=user_in.name,
        email=user_in.email.lower(),
        password_hash=hashed_pwd,
        role="admin",  # Forced to admin for the first user
        avatar_url=user_in.avatar_url
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create family member entry
    fam_member = FamilyMember(
        user_id=user.id,
        relation=user_in.relation
    )
    db.add(fam_member)
    db.commit()
    db.refresh(user)
    
    return user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username.lower()).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

from pydantic import BaseModel, EmailStr

# Alternative JSON body login (useful for React frontend requests)
class JSONLoginRequest:
    class Inner(BaseModel):
        email: EmailStr
        password: str
    
@router.post("/login/json", response_model=Token)
def login_json(credentials: JSONLoginRequest.Inner, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email.lower()).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=Token)
def refresh(refresh_token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(refresh_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if user_id is None or token_type != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
        
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
