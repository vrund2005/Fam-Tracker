import uuid
from sqlalchemy import Column, String, Integer, Numeric, Date, DateTime, Boolean, ForeignKey, UniqueConstraint, Uuid
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="member")  # admin, member
    avatar_url = Column(String(1024), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    family_member = relationship("FamilyMember", back_populates="user", uselist=False, cascade="all, delete-orphan")
    expenses_created = relationship("Expense", back_populates="creator")
    income_created = relationship("Income", back_populates="creator")
    splits = relationship("ExpenseSplit", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    recurring_expenses = relationship("RecurringExpense", back_populates="creator")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    icon = Column(String(100), nullable=False, default="Tag")
    color = Column(String(7), nullable=False, default="#00C2FF")
    type = Column(String(50), nullable=False)  # income, expense
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Unique constraint on name + type
    __table_args__ = (UniqueConstraint("name", "type", name="uq_category_name_type"),)

    # Relationships
    expenses = relationship("Expense", back_populates="category")
    income = relationship("Income", back_populates="category")
    budgets = relationship("Budget", back_populates="category")
    recurring_expenses = relationship("RecurringExpense", back_populates="category")

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False)
    description = Column(String(500), nullable=True)
    expense_date = Column(Date, nullable=False, server_default=func.current_date())
    created_by = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    payment_method = Column(String(50), nullable=False, default="cash")  # cash, card, upi, net_banking, other
    receipt_image_url = Column(String(1024), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    category = relationship("Category", back_populates="expenses")
    creator = relationship("User", back_populates="expenses_created")
    splits = relationship("ExpenseSplit", back_populates="expense", cascade="all, delete-orphan")

class ExpenseSplit(Base):
    __tablename__ = "expense_splits"

    id = Column(Integer, primary_key=True, index=True)
    expense_id = Column(Integer, ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)

    __table_args__ = (UniqueConstraint("expense_id", "user_id", name="uq_expense_user_split"),)

    # Relationships
    expense = relationship("Expense", back_populates="splits")
    user = relationship("User", back_populates="splits")

class Income(Base):
    __tablename__ = "income"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False)
    description = Column(String(500), nullable=True)
    income_date = Column(Date, nullable=False, server_default=func.current_date())
    created_by = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    category = relationship("Category", back_populates="income")
    creator = relationship("User", back_populates="income_created")

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=True)  # Null means overall family budget
    monthly_limit = Column(Numeric(12, 2), nullable=False)
    month = Column(Integer, nullable=False)  # 1-12
    year = Column(Integer, nullable=False)

    __table_args__ = (UniqueConstraint("category_id", "month", "year", name="uq_category_month_year_budget"),)

    # Relationships
    category = relationship("Category", back_populates="budgets")

class FamilyMember(Base):
    __tablename__ = "family_members"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    relation = Column(String(100), nullable=False)  # Father, Mother, Son, Daughter, Grandfather, Grandmother, Spouse, Other
    joined_date = Column(Date, nullable=False, server_default=func.current_date())

    # Relationships
    user = relationship("User", back_populates="family_member")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(String(1000), nullable=False)
    read_status = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="notifications")

class RecurringExpense(Base):
    __tablename__ = "recurring_expenses"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False)
    description = Column(String(500), nullable=False)
    frequency = Column(String(50), nullable=False)  # daily, weekly, monthly, yearly
    start_date = Column(Date, nullable=False, server_default=func.current_date())
    next_due_date = Column(Date, nullable=False)
    last_generated_date = Column(Date, nullable=True)
    payment_method = Column(String(50), nullable=False, default="cash")
    created_by = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    category = relationship("Category", back_populates="recurring_expenses")
    creator = relationship("User", back_populates="recurring_expenses")
