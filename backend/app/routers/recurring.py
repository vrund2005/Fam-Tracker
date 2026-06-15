from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta # standard relative date computations

from app.database import get_db
from app.models import RecurringExpense, Expense, ExpenseSplit, User, Notification, Category
from app.schemas import RecurringExpenseOut, RecurringExpenseCreate, RecurringExpenseUpdate
from app.auth_utils import get_current_user, User as AuthUser
from app.routers.expenses import check_budgets_and_notify

router = APIRouter(prefix="/api/recurring", tags=["recurring"])

def advance_due_date(current_due: date, frequency: str) -> date:
    if frequency == "daily":
        return current_due + timedelta(days=1)
    elif frequency == "weekly":
        return current_due + timedelta(weeks=1)
    elif frequency == "monthly":
        # Monthly increment using python-dateutil relativedelta or standard math
        # Standard fallback: month + 1
        year_offset = 0
        new_month = current_due.month + 1
        if new_month > 12:
            new_month = 1
            year_offset = 1
        try:
            return date(current_due.year + year_offset, new_month, current_due.day)
        except ValueError:
            # Handle end-of-month dates (e.g. 31st) by stepping back to the last day of next month
            # Let's find the first day of the month after next, then subtract 1 day.
            next_month_start = date(current_due.year + year_offset, new_month, 1)
            # Find start of month after next
            nan_month = new_month + 1
            nan_year = current_due.year + year_offset
            if nan_month > 12:
                nan_month = 1
                nan_year += 1
            nan_start = date(nan_year, nan_month, 1)
            return nan_start - timedelta(days=1)
    elif frequency == "yearly":
        try:
            return date(current_due.year + 1, current_due.month, current_due.day)
        except ValueError:
            # Leap year fallback (Feb 29)
            return date(current_due.year + 1, 2, 28)
    return current_due + timedelta(days=30)

@router.post("/process", status_code=status.HTTP_200_OK)
def process_recurring_expenses(
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user)
):
    """
    Scans active recurring expenses, generates normal expenses for items
    whose next_due_date is in the past or today, and increments next_due_date.
    """
    today = date.today()
    active_recurring = db.query(RecurringExpense).filter(
        RecurringExpense.is_active == True,
        RecurringExpense.next_due_date <= today
    ).all()
    
    generated_count = 0
    users = db.query(User).all()
    
    for item in active_recurring:
        # Loop until next_due_date is in the future
        while item.next_due_date <= today:
            # Create standard expense
            new_expense = Expense(
                amount=item.amount,
                category_id=item.category_id,
                description=f"{item.description} (Auto)",
                expense_date=item.next_due_date,
                created_by=item.created_by,
                payment_method=item.payment_method
            )
            db.add(new_expense)
            db.commit() # Commit to get expense.id
            
            # Default split: equally among all users
            split_amount = item.amount / len(users)
            for u in users:
                es = ExpenseSplit(
                    expense_id=new_expense.id,
                    user_id=u.id,
                    amount=split_amount
                )
                db.add(es)
            
            # Update recurring expense dates
            item.last_generated_date = item.next_due_date
            item.next_due_date = advance_due_date(item.next_due_date, item.frequency)
            generated_count += 1
            
            # Notify members
            category = db.query(Category).filter(Category.id == item.category_id).first()
            cat_name = category.name if category else "Expense"
            for u in users:
                notif = Notification(
                    user_id=u.id,
                    title="Recurring Expense Logged",
                    message=f"Automatically logged recurring expense: ₹{new_expense.amount:,.2f} for '{cat_name}' - {item.description}"
                )
                db.add(notif)
            
            db.commit()
            
            # Budget check
            check_budgets_and_notify(db, new_expense.category_id, new_expense.expense_date, item.created_by)

    return {"message": f"Recurring expenses processed. Generated {generated_count} expenses."}

@router.get("", response_model=List[RecurringExpenseOut])
def list_recurring(
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user)
):
    return db.query(RecurringExpense).order_by(RecurringExpense.created_at.desc()).all()

@router.post("", response_model=RecurringExpenseOut, status_code=status.HTTP_201_CREATED)
def create_recurring(
    item_in: RecurringExpenseCreate,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user)
):
    # Category check
    category = db.query(Category).filter(Category.id == item_in.category_id, Category.type == "expense").first()
    if not category:
        raise HTTPException(status_code=400, detail="Invalid expense category ID")
        
    recurring = RecurringExpense(
        amount=item_in.amount,
        category_id=item_in.category_id,
        description=item_in.description,
        frequency=item_in.frequency,
        start_date=item_in.start_date,
        next_due_date=item_in.start_date, # First payment due on start_date
        payment_method=item_in.payment_method,
        created_by=current_user.id
    )
    db.add(recurring)
    db.commit()
    db.refresh(recurring)
    return recurring

@router.put("/{recurring_id}", response_model=RecurringExpenseOut)
def update_recurring(
    recurring_id: int,
    item_in: RecurringExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user)
):
    recurring = db.query(RecurringExpense).filter(RecurringExpense.id == recurring_id).first()
    if not recurring:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
        
    if item_in.amount is not None:
        recurring.amount = item_in.amount
    if item_in.category_id is not None:
        cat = db.query(Category).filter(Category.id == item_in.category_id, Category.type == "expense").first()
        if not cat:
            raise HTTPException(status_code=400, detail="Invalid expense category ID")
        recurring.category_id = item_in.category_id
    if item_in.description is not None:
        recurring.description = item_in.description
    if item_in.frequency is not None:
        recurring.frequency = item_in.frequency
    if item_in.payment_method is not None:
        recurring.payment_method = item_in.payment_method
    if item_in.is_active is not None:
        recurring.is_active = item_in.is_active
        
    db.commit()
    db.refresh(recurring)
    return recurring

@router.delete("/{recurring_id}", status_code=status.HTTP_200_OK)
def delete_recurring(
    recurring_id: int,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user)
):
    recurring = db.query(RecurringExpense).filter(RecurringExpense.id == recurring_id).first()
    if not recurring:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
        
    db.delete(recurring)
    db.commit()
    return {"message": "Recurring expense deleted successfully"}
