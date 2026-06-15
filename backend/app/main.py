import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
from app.routers import auth, users, categories, expenses, income, budgets, reports, notifications, recurring, insights

# Create database tables automatically if they don't exist
# This acts as a fallback if the user has not run schema.sql manually on Supabase.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Family Expense Tracker API",
    description="Backend API for the Family Expense Tracker web application",
    version="1.0.0"
)

# CORS Configuration
# Allow local development and wildcard/production domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow any origin for testing
    allow_credentials=False, # We use Bearer tokens in headers, not cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads directory exists
os.makedirs("uploads", exist_ok=True)

# Serve static files for uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(categories.router)
app.include_router(expenses.router)
app.include_router(income.router)
app.include_router(budgets.router)
app.include_router(reports.router)
app.include_router(notifications.router)
app.include_router(recurring.router)
app.include_router(insights.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Welcome to the Family Expense Tracker API. Access /docs for swagger documentation."
    }
