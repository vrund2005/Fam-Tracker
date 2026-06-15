from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime, timedelta
from uuid import UUID

from app.database import get_db
from app.models import Expense, Income, Category, User
from app.auth_utils import get_current_user, User as AuthUser

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.get("")
def get_report_data(
    month: int,
    year: int,
    category_id: Optional[int] = None,
    created_by: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user)
):
    """
    Retrieves comprehensive financial report data for a given month and year.
    Supports filtering by category and family member.
    """
    # Base Filters
    expense_query = db.query(Expense).filter(
        func.extract('month', Expense.expense_date) == month,
        func.extract('year', Expense.expense_date) == year
    )
    income_query = db.query(Income).filter(
        func.extract('month', Income.income_date) == month,
        func.extract('year', Income.income_date) == year
    )
    
    if category_id:
        expense_query = expense_query.filter(Expense.category_id == category_id)
        income_query = income_query.filter(Income.category_id == category_id)
    if created_by:
        expense_query = expense_query.filter(Expense.created_by == created_by)
        income_query = income_query.filter(Income.created_by == created_by)
        
    # Totals
    total_expense = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
        expense_query.subquery().c.id == Expense.id
    ).scalar()
    
    total_income = db.query(func.coalesce(func.sum(Income.amount), 0)).filter(
        income_query.subquery().c.id == Income.id
    ).scalar()
    
    savings = total_income - total_expense
    
    # 1. Category Breakdown (Expenses)
    category_expenses = db.query(
        Category.name,
        Category.color,
        Category.icon,
        func.sum(Expense.amount).label("total")
    ).join(Expense, Expense.category_id == Category.id).filter(
        func.extract('month', Expense.expense_date) == month,
        func.extract('year', Expense.expense_date) == year
    )
    if category_id:
        category_expenses = category_expenses.filter(Expense.category_id == category_id)
    if created_by:
        category_expenses = category_expenses.filter(Expense.created_by == created_by)
    
    category_data = category_expenses.group_by(Category.id).all()
    
    total_cat_sum = sum(float(item[3]) for item in category_data)
    category_breakdown = []
    for item in category_data:
        amount = float(item[3])
        pct = (amount / total_cat_sum * 100) if total_cat_sum > 0 else 0
        category_breakdown.append({
            "category_name": item[0],
            "color": item[1],
            "icon": item[2],
            "amount": amount,
            "percentage": round(pct, 2)
        })
    category_breakdown.sort(key=lambda x: x["amount"], reverse=True)

    # 2. Member Breakdown (Expenses)
    member_expenses = db.query(
        User.name,
        User.avatar_url,
        func.sum(Expense.amount).label("total")
    ).join(Expense, Expense.created_by == User.id).filter(
        func.extract('month', Expense.expense_date) == month,
        func.extract('year', Expense.expense_date) == year
    )
    if category_id:
        member_expenses = member_expenses.filter(Expense.category_id == category_id)
    if created_by:
        member_expenses = member_expenses.filter(Expense.created_by == created_by)
        
    member_data = member_expenses.group_by(User.id).all()
    
    total_mem_sum = sum(float(item[2]) for item in member_data)
    member_breakdown = []
    for item in member_data:
        amount = float(item[2])
        pct = (amount / total_mem_sum * 100) if total_mem_sum > 0 else 0
        member_breakdown.append({
            "member_name": item[0],
            "avatar_url": item[1],
            "amount": amount,
            "percentage": round(pct, 2)
        })
    member_breakdown.sort(key=lambda x: x["amount"], reverse=True)

    # 3. Payment Method Breakdown (Expenses)
    payment_method_data = db.query(
        Expense.payment_method,
        func.sum(Expense.amount).label("total")
    ).filter(
        func.extract('month', Expense.expense_date) == month,
        func.extract('year', Expense.expense_date) == year
    )
    if category_id:
        payment_method_data = payment_method_data.filter(Expense.category_id == category_id)
    if created_by:
        payment_method_data = payment_method_data.filter(Expense.created_by == created_by)
        
    payment_method_data = payment_method_data.group_by(Expense.payment_method).all()
    
    payment_breakdown = [
        {"method": item[0], "amount": float(item[1])}
        for item in payment_method_data
    ]

    # 4. Monthly Trends (Last 6 Months)
    monthly_trends = []
    # Generate list of last 6 months
    today = date(year, month, 1)
    for i in range(5, -1, -1):
        # Subtract i months
        # A simple month subtract calculation
        m = month - i
        y = year
        if m <= 0:
            m += 12
            y -= 1
            
        m_inc = db.query(func.coalesce(func.sum(Income.amount), 0)).filter(
            func.extract('month', Income.income_date) == m,
            func.extract('year', Income.income_date) == y
        ).scalar()
        
        m_exp = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
            func.extract('month', Expense.expense_date) == m,
            func.extract('year', Expense.expense_date) == y
        ).scalar()
        
        month_name = datetime(y, m, 1).strftime("%b")
        monthly_trends.append({
            "month_name": f"{month_name} {y}",
            "month": m,
            "year": y,
            "income": float(m_inc),
            "expense": float(m_exp),
            "savings": float(m_inc - m_exp)
        })

    # 5. Raw Transactions for Export
    expenses_list = expense_query.order_by(Expense.expense_date.desc()).all()
    income_list = income_query.order_by(Income.income_date.desc()).all()
    
    transactions = []
    for e in expenses_list:
        transactions.append({
            "type": "expense",
            "date": e.expense_date.strftime("%Y-%m-%d"),
            "category": e.category.name if e.category else "Other",
            "description": e.description or "",
            "amount": float(e.amount),
            "member": e.creator.name if e.creator else "Unknown",
            "details": e.payment_method
        })
    for inc in income_list:
        transactions.append({
            "type": "income",
            "date": inc.income_date.strftime("%Y-%m-%d"),
            "category": inc.category.name if inc.category else "Other",
            "description": inc.description or "",
            "amount": float(inc.amount),
            "member": inc.creator.name if inc.creator else "Unknown",
            "details": ""
        })
    transactions.sort(key=lambda x: x["date"], reverse=True)

    return {
        "month": month,
        "year": year,
        "total_income": float(total_income),
        "total_expense": float(total_expense),
        "savings": float(savings),
        "category_breakdown": category_breakdown,
        "member_breakdown": member_breakdown,
        "payment_breakdown": payment_breakdown,
        "monthly_trends": monthly_trends,
        "transactions": transactions
    }
