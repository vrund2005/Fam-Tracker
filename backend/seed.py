import sys
import os
from datetime import date, datetime
from decimal import Decimal
from dateutil.relativedelta import relativedelta

# Add current directory to path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, Base, engine
from app.models import User, FamilyMember, Category, Expense, ExpenseSplit, Income, Budget, RecurringExpense
from app.auth_utils import get_password_hash

def seed_db():
    print("Connecting to database...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Check if we already have users. If so, don't re-seed
    if db.query(User).count() > 0:
        print("Database already contains users. Skipping seed process.")
        db.close()
        return

    print("Seeding users...")
    password_hash = get_password_hash("password123")
    
    dad = User(
        name="Dad (Vikram)",
        email="dad@family.com",
        password_hash=password_hash,
        role="admin",
        avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"
    )
    mom = User(
        name="Mom (Anjali)",
        email="mom@family.com",
        password_hash=password_hash,
        role="member",
        avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
    )
    son = User(
        name="Son (Rahul)",
        email="son@family.com",
        password_hash=password_hash,
        role="member",
        avatar_url="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150"
    )
    
    db.add_all([dad, mom, son])
    db.commit()
    db.refresh(dad)
    db.refresh(mom)
    db.refresh(son)

    print("Seeding family member details...")
    fm_dad = FamilyMember(user_id=dad.id, relation="Father")
    fm_mom = FamilyMember(user_id=mom.id, relation="Mother")
    fm_son = FamilyMember(user_id=son.id, relation="Son")
    db.add_all([fm_dad, fm_mom, fm_son])
    db.commit()

    # Query categories to map IDs
    categories = {c.name: c.id for c in db.query(Category).all()}
    
    # If categories are somehow empty, seed them here
    if not categories:
        print("Categories not found, initializing standard ones...")
        # Create standard categories
        cats = [
            Category(name="Food", icon="Utensils", color="#FF2D95", type="expense"),
            Category(name="Groceries", icon="ShoppingBag", color="#00C2FF", type="expense"),
            Category(name="Fuel", icon="Car", color="#FFD60A", type="expense"),
            Category(name="Electricity", icon="Zap", color="#FF9500", type="expense"),
            Category(name="Gas", icon="Flame", color="#FF3B30", type="expense"),
            Category(name="Internet", icon="Wifi", color="#34C759", type="expense"),
            Category(name="Water", icon="Droplet", color="#5856D6", type="expense"),
            Category(name="Rent", icon="Home", color="#AF52DE", type="expense"),
            Category(name="EMI", icon="CreditCard", color="#FF2D95", type="expense"),
            Category(name="Education", icon="BookOpen", color="#00C2FF", type="expense"),
            Category(name="Medical", icon="Activity", color="#FFD60A", type="expense"),
            Category(name="Shopping", icon="Shirt", color="#FF9500", type="expense"),
            Category(name="Travel", icon="Plane", color="#FF3B30", type="expense"),
            Category(name="Entertainment", icon="Gamepad2", color="#34C759", type="expense"),
            Category(name="Maintenance", icon="Wrench", color="#5856D6", type="expense"),
            Category(name="Pets", icon="Dog", color="#AF52DE", type="expense"),
            Category(name="Gifts", icon="Gift", color="#FF2D95", type="expense"),
            Category(name="Other", icon="HelpCircle", color="#8E8E93", type="expense"),
            Category(name="Salary", icon="Briefcase", color="#34C759", type="income"),
            Category(name="Freelancing", icon="Laptop", color="#00C2FF", type="income"),
            Category(name="Business", icon="TrendingUp", color="#FF2D95", type="income"),
            Category(name="Interest", icon="Percent", color="#FFD60A", type="income"),
            Category(name="Rent Received", icon="Building2", color="#FF9500", type="income"),
            Category(name="Investments", icon="BarChart3", color="#AF52DE", type="income"),
            Category(name="Bonus", icon="Sparkles", color="#5856D6", type="income"),
            Category(name="Other", icon="HelpCircle", color="#8E8E93", type="income")
        ]
        db.add_all(cats)
        db.commit()
        categories = {c.name: c.id for c in db.query(Category).all()}

    print("Seeding budgets...")
    today = date.today()
    curr_month = today.month
    curr_year = today.year
    
    prev_month = curr_month - 1
    prev_year = curr_year
    if prev_month == 0:
        prev_month = 12
        prev_year -= 1

    # Seed Budgets for current month
    budgets = [
        # Overall budget
        Budget(category_id=None, monthly_limit=Decimal(80000), month=curr_month, year=curr_year),
        Budget(category_id=categories["Food"], monthly_limit=Decimal(15000), month=curr_month, year=curr_year),
        Budget(category_id=categories["Groceries"], monthly_limit=Decimal(10000), month=curr_month, year=curr_year),
        Budget(category_id=categories["Fuel"], monthly_limit=Decimal(8000), month=curr_month, year=curr_year),
        Budget(category_id=categories["Electricity"], monthly_limit=Decimal(5000), month=curr_month, year=curr_year),
        
        # Budgets for previous month (for comparison)
        Budget(category_id=None, monthly_limit=Decimal(80000), month=prev_month, year=prev_year),
        Budget(category_id=categories["Food"], monthly_limit=Decimal(12000), month=prev_month, year=prev_year),
        Budget(category_id=categories["Groceries"], monthly_limit=Decimal(10000), month=prev_month, year=prev_year),
        Budget(category_id=categories["Fuel"], monthly_limit=Decimal(8000), month=prev_month, year=prev_year)
    ]
    db.add_all(budgets)
    db.commit()

    print("Seeding income...")
    income_items = [
        # Current Month
        Income(amount=Decimal(150000), category_id=categories["Salary"], description="Dad's Monthly Salary", income_date=date(curr_year, curr_month, 1), created_by=dad.id),
        Income(amount=Decimal(45000), category_id=categories["Freelancing"], description="Mom's Consulting Gig", income_date=date(curr_year, curr_month, 5), created_by=mom.id),
        Income(amount=Decimal(8000), category_id=categories["Bonus"], description="Rahul's College Stipend", income_date=date(curr_year, curr_month, 10), created_by=son.id),
        
        # Previous Month
        Income(amount=Decimal(150000), category_id=categories["Salary"], description="Dad's Monthly Salary", income_date=date(prev_year, prev_month, 1), created_by=dad.id),
        Income(amount=Decimal(40000), category_id=categories["Freelancing"], description="Mom's Consulting Gig", income_date=date(prev_year, prev_month, 5), created_by=mom.id)
    ]
    db.add_all(income_items)
    db.commit()

    print("Seeding expenses...")
    # Current month expenses
    e1 = Expense(amount=Decimal(25000), category_id=categories["Rent"], description="House Rent", expense_date=date(curr_year, curr_month, 1), created_by=dad.id, payment_method="net_banking")
    e2 = Expense(amount=Decimal(4500), category_id=categories["Electricity"], description="MSEDCL Electricity Bill", expense_date=date(curr_year, curr_month, 3), created_by=dad.id, payment_method="upi")
    e3 = Expense(amount=Decimal(6200), category_id=categories["Groceries"], description="Weekly Groceries - DMart", expense_date=date(curr_year, curr_month, 4), created_by=mom.id, payment_method="card")
    e4 = Expense(amount=Decimal(3200), category_id=categories["Fuel"], description="Car Petrol", expense_date=date(curr_year, curr_month, 7), created_by=dad.id, payment_method="card")
    e5 = Expense(amount=Decimal(1200), category_id=categories["Food"], description="Family Dinner (Spaghetti)", expense_date=date(curr_year, curr_month, 8), created_by=dad.id, payment_method="upi")
    e6 = Expense(amount=Decimal(1500), category_id=categories["Entertainment"], description="Movie tickets + popcorn", expense_date=date(curr_year, curr_month, 10), created_by=son.id, payment_method="upi")
    e7 = Expense(amount=Decimal(4500), category_id=categories["Medical"], description="Dentist Checkup", expense_date=date(curr_year, curr_month, 12), created_by=mom.id, payment_method="card")
    e8 = Expense(amount=Decimal(1000), category_id=categories["Internet"], description="Airtel Fiber Broadband", expense_date=date(curr_year, curr_month, 14), created_by=mom.id, payment_method="upi")
    e9 = Expense(amount=Decimal(8000), category_id=categories["EMI"], description="Car Loan EMI", expense_date=date(curr_year, curr_month, 5), created_by=dad.id, payment_method="net_banking")
    
    # Previous month expenses
    e10 = Expense(amount=Decimal(25000), category_id=categories["Rent"], description="House Rent", expense_date=date(prev_year, prev_month, 1), created_by=dad.id, payment_method="net_banking")
    e11 = Expense(amount=Decimal(3800), category_id=categories["Electricity"], description="MSEDCL Electricity Bill", expense_date=date(prev_year, prev_month, 3), created_by=dad.id, payment_method="upi")
    e12 = Expense(amount=Decimal(5500), category_id=categories["Groceries"], description="Monthly Groceries", expense_date=date(prev_year, prev_month, 5), created_by=mom.id, payment_method="card")
    e13 = Expense(amount=Decimal(4000), category_id=categories["Fuel"], description="Car Petrol", expense_date=date(prev_year, prev_month, 7), created_by=dad.id, payment_method="card")
    e14 = Expense(amount=Decimal(1000), category_id=categories["Food"], description="Dinner at Restaurant", expense_date=date(prev_year, prev_month, 10), created_by=dad.id, payment_method="upi")
    e15 = Expense(amount=Decimal(3000), category_id=categories["Shopping"], description="Rahul Clothes Shopping", expense_date=date(prev_year, prev_month, 15), created_by=mom.id, payment_method="card")
    
    db.add_all([e1, e2, e3, e4, e5, e6, e7, e8, e9, e10, e11, e12, e13, e14, e15])
    db.commit()

    # Re-fetch expenses to get IDs for splits
    print("Seeding splits...")
    # Dad dinner split (e5): Dad 600, Mom 300, Son 300
    s1 = ExpenseSplit(expense_id=e5.id, user_id=dad.id, amount=Decimal(600))
    s2 = ExpenseSplit(expense_id=e5.id, user_id=mom.id, amount=Decimal(300))
    s3 = ExpenseSplit(expense_id=e5.id, user_id=son.id, amount=Decimal(300))
    
    # Groceries (e3) split equally: Dad 2066.66, Mom 2066.67, Son 2066.67
    s4 = ExpenseSplit(expense_id=e3.id, user_id=dad.id, amount=Decimal("2066.66"))
    s5 = ExpenseSplit(expense_id=e3.id, user_id=mom.id, amount=Decimal("2066.67"))
    s6 = ExpenseSplit(expense_id=e3.id, user_id=son.id, amount=Decimal("2066.67"))
    
    # Split everything else equally by default in the DB logic
    # (Just seeding a couple of manual ones for testing display)
    db.add_all([s1, s2, s3, s4, s5, s6])
    db.commit()

    print("Seeding recurring expenses...")
    # Add recurring rent and broadband
    r1 = RecurringExpense(
        amount=Decimal(25000),
        category_id=categories["Rent"],
        description="House Rent",
        frequency="monthly",
        start_date=date(curr_year, curr_month, 1),
        next_due_date=date(curr_year, curr_month, 1) + relativedelta(months=1),
        payment_method="net_banking",
        created_by=dad.id,
        is_active=True
    )
    r2 = RecurringExpense(
        amount=Decimal(1000),
        category_id=categories["Internet"],
        description="Airtel Fiber Broadband",
        frequency="monthly",
        start_date=date(curr_year, curr_month, 14),
        next_due_date=date(curr_year, curr_month, 14) + relativedelta(months=1),
        payment_method="upi",
        created_by=mom.id,
        is_active=True
    )
    db.add_all([r1, r2])
    db.commit()

    print("Database seeding completed successfully!")
    print("\nDefault Accounts Created:")
    print("-------------------------")
    print("1. Admin (Dad): dad@family.com | Password: password123")
    print("2. Member (Mom): mom@family.com | Password: password123")
    print("3. Member (Son): son@family.com | Password: password123")
    db.close()

if __name__ == "__main__":
    seed_db()
