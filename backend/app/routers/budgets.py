from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List, Optional
from decimal import Decimal
from datetime import date

from app.database import get_db
from app.models import Budget, Category, Expense
from app.schemas import BudgetOut, BudgetCreate, BudgetUpdate
from app.auth_utils import get_current_user, get_current_admin, User

router = APIRouter(prefix="/api/budgets", tags=["budgets"])

@router.get("", response_model=List[BudgetOut])
def list_budgets(
    month: int,
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Budget).filter(Budget.month == month, Budget.year == year).all()

@router.get("/details")
def get_budget_details(
    month: int,
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns detailed budgets including the actual spent amount and percentage utilized
    for a given month and year.
    """
    budgets = db.query(Budget).filter(Budget.month == month, Budget.year == year).all()
    results = []
    
    # Track overall budget if set
    overall_budget = None
    
    for b in budgets:
        if b.category_id is None:
            # Overall family budget
            overall_budget = b
            continue
            
        # Category budget details
        spent = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
            Expense.category_id == b.category_id,
            func.extract('month', Expense.expense_date) == month,
            func.extract('year', Expense.expense_date) == year
        ).scalar()
        
        limit = b.monthly_limit
        pct = float((spent / limit) * 100) if limit > 0 else 0
        remaining = limit - spent
        
        results.append({
            "id": b.id,
            "category_id": b.category_id,
            "category_name": b.category.name if b.category else "Unknown",
            "category_color": b.category.color if b.category else "#00C2FF",
            "category_icon": b.category.icon if b.category else "Tag",
            "limit": float(limit),
            "spent": float(spent),
            "remaining": float(remaining),
            "utilization_percentage": pct,
            "status": "red" if pct >= 100 else ("yellow" if pct >= 80 else "green")
        })

    # Calculate overall spent
    overall_spent = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
        func.extract('month', Expense.expense_date) == month,
        func.extract('year', Expense.expense_date) == year
    ).scalar()

    overall_limit = overall_budget.monthly_limit if overall_budget else Decimal(0)
    overall_pct = float((overall_spent / overall_limit) * 100) if overall_limit > 0 else 0
    overall_remaining = overall_limit - overall_spent

    return {
        "categories": results,
        "overall": {
            "id": overall_budget.id if overall_budget else None,
            "limit": float(overall_limit),
            "spent": float(overall_spent),
            "remaining": float(overall_remaining),
            "utilization_percentage": overall_pct,
            "status": "red" if overall_pct >= 100 else ("yellow" if overall_pct >= 80 else "green"),
            "is_set": overall_budget is not None
        }
    }

@router.post("", response_model=BudgetOut, status_code=status.HTTP_201_CREATED)
def set_budget(
    budget_in: BudgetCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    # Check if a budget already exists for this category/overall, month, and year
    existing = db.query(Budget).filter(
        Budget.category_id == budget_in.category_id,
        Budget.month == budget_in.month,
        Budget.year == budget_in.year
    ).first()
    
    if existing:
        # Update existing limit instead of failing
        existing.monthly_limit = budget_in.monthly_limit
        db.commit()
        db.refresh(existing)
        return existing
        
    budget = Budget(
        category_id=budget_in.category_id,
        monthly_limit=budget_in.monthly_limit,
        month=budget_in.month,
        year=budget_in.year
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget

@router.delete("/{budget_id}", status_code=status.HTTP_200_OK)
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
        
    db.delete(budget)
    db.commit()
    return {"message": "Budget deleted successfully"}
