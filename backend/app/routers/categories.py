from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional

from app.database import get_db
from app.models import Category, User
from app.schemas import CategoryOut, CategoryCreate
from app.auth_utils import get_current_user, get_current_admin

router = APIRouter(prefix="/api/categories", tags=["categories"])

@router.get("", response_model=List[CategoryOut])
def list_categories(
    type: Optional[str] = None, # income or expense
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    query = db.query(Category)
    if type:
        if type not in ("income", "expense"):
            raise HTTPException(status_code=400, detail="Invalid category type. Must be 'income' or 'expense'")
        query = query.filter(Category.type == type)
    return query.order_by(Category.name).all()

@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    category_in: CategoryCreate, 
    db: Session = Depends(get_db), 
    admin: User = Depends(get_current_admin)
):
    category = Category(
        name=category_in.name,
        icon=category_in.icon,
        color=category_in.color,
        type=category_in.type
    )
    db.add(category)
    try:
        db.commit()
        db.refresh(category)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name and type already exists"
        )
    return category

@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    category_in: CategoryCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        
    category.name = category_in.name
    category.icon = category_in.icon
    category.color = category_in.color
    category.type = category_in.type
    
    try:
        db.commit()
        db.refresh(category)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category with this name and type already exists"
        )
    return category

@router.delete("/{category_id}", status_code=status.HTTP_200_OK)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        
    try:
        db.delete(category)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category because it is in use by transactions or budgets"
        )
    return {"message": "Category deleted successfully"}
