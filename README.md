# Healthcare Management System

A comprehensive, production-grade Hospital Management System built with Django REST Framework (backend) and React (frontend), powered by PostgreSQL.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 5.x, Django REST Framework |
| Frontend | React 18, Bootstrap 5, FontAwesome |
| Database | PostgreSQL 17 |
| Auth | JWT (SimpleJWT) |
| PDF | ReportLab |
| API Docs | Swagger / ReDoc |

---

## Modules (20+)

| Category | Modules |
|---|---|
| Core | Patients, Doctors, Appointments, Users & Auth |
| Clinical | Prescriptions, Vitals & EHR, Clinical Notes, Lab, Radiology, Discharge |
| Emergency | ER Dashboard, Operation Theater, Surgeries, Blood Bank |
| Management | Billing & Payments, Pharmacy, Departments, Bed Management |
| HR & Ops | Staff & Payroll, Inventory & Assets, OPD Queue |
| Analytics | Dashboard, Reports, PDF Generation, Notifications |

---

## Prerequisites

- Python 3.12+
- Node.js 18+
- PostgreSQL 17 (via Homebrew)

---

## Database Setup (Step by Step)

### 1. Install PostgreSQL (if not installed)

```bash
brew install postgresql@17
```

### 2. Start PostgreSQL

```bash
brew services start postgresql@17
```

### 3. Create Database and User

Open the PostgreSQL shell:

```bash
/opt/homebrew/opt/postgresql@17/bin/psql -p 5433 -d postgres
```

Run these SQL commands inside the shell:

```sql
-- Create the database
CREATE DATABASE healthcare_db;

-- Create the user with password
CREATE USER ganesh WITH PASSWORD 'database@123';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE healthcare_db TO ganesh;
ALTER USER ganesh CREATEDB;

-- Connect to the new database
\c healthcare_db

-- Grant schema access
GRANT ALL ON SCHEMA public TO ganesh;

-- Exit
\q
```

### 4. Database Configuration

The config lives in `healthcare_project/settings.py`:

| Setting | Value | Env Variable |
|---|---|---|
| Engine | `django.db.backends.postgresql` | `DB_ENGINE` |
| Database | `healthcare_db` | `DB_NAME` |
| User | `ganesh` | `DB_USER` |
| Password | `database@123` | `DB_PASSWORD` |
| Host | `localhost` | `DB_HOST` |
| Port | `5433` | `DB_PORT` |

All values can be overridden via environment variables for production deployments.

---

## Project Setup

### 1. Clone and Install Backend

```bash
cd healthcare_project

# Create virtual environment
python3 -m venv .venv
source venv_mac/bin/activate

# Install dependencies
pip install django djangorestframework djangorestframework-simplejwt
pip install django-cors-headers django-filter drf-yasg
pip install psycopg2-binary Pillow reportlab
```

### 2. Run Migrations

```bash
python manage.py migrate
```

### 3. Seed Demo Data

```bash
python manage.py seed_data
```

This populates the entire system with 1,000+ realistic records:
- 60 patients, 25 doctors, 10 departments
- 187 beds, 197 appointments, 50 prescriptions
- 80 medicines, 45 lab orders, 55 invoices
- Blood bank, emergency, surgeries, staff, and more

### 4. Install Frontend

```bash
cd frontend/healthcare-frontend
npm install
```

---

## Running the Servers

### Start Backend (Terminal 1)

```bash
source venv_mac/bin/activate
python manage.py runserver
```

Backend runs at: **http://127.0.0.1:8000**

### Start Frontend (Terminal 2)

```bash
cd frontend/healthcare-frontend
npm start
```

Frontend runs at: **http://localhost:3000**

---

## Login Credentials

| Email | Password | Role | Dashboard |
|---|---|---|---|
| `admin@hospital.com` | `admin123` | Admin | Hospital Command Center |
| `doctor@hospital.com` | `admin123` | Doctor | Doctor Workspace |
| `patient@hospital.com` | `admin123` | Patient | Patient Portal |
| `staff@hospital.com` | `admin123` | Staff | Admin Dashboard |

---

## API Documentation

| URL | Description |
|---|---|
| http://127.0.0.1:8000/swagger/ | Swagger UI |
| http://127.0.0.1:8000/redoc/ | ReDoc |
| http://127.0.0.1:8000/admin/ | Django Admin |

---

## Key Features

- **Role-Based Dashboards** -- Admin, Doctor, Patient, Staff each get a tailored dashboard
- **Real-Time Hospital KPIs** -- Bed occupancy, OPD stats, emergency cases, revenue, blood bank levels
- **PDF Reports** -- Download invoices, prescriptions, lab reports, discharge summaries as PDF
- **Automated Workflows** -- Prescription auto-creates pharmacy order, completed appointment auto-generates invoice
- **OPD Queue Management** -- Token system with real-time queue display
- **Blood Bank** -- Donor management, inventory tracking, cross-matching
- **Operation Theater** -- Surgery scheduling, pre-op checklists, post-op notes
- **Emergency Department** -- Triage levels, ambulance dispatch, critical case tracking

---

## Useful Commands

```bash
# Check if PostgreSQL is running
/opt/homebrew/opt/postgresql@17/bin/pg_isready -p 5433

# Connect to the database directly
/opt/homebrew/opt/postgresql@17/bin/psql -p 5433 -d healthcare_db -U ganesh

# Stop PostgreSQL
brew services stop postgresql@17

# Re-seed database (clears all data and repopulates)
python manage.py seed_data

# Switch to SQLite for quick dev (no PostgreSQL needed)
DB_ENGINE=django.db.backends.sqlite3 DB_NAME=db.sqlite3 DB_PORT= DB_USER= DB_PASSWORD= DB_HOST= python manage.py runserver
```
