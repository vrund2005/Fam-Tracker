-- Family Expense Tracker Database Schema
-- Run this in your Supabase SQL Editor to set up the tables.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    avatar_url VARCHAR(1024),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(100) NOT NULL DEFAULT 'Tag', -- Lucide icon name
    color VARCHAR(7) NOT NULL DEFAULT '#00C2FF', -- Hex color
    type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, type)
);

-- 3. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    category_id INT REFERENCES categories(id) ON DELETE RESTRICT,
    description VARCHAR(500),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'card', 'upi', 'net_banking', 'other')),
    receipt_image_url VARCHAR(1024),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Expense Splits Table (For split tracking bonus feature)
CREATE TABLE IF NOT EXISTS expense_splits (
    id SERIAL PRIMARY KEY,
    expense_id INT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
    UNIQUE(expense_id, user_id)
);

-- 5. Income Table
CREATE TABLE IF NOT EXISTS income (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    category_id INT REFERENCES categories(id) ON DELETE RESTRICT,
    description VARCHAR(500),
    income_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Budgets Table
CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES categories(id) ON DELETE CASCADE, -- Null means total monthly family budget
    monthly_limit DECIMAL(12, 2) NOT NULL CHECK (monthly_limit >= 0),
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL CHECK (year >= 2020),
    UNIQUE(category_id, month, year)
);

-- 7. Family Members Detail Table
CREATE TABLE IF NOT EXISTS family_members (
    id SERIAL PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relation VARCHAR(100) NOT NULL CHECK (relation IN ('Father', 'Mother', 'Son', 'Daughter', 'Grandfather', 'Grandmother', 'Spouse', 'Other')),
    joined_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- 8. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read_status BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Recurring Expenses Table (For recurring expenses bonus feature)
CREATE TABLE IF NOT EXISTS recurring_expenses (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    category_id INT REFERENCES categories(id) ON DELETE RESTRICT,
    description VARCHAR(500) NOT NULL,
    frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    next_due_date DATE NOT NULL,
    last_generated_date DATE,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'card', 'upi', 'net_banking', 'other')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_income_date ON income(income_date);
CREATE INDEX IF NOT EXISTS idx_income_category ON income(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_lookup ON budgets(month, year);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_status);

-- Seed Categories
INSERT INTO categories (name, icon, color, type) VALUES
-- Expense Categories
('Food', 'Utensils', '#FF2D95', 'expense'),
('Groceries', 'ShoppingBag', '#00C2FF', 'expense'),
('Fuel', 'Car', '#FFD60A', 'expense'),
('Electricity', 'Zap', '#FF9500', 'expense'),
('Gas', 'Flame', '#FF3B30', 'expense'),
('Internet', 'Wifi', '#34C759', 'expense'),
('Water', 'Droplet', '#5856D6', 'expense'),
('Rent', 'Home', '#AF52DE', 'expense'),
('EMI', 'CreditCard', '#FF2D95', 'expense'),
('Education', 'BookOpen', '#00C2FF', 'expense'),
('Medical', 'Activity', '#FFD60A', 'expense'),
('Shopping', 'Shirt', '#FF9500', 'expense'),
('Travel', 'Plane', '#FF3B30', 'expense'),
('Entertainment', 'Gamepad2', '#34C759', 'expense'),
('Maintenance', 'Wrench', '#5856D6', 'expense'),
('Pets', 'Dog', '#AF52DE', 'expense'),
('Gifts', 'Gift', '#FF2D95', 'expense'),
('Other', 'HelpCircle', '#8E8E93', 'expense'),

-- Income Categories
('Salary', 'Briefcase', '#34C759', 'income'),
('Freelancing', 'Laptop', '#00C2FF', 'income'),
('Business', 'TrendingUp', '#FF2D95', 'income'),
('Interest', 'Percent', '#FFD60A', 'income'),
('Rent Received', 'Building2', '#FF9500', 'income'),
('Investments', 'BarChart3', '#AF52DE', 'income'),
('Bonus', 'Sparkles', '#5856D6', 'income'),
('Other', 'HelpCircle', '#8E8E93', 'income')
ON CONFLICT (name, type) DO NOTHING;
