from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List
from uuid import UUID

from app.database import get_db
from app.models import User, FamilyMember, Expense
from app.schemas import UserOut, UserCreate, UserUpdate, UserPasswordChange, FamilyMemberAdminUpdate
from app.auth_utils import get_current_user, get_current_admin, get_password_hash, verify_password

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(User).all()

@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_family_member(
    user_in: UserCreate, 
    db: Session = Depends(get_db), 
    admin: User = Depends(get_current_admin)
):
    # Check if email is already taken
    existing_user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
        
    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        name=user_in.name,
        email=user_in.email.lower(),
        password_hash=hashed_pwd,
        role=user_in.role,
        avatar_url=user_in.avatar_url
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    fam_member = FamilyMember(
        user_id=user.id,
        relation=user_in.relation
    )
    db.add(fam_member)
    db.commit()
    db.refresh(user)
    
    return user

@router.put("/profile/update", response_model=UserOut)
def update_profile(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if user_in.name is not None:
        current_user.name = user_in.name
    if user_in.email is not None:
        # Check if email is taken
        existing = db.query(User).filter(User.email == user_in.email.lower(), User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already taken")
        current_user.email = user_in.email.lower()
    if user_in.avatar_url is not None:
        current_user.avatar_url = user_in.avatar_url
    
    # Non-admins cannot edit their own role or relation
    if user_in.role is not None:
        if current_user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can change roles")
        current_user.role = user_in.role
        
    if user_in.relation is not None:
        if current_user.family_member:
            current_user.family_member.relation = user_in.relation

    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/profile/password", status_code=status.HTTP_200_OK)
def change_password(
    pwd_in: UserPasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(pwd_in.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect old password"
        )
    current_user.password_hash = get_password_hash(pwd_in.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@router.put("/{user_id}", response_model=UserOut)
def admin_update_member(
    user_id: UUID,
    member_in: FamilyMemberAdminUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    # Check if updating email conflicts
    existing = db.query(User).filter(User.email == member_in.email.lower(), User.id != user_id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already taken")
        
    user.name = member_in.name
    user.email = member_in.email.lower()
    user.role = member_in.role
    if member_in.avatar_url is not None:
        user.avatar_url = member_in.avatar_url
        
    if user.family_member:
        user.family_member.relation = member_in.relation
    else:
        fam_member = FamilyMember(user_id=user.id, relation=member_in.relation)
        db.add(fam_member)
        
    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
def admin_delete_member(
    user_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    # Cannot delete self
    if user_id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own admin account")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    db.delete(user)
    db.commit()
    return {"message": "Family member deleted successfully"}

@router.get("/stats/contributions")
def get_user_contributions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Return user list with total expenses paid
    users = db.query(User).all()
    results = []
    for u in users:
        # Calculate sum of expenses paid by this user
        total_spent = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(Expense.created_by == u.id).scalar()
        results.append({
            "user_id": str(u.id),
            "name": u.name,
            "role": u.role,
            "relation": u.family_member.relation if u.family_member else "Other",
            "avatar_url": u.avatar_url,
            "total_spent": float(total_spent)
        })
    # Sort by total spent descending
    results.sort(key=lambda x: x["total_spent"], reverse=True)
    return results
