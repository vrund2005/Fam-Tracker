from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List, Optional
from decimal import Decimal
from datetime import date, datetime
import json
from uuid import UUID

from app.database import get_db
from app.models import Expense, ExpenseSplit, Category, User, Budget, Notification
from app.schemas import ExpenseWithSplitsOut, ExpenseCreate, ExpenseUpdate
from app.auth_utils import get_current_user, get_current_admin
from app.storage_helper import upload_receipt_file

router = APIRouter(prefix="/api/expenses", tags=["expenses"])

def check_budgets_and_notify(db: Session, category_id: int, expense_date: date, current_user_id: UUID):
    """
    Checks if this expense causes the budget to be exceeded and creates notifications.
    """
    month = expense_date.month
    year = expense_date.year
    
    # 1. Check Category Budget
    category_budget = db.query(Budget).filter(
        Budget.category_id == category_id,
        Budget.month == month,
        Budget.year == year
    ).first()
    
    category = db.query(Category).filter(Category.id == category_id).first()
    category_name = category.name if category else "Category"
    
    if category_budget:
        # Calculate sum of expenses in this category for this month
        total_category_spent = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
            Expense.category_id == category_id,
            func.extract('month', Expense.expense_date) == month,
            func.extract('year', Expense.expense_date) == year
        ).scalar()
        
        limit = category_budget.monthly_limit
        if total_category_spent > limit:
            pct = int((total_category_spent / limit) * 100)
            # Send notification to all users
            all_users = db.query(User).all()
            for u in all_users:
                # Avoid duplicate identical recent notifications
                recent = db.query(Notification).filter(
                    Notification.user_id == u.id,
                    Notification.title == "Budget Alert!",
                    Notification.read_status == False
                ).order_by(Notification.created_at.desc()).first()
                
                # Only notify if no unread budget alert or alert details changed
                msg = f"Expenses for '{category_name}' have exceeded the monthly budget of ₹{limit:,.2f}! Current spent: ₹{total_category_spent:,.2f} ({pct}%)."
                if not recent or msg not in recent.message:
                    notif = Notification(
                        user_id=u.id,
                        title="Budget Alert!",
                        message=msg
                    )
                    db.add(notif)
            db.commit()

    # 2. Check Overall Monthly Budget (category_id is NULL)
    overall_budget = db.query(Budget).filter(
        Budget.category_id == None,
        Budget.month == month,
        Budget.year == year
    ).first()
    
    if overall_budget:
        total_monthly_spent = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
            func.extract('month', Expense.expense_date) == month,
            func.extract('year', Expense.expense_date) == year
        ).scalar()
        
        limit = overall_budget.monthly_limit
        if total_monthly_spent > limit:
            pct = int((total_monthly_spent / limit) * 100)
            all_users = db.query(User).all()
            for u in all_users:
                msg = f"Overall family expenses have exceeded the monthly budget of ₹{limit:,.2f}! Current spent: ₹{total_monthly_spent:,.2f} ({pct}%)."
                recent = db.query(Notification).filter(
                    Notification.user_id == u.id,
                    Notification.title == "Overall Budget Alert!",
                    Notification.read_status == False
                ).order_by(Notification.created_at.desc()).first()
                
                if not recent or msg not in recent.message:
                    notif = Notification(
                        user_id=u.id,
                        title="Overall Budget Alert!",
                        message=msg
                    )
                    db.add(notif)
            db.commit()

