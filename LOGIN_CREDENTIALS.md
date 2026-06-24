# BG Hospitals - Login Credentials

> **Password for ALL accounts:** `admin123`
>
> **Login URL:** http://localhost:3000/login
>
> **API Login:** `POST http://localhost:8000/api/auth/login/`

---

## Admin Accounts

| Email                    | Name               | Access Level     |
|--------------------------|--------------------| -----------------|
| admin@hospital.com       | Super Admin        | Full System      |
| admin2@hospital.com      | Ravi Administrator | Full System      |

**Can access:** Everything - Dashboard, Patients, Doctors, Appointments, Billing, Pharmacy, Lab, Staff, HR, Payroll, Analytics, Finance, Inventory, Blood Bank, Radiology, Emergency, OT, Queue, Discharge, Accounting, Audit Logs

---

## Doctor Accounts

| Email                       | Name           | Specialty    |
|-----------------------------|----------------|--------------|
| doctor@hospital.com         | Doctor         | -            |
| dr.cardio@hospital.com      | Vikram Mehta   | Cardiology   |
| dr.neuro@hospital.com       | Priya Kapoor   | Neurology    |
| dr.ortho@hospital.com       | Suresh Reddy   | Orthopedics  |
| dr.pediatrics@hospital.com  | Ananya Gupta   | Pediatrics   |
| dr.general@hospital.com     | Deepak Singh   | General      |

**Can access:** Doctor Dashboard (4 tabs), Appointments, Patient Records, Prescriptions, Lab Orders, Vitals, Clinical Notes, Available Staff, Schedule, Start/Complete Consultation

---

## Patient Accounts

| Email                       | Name         |
|-----------------------------|--------------|
| patient@hospital.com        | Patient      |
| patient.rahul@hospital.com  | Rahul Verma  |
| patient.meera@hospital.com  | Meera Joshi  |
| patient.amit@hospital.com   | Amit Kumar   |
| patient.sunita@hospital.com | Sunita Devi  |
| patient.arjun@hospital.com  | Arjun Nair   |

**Can access:** Find Doctors, Book Appointment, My Appointments, My Dashboard*, My Records*

*Dashboard and Records unlock after first completed consultation

---

## Staff Accounts

| Email                     | Name           | Role            |
|---------------------------|----------------|-----------------|
| staff@hospital.com        | Staff Manager  | Staff           |
| nurse@hospital.com        | Kavita Sharma  | Head Nurse      |
| receptionist@hospital.com | Pooja Singh    | Receptionist    |
| pharmacist@hospital.com   | Manoj Pandey   | Pharmacist      |
| labtech@hospital.com      | Sanjay Tiwari  | Lab Technician  |
| billing@hospital.com      | Neha Agarwal   | Billing Officer |

**Can access:** Patient Check-in, Patient Management, Billing, Pharmacy, Departments, Bed Management, Staff & HR, Inventory, OPD Queue, Analytics, Finance & Budget

---

## How to Create These Accounts

If the accounts don't exist yet, run:

```bash
python3 manage.py create_role_accounts
```

## How to Set Up Chart of Accounts

```bash
python3 manage.py setup_chart_of_accounts
```

## How to Load Sample Data

```bash
python3 manage.py load_drug_interactions
python3 manage.py load_prescription_templates
```

---

## Google OAuth (Sign in with Google)

Google Sign-In is enabled on the login page. New users who sign in with Google are automatically registered as **patient** role.

---

## Quick Start

```bash
# Terminal 1 - Backend
cd /Users/ganesh/Desktop/healthcare_project
python3 manage.py runserver 8000

# Terminal 2 - Frontend
cd /Users/ganesh/Desktop/healthcare_project/frontend/healthcare-frontend
npm start
```

Open http://localhost:3000 in your browser.
