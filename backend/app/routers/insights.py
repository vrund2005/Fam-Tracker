from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from datetime import date, datetime
from decimal import Decimal
from typing import List

from app.database import get_db
from app.models import Expense, Income, Category, User
from app.auth_utils import get_current_user, User as AuthUser

router = APIRouter(prefix="/api/insights", tags=["insights"])

@router.get("")
def get_smart_insights(
    db: Session = Depends(get_db),
    current_user: AuthUser = Depends(get_current_user)
):
    """
    Generates smart, natural language financial insights by comparing 
    current month metrics with the previous month.
    """
    today = date.today()
    curr_month = today.month
    curr_year = today.year
    
    # Calculate previous month/year
    prev_month = curr_month - 1
    prev_year = curr_year
    if prev_month == 0:
        prev_month = 12
        prev_year -= 1

    insights = []

    # 1. Total spending comparison
    curr_total_spent = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
        func.extract('month', Expense.expense_date) == curr_month,
        func.extract('year', Expense.expense_date) == curr_year
    ).scalar()

    prev_total_spent = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
        func.extract('month', Expense.expense_date) == prev_month,
        func.extract('year', Expense.expense_date) == prev_year
    ).scalar()

    if prev_total_spent > 0:
        diff_spent = curr_total_spent - prev_total_spent
        pct_spent = (abs(diff_spent) / prev_total_spent) * 100
        direction = "increased" if diff_spent > 0 else "reduced"
        insights.append({
            "type": "warning" if diff_spent > 0 else "success",
            "message": f"Total family spending has {direction} by {pct_spent:.1f}% compared to last month (₹{curr_total_spent:,.2f} vs ₹{prev_total_spent:,.2f})."
        })
    else:
        insights.append({
            "type": "info",
            "message": f"Total spending this month is ₹{curr_total_spent:,.2f}. No data for last month to compare."
        })

    # 2. Category specific comparison (Food, Groceries, Fuel, etc.)
    categories = db.query(Category).filter(Category.type == "expense").all()
    for cat in categories:
        curr_cat_spent = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
            Expense.category_id == cat.id,
            func.extract('month', Expense.expense_date) == curr_month,
            func.extract('year', Expense.expense_date) == curr_year
        ).scalar()
        
        prev_cat_spent = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
            Expense.category_id == cat.id,
            func.extract('month', Expense.expense_date) == prev_month,
            func.extract('year', Expense.expense_date) == prev_year
        ).scalar()
        
        if prev_cat_spent > 0 and curr_cat_spent > 0:
            diff = curr_cat_spent - prev_cat_spent
            pct = (abs(diff) / prev_cat_spent) * 100
            
            # Highlight changes above 10%
            if pct >= 10:
                direction = "increased" if diff > 0 else "reduced"
                insights.append({
                    "type": "warning" if diff > 0 else "success",
                    "message": f"Spending on '{cat.name}' has {direction} by {pct:.1f}% (₹{curr_cat_spent:,.2f} vs ₹{prev_cat_spent:,.2f})."
                })

    # 3. Highest Spending Category
    highest_cat = db.query(
        Category.name,
        func.sum(Expense.amount).label("total")
    ).join(Expense, Expense.category_id == Category.id).filter(
        func.extract('month', Expense.expense_date) == curr_month,
        func.extract('year', Expense.expense_date) == curr_year
    ).group_by(Category.id).order_by(func.sum(Expense.amount).desc()).first()
    
    if highest_cat and highest_cat[1] > 0:
        insights.append({
            "type": "warning",
            "message": f"'{highest_cat[0]}' is your highest spending category this month, accounting for ₹{highest_cat[1]:,.2f}."
        })

    # 4. Top Contributor
    top_contributor = db.query(
        User.name,
        func.sum(Expense.amount).label("total")
    ).join(Expense, Expense.created_by == User.id).filter(
        func.extract('month', Expense.expense_date) == curr_month,
        func.extract('year', Expense.expense_date) == curr_year
    ).group_by(User.id).order_by(func.sum(Expense.amount).desc()).first()

    if top_contributor and top_contributor[1] > 0:
        insights.append({
            "type": "info",
            "message": f"{top_contributor[0]} is the top contributor this month, paying ₹{top_contributor[1]:,.2f} of family expenses."
        })

    # Fallback if list is too short
    if not insights:
        insights.append({
            "type": "info",
            "message": "Start logging expenses to generate smart insights!"
        })

    return insights