@router.post("", response_model=ExpenseWithSplitsOut, status_code=status.HTTP_201_CREATED)
def create_expense(
    expense_in: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify category exists and is an expense category
    category = db.query(Category).filter(Category.id == expense_in.category_id, Category.type == "expense").first()
    if not category:
        raise HTTPException(status_code=400, detail="Invalid expense category ID")
        
    # Create the expense object
    expense = Expense(
        amount=expense_in.amount,
        category_id=expense_in.category_id,
        description=expense_in.description,
        expense_date=expense_in.expense_date,
        created_by=current_user.id,
        payment_method=expense_in.payment_method,
        receipt_image_url=expense_in.receipt_image_url
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)

    # Process Splits
    users = db.query(User).all()
    splits = expense_in.splits
    
    if not splits:
        # Default: split equally among all users
        split_amount = Decimal(expense_in.amount) / Decimal(len(users))
        for u in users:
            es = ExpenseSplit(expense_id=expense.id, user_id=u.id, amount=split_amount)
            db.add(es)
    else:
        # Custom splits validation: sum must equal total expense amount
        split_sum = sum(s.amount for s in splits)
        if abs(split_sum - expense_in.amount) > Decimal('0.02'): # Allow small decimal discrepancy
            raise HTTPException(
                status_code=400,
                detail=f"Sum of splits (₹{split_sum}) must equal the total expense amount (₹{expense_in.amount})"
            )
            
        for s in splits:
            # Check if split user exists
            split_user = db.query(User).filter(User.id == s.user_id).first()
            if not split_user:
                raise HTTPException(status_code=400, detail=f"Invalid split user ID: {s.user_id}")
            es = ExpenseSplit(expense_id=expense.id, user_id=s.user_id, amount=s.amount)
            db.add(es)
            
    db.commit()
    db.refresh(expense)
    
    # Notify other members
    for u in users:
        if u.id != current_user.id:
            notif = Notification(
                user_id=u.id,
                title="Expense Added",
                message=f"{current_user.name} added: ₹{expense.amount:,.2f} for '{category.name}' - {expense.description or ''}"
            )
            db.add(notif)
    db.commit()
    
    # Check budget alerts
    check_budgets_and_notify(db, expense.category_id, expense.expense_date, current_user.id)
    
    # Attach helper fields to output schema
    res = expense
    res.creator_name = current_user.name
    for sp in res.splits:
        sp.user_name = db.query(User.name).filter(User.id == sp.user_id).scalar()
        
    return res

from app.schemas import ExpenseWithSplitsOut, ExpenseCreate, ExpenseUpdate, PaginatedExpensesOut

@router.get("", response_model=PaginatedExpensesOut)
def list_expenses(
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
    query = db.query(Expense)
    
    if q:
        query = query.filter(Expense.description.ilike(f"%{q}%"))
    if category_id:
        query = query.filter(Expense.category_id == category_id)
    if created_by:
        query = query.filter(Expense.created_by == created_by)
    if start_date:
        query = query.filter(Expense.expense_date >= start_date)
    if end_date:
        query = query.filter(Expense.expense_date <= end_date)
    if min_amount:
        query = query.filter(Expense.amount >= min_amount)
    if max_amount:
        query = query.filter(Expense.amount <= max_amount)
        
    total = query.count()
    items = query.order_by(Expense.expense_date.desc(), Expense.id.desc()).offset((page - 1) * limit).limit(limit).all()
    
    for item in items:
        item.creator_name = db.query(User.name).filter(User.id == item.created_by).scalar()
        for sp in item.splits:
            sp.user_name = db.query(User.name).filter(User.id == sp.user_id).scalar()
            
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": items
    }

@router.get("/{expense_id}", response_model=ExpenseWithSplitsOut)
def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    expense.creator_name = db.query(User.name).filter(User.id == expense.created_by).scalar()
    for sp in expense.splits:
        sp.user_name = db.query(User.name).filter(User.id == sp.user_id).scalar()
        
    return expense

@router.put("/{expense_id}", response_model=ExpenseWithSplitsOut)
def update_expense(
    expense_id: int,
    expense_in: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    # Security check: Non-admins can only update their own records
    if current_user.role != "admin" and expense.created_by != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to update another user's expense record"
        )
        
    if expense_in.amount is not None:
        expense.amount = expense_in.amount
    if expense_in.category_id is not None:
        # Check category type
        cat = db.query(Category).filter(Category.id == expense_in.category_id, Category.type == "expense").first()
        if not cat:
            raise HTTPException(status_code=400, detail="Invalid expense category ID")
        expense.category_id = expense_in.category_id
    if expense_in.description is not None:
        expense.description = expense_in.description
    if expense_in.expense_date is not None:
        expense.expense_date = expense_in.expense_date
    if expense_in.payment_method is not None:
        expense.payment_method = expense_in.payment_method
    if expense_in.receipt_image_url is not None:
        expense.receipt_image_url = expense_in.receipt_image_url
        
    # Update splits if provided
    if expense_in.splits is not None:
        # Verify splits sum matches expense amount (use new amount or existing amount)
        target_amount = expense_in.amount if expense_in.amount is not None else expense.amount
        split_sum = sum(s.amount for s in expense_in.splits)
        
        if abs(split_sum - target_amount) > Decimal('0.02'):
            raise HTTPException(
                status_code=400,
                detail=f"Sum of splits (₹{split_sum}) must equal the total expense amount (₹{target_amount})"
            )
            
        # Delete old splits
        db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense.id).delete()
        
        # Add new splits
        for s in expense_in.splits:
            split_user = db.query(User).filter(User.id == s.user_id).first()
            if not split_user:
                raise HTTPException(status_code=400, detail=f"Invalid split user ID: {s.user_id}")
            es = ExpenseSplit(expense_id=expense.id, user_id=s.user_id, amount=s.amount)
            db.add(es)
            
    db.commit()
    db.refresh(expense)
    
    # Check budget alerts
    check_budgets_and_notify(db, expense.category_id, expense.expense_date, current_user.id)
    
    # Populate helpers
    expense.creator_name = db.query(User.name).filter(User.id == expense.created_by).scalar()
    for sp in expense.splits:
        sp.user_name = db.query(User.name).filter(User.id == sp.user_id).scalar()
        
    return expense

@router.delete("/{expense_id}", status_code=status.HTTP_200_OK)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    db.delete(expense)
    db.commit()
    return {"message": "Expense deleted successfully"}

@router.post("/upload-receipt", response_model=dict)
def upload_receipt(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # Check file size or type if necessary (only allow images)
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are allowed")
        
    url = upload_receipt_file(file)
    return {"receipt_url": url}
