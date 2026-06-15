# Family Expense Tracker

A premium, mobile-first shared family budgeting and expense tracking web application. Designed with a modern **CMYK-inspired glassmorphic aesthetic** (Cyan, Magenta, Yellow, Black) and packed with smart analytics, billing split systems, and offline PWA capability.

---

## Technical Stack
- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, React Router v6, Recharts, React Hook Form
- **Backend**: Python FastAPI, SQLAlchemy, Pydantic v2, PyJWT, Passlib (Bcrypt)
- **Database & Storage**: Supabase Free Tier (PostgreSQL & Supabase Storage)
- **Deployments**: Vercel (Frontend), Render (Backend)

---

## Repository Structure
```
Fam-Tracker/
├── backend/                  # Python FastAPI API Backend
│   ├── app/                  # Application packages
│   │   ├── models.py         # SQLAlchemy schemas
│   │   ├── schemas.py        # Pydantic schemas
│   │   ├── routers/          # API Route controllers
│   │   └── auth_utils.py     # Password & JWT tokens helper
│   ├── requirements.txt      # Python libraries dependencies
│   └── seed.py               # Sample database seeder
├── frontend/                 # React 19 Frontend
│   ├── src/                  # React source files
│   │   ├── components/       # Visual subcomponents
│   │   ├── pages/            # Page routers/screens
│   │   ├── layouts/          # Responsive app shells
│   │   └── hooks/            # Session and authentication contexts
│   └── tailwind.config.js    # Custom CMYK design parameters
├── schema.sql                # Supabase database initialization
└── render.yaml               # Render deploy configuration
```

---

## 1. Database Setup (Supabase)

1. Sign up for a free account at [Supabase](https://supabase.com/).
2. Create a new PostgreSQL project named `Family Expense Tracker`.
3. Go to the **SQL Editor** tab in your Supabase dashboard.
4. Copy the contents of the local [schema.sql](file:///Users/vrund/Desktop/Self%20Learning%2520and%2520Projects/Fam-Tracker/schema.sql) file, paste it into the editor, and click **Run**. This will create the schema and seed standard categories.

---

## 2. Receipt Storage Setup (Supabase)

1. Go to the **Storage** tab in your Supabase dashboard.
2. Click **New Bucket** and name it `receipts`.
3. Ensure the bucket is set to **Public** so that members can view receipt images.

---

## 3. Backend Local Setup

1. Open your terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a python virtual environment and activate it:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create your local environment configuration file:
   ```bash
   cp .env.example .env
   ```
5. Edit `.env` with your credentials:
   - Paste your **PostgreSQL Connection String** into `DATABASE_URL` (retrieve this from Supabase Project Settings -> Database -> Connection string -> URI).
   - Enter your `SUPABASE_URL` and `SUPABASE_KEY` (retrieve these from Project Settings -> API -> Project API Keys).
   - Set a secure `JWT_SECRET`.
6. **Seed Sample Data**: Seed Vikram (Dad), Anjali (Mom), and Rahul (Son) users alongside budget metrics, splits, and incomes:
   ```bash
   python seed.py
   ```
7. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *Access the backend Swagger API docs at `http://localhost:8000/docs`.*

---

## 4. Frontend Local Setup

1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the node packages:
   ```bash
   npm install
   ```
3. Create your local configuration file:
   ```bash
   cp .env.example .env
   ```
   *Default API endpoint is set to `http://localhost:8000`.*
4. Start the Vite server:
   ```bash
   npm run dev
   ```
   *Open the browser link displayed in your terminal (typically `http://localhost:5173`).*

---

## 5. Sample Login Credentials

Use these details to evaluate dashboard charts, reports, splits, and admin privileges:

| Name | Role | Email | Password | Relation |
| :--- | :--- | :--- | :--- | :--- |
| **Dad (Vikram)** | Admin | `dad@family.com` | `password123` | Father |
| **Mom (Anjali)** | Member | `mom@family.com` | `password123` | Mother |
| **Son (Rahul)** | Member | `son@family.com` | `password123` | Son |

---

## 6. Production Deployments

### Backend (Render Free Tier)
1. Commit your repository to GitHub.
2. Link your GitHub account to [Render](https://render.com/).
3. Create a new **Web Service** from Blueprint, linking your repository.
4. Render will parse your `render.yaml` and configure database connection variables. Make sure to input your Supabase credentials in the Render dashboard!

### Frontend (Vercel)
1. Link your repository to [Vercel](https://vercel.com/).
2. Create a new project, selecting the `frontend` folder as the root directory.
3. Configure the environment variable:
   - `VITE_API_URL` = (your deployed Render backend URL)
4. Click **Deploy**. Vercel will build the distribution bundle and deploy the app.
