from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List, Optional
from decimal import Decimal
from datetime import date
from uuid import UUID

from app.database import get_db
from app.models import Income, Category, User, Notification
from app.schemas import IncomeOut, IncomeCreate, IncomeUpdate
from app.auth_utils import get_current_user, get_current_admin

router = APIRouter(prefix="/api/income", tags=["income"])

@router.post("", response_model=IncomeOut, status_code=status.HTTP_201_CREATED)
def create_income(
    income_in: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify category exists and is an income category
    category = db.query(Category).filter(Category.id == income_in.category_id, Category.type == "income").first()
    if not category:
        raise HTTPException(status_code=400, detail="Invalid income category ID")
        
    income = Income(
        amount=income_in.amount,
        category_id=income_in.category_id,
        description=income_in.description,
        income_date=income_in.income_date,
        created_by=current_user.id
    )
    db.add(income)
    db.commit()
    db.refresh(income)
    
    # Notify other members
    users = db.query(User).all()
    for u in users:
        if u.id != current_user.id:
            notif = Notification(
                user_id=u.id,
                title="Income Added",
                message=f"{current_user.name} added income: ₹{income.amount:,.2f} for '{category.name}'"
            )
            db.add(notif)
    db.commit()
    
    # Populate helpers
    income.creator_name = current_user.name
    return income

from app.schemas import PaginatedIncomeOut

@router.get("", response_model=PaginatedIncomeOut)
def list_income(
    q: Optional[str] = None,
    category_id: Optional[int] = None,
    created_by: Optional[UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    min_amount: Optional[Decimal] = None,
    max_amount: Optional[Decimal] = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Income)
    
    if q:
        query = query.filter(Income.description.ilike(f"%{q}%"))
    if category_id:
        query = query.filter(Income.category_id == category_id)
    if created_by:
        query = query.filter(Income.created_by == created_by)
    if start_date:
        query = query.filter(Income.income_date >= start_date)
    if end_date:
        query = query.filter(Income.income_date <= end_date)
    if min_amount:
        query = query.filter(Income.amount >= min_amount)
    if max_amount:
        query = query.filter(Income.amount <= max_amount)
        
    total = query.count()
    items = query.order_by(Income.income_date.desc(), Income.id.desc()).offset((page - 1) * limit).limit(limit).all()
    
    for item in items:
        item.creator_name = db.query(User.name).filter(User.id == item.created_by).scalar()
        
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": items
    }

@router.get("/{income_id}", response_model=IncomeOut)
def get_income(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    income = db.query(Income).filter(Income.id == income_id).first()
    if not income:
        raise HTTPException(status_code=404, detail="Income not found")
        
    income.creator_name = db.query(User.name).filter(User.id == income.created_by).scalar()
    return income

@router.put("/{income_id}", response_model=IncomeOut)
def update_income(
    income_id: int,
    income_in: IncomeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    income = db.query(Income).filter(Income.id == income_id).first()
    if not income:
        raise HTTPException(status_code=404, detail="Income not found")
        
    # Security check: Non-admins can only update their own records
    if current_user.role != "admin" and income.created_by != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to update another user's income record"
        )
        
    if income_in.amount is not None:
        income.amount = income_in.amount
    if income_in.category_id is not None:
        cat = db.query(Category).filter(Category.id == income_in.category_id, Category.type == "income").first()
        if not cat:
            raise HTTPException(status_code=400, detail="Invalid income category ID")
        income.category_id = income_in.category_id
    if income_in.description is not None:
        income.description = income_in.description
    if income_in.income_date is not None:
        income.income_date = income_in.income_date
        
    db.commit()
    db.refresh(income)
    
    income.creator_name = db.query(User.name).filter(User.id == income.created_by).scalar()
    return income

@router.delete("/{income_id}", status_code=status.HTTP_200_OK)
def delete_income(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    income = db.query(Income).filter(Income.id == income_id).first()
    if not income:
        raise HTTPException(status_code=404, detail="Income not found")
        
    # Non-admins can only delete their own income records
    if current_user.role != "admin" and income.created_by != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to delete another user's income record"
        )
        
    db.delete(income)
    db.commit()
    return {"message": "Income deleted successfully"}
