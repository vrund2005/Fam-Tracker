from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional
from decimal import Decimal
from datetime import date, datetime
from uuid import UUID

# ----------------- TOKEN SCHEMAS -----------------
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[str] = None
    role: Optional[str] = None

# ----------------- USER & MEMBER SCHEMAS -----------------
class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    role: str = Field("member", pattern="^(admin|member)$")
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)
    relation: str = Field("Other", pattern="^(Father|Mother|Son|Daughter|Grandfather|Grandmother|Spouse|Other)$")

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    avatar_url: Optional[str] = None
    role: Optional[str] = Field(None, pattern="^(admin|member)$")
    relation: Optional[str] = Field(None, pattern="^(Father|Mother|Son|Daughter|Grandfather|Grandmother|Spouse|Other)$")

class UserPasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6, max_length=100)

class FamilyMemberOut(BaseModel):
    relation: str
    joined_date: date

    model_config = ConfigDict(from_attributes=True)

class UserOut(BaseModel):
    id: UUID
    name: str
    email: EmailStr
    role: str
    avatar_url: Optional[str] = None
    created_at: datetime
    family_member: Optional[FamilyMemberOut] = None

    model_config = ConfigDict(from_attributes=True)

class FamilyMemberAdminUpdate(BaseModel):
    name: str
    email: EmailStr
    role: str
    relation: str
    avatar_url: Optional[str] = None

# ----------------- CATEGORY SCHEMAS -----------------
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    icon: str = Field("Tag", max_length=100)
    color: str = Field("#00C2FF", min_length=4, max_length=7)
    type: str = Field(..., pattern="^(income|expense)$")

class CategoryCreate(CategoryBase):
    pass

class CategoryOut(CategoryBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- SPLIT SCHEMAS -----------------
class ExpenseSplitBase(BaseModel):
    user_id: UUID
    amount: Decimal = Field(..., ge=0)

class ExpenseSplitCreate(ExpenseSplitBase):
    pass

class ExpenseSplitOut(ExpenseSplitBase):
    id: int
    user_name: Optional[str] = None  # Helper for frontend

    model_config = ConfigDict(from_attributes=True)

# ----------------- EXPENSE SCHEMAS -----------------
class ExpenseBase(BaseModel):
    amount: Decimal = Field(..., gt=0)
    category_id: int
    description: Optional[str] = Field(None, max_length=500)
    expense_date: date = Field(default_factory=date.today)
    payment_method: str = Field("cash", pattern="^(cash|card|upi|net_banking|other)$")
    receipt_image_url: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    splits: Optional[List[ExpenseSplitCreate]] = []

class ExpenseUpdate(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0)
    category_id: Optional[int] = None
    description: Optional[str] = Field(None, max_length=500)
    expense_date: Optional[date] = None
    payment_method: Optional[str] = Field(None, pattern="^(cash|card|upi|net_banking|other)$")
    receipt_image_url: Optional[str] = None
    splits: Optional[List[ExpenseSplitCreate]] = None

class ExpenseOut(ExpenseBase):
    id: int
    created_by: Optional[UUID] = None
    created_at: datetime
    category: Optional[CategoryOut] = None
    creator_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ExpenseWithSplitsOut(ExpenseOut):
    splits: List[ExpenseSplitOut] = []

    model_config = ConfigDict(from_attributes=True)

class PaginatedExpensesOut(BaseModel):
    total: int
    page: int
    limit: int
    items: List[ExpenseWithSplitsOut]

# ----------------- INCOME SCHEMAS -----------------
class IncomeBase(BaseModel):
    amount: Decimal = Field(..., gt=0)
    category_id: int
    description: Optional[str] = Field(None, max_length=500)
    income_date: date = Field(default_factory=date.today)

class IncomeCreate(IncomeBase):
    pass

class IncomeUpdate(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0)
    category_id: Optional[int] = None
    description: Optional[str] = Field(None, max_length=500)
    income_date: Optional[date] = None

class IncomeOut(IncomeBase):
    id: int
    created_by: Optional[UUID] = None
    created_at: datetime
    category: Optional[CategoryOut] = None
    creator_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class PaginatedIncomeOut(BaseModel):
    total: int
    page: int
    limit: int
    items: List[IncomeOut]

# ----------------- BUDGET SCHEMAS -----------------
class BudgetBase(BaseModel):
    category_id: Optional[int] = None  # Null = overall budget
    monthly_limit: Decimal = Field(..., ge=0)
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2020)

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    monthly_limit: Decimal = Field(..., ge=0)

class BudgetOut(BudgetBase):
    id: int
    category: Optional[CategoryOut] = None

    model_config = ConfigDict(from_attributes=True)

# ----------------- NOTIFICATION SCHEMAS -----------------
class NotificationBase(BaseModel):
    title: str
    message: str

class NotificationOut(NotificationBase):
    id: int
    user_id: UUID
    read_status: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- RECURRING EXPENSE SCHEMAS -----------------
class RecurringExpenseBase(BaseModel):
    amount: Decimal = Field(..., gt=0)
    category_id: int
    description: str = Field(..., max_length=500)
    frequency: str = Field(..., pattern="^(daily|weekly|monthly|yearly)$")
    start_date: date = Field(default_factory=date.today)
    payment_method: str = Field("cash", pattern="^(cash|card|upi|net_banking|other)$")

class RecurringExpenseCreate(RecurringExpenseBase):
    pass

class RecurringExpenseUpdate(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0)
    category_id: Optional[int] = None
    description: Optional[str] = Field(None, max_length=500)
    frequency: Optional[str] = Field(None, pattern="^(daily|weekly|monthly|yearly)$")
    payment_method: Optional[str] = Field(None, pattern="^(cash|card|upi|net_banking|other)$")
    is_active: Optional[bool] = None

class RecurringExpenseOut(RecurringExpenseBase):
    id: int
    next_due_date: date
    last_generated_date: Optional[date] = None
    created_by: Optional[UUID] = None
    is_active: bool
    created_at: datetime
    category: Optional[CategoryOut] = None

    model_config = ConfigDict(from_attributes=True)
