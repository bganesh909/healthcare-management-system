import random
from datetime import timedelta, time, date
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from users.models import User
from patients.models import Patient
from doctors.models import Doctor, DoctorReview
from departments.models import Department, Ward, Bed
from appointments.models import Appointment, TimeSlot
from prescriptions.models import Prescription, PrescriptionItem, MedicalRecord
from billing.models import Invoice, InvoiceItem, Payment, InsuranceClaim
from pharmacy.models import MedicineCategory, Medicine, MedicineOrder, MedicineOrderItem
from lab.models import LabTestCategory, LabTest, LabOrder, LabOrderItem, LabReport
from vitals.models import VitalSign
from blood_bank.models import BloodDonor, BloodUnit
from staff.models import StaffMember
from emergency.models import EmergencyVisit, Ambulance
from operation_theater.models import OperationTheater, Surgery
from inventory.models import AssetCategory, Asset
from opd_queue.models import QueueEntry
from discharge.models import DischargeSummary
from radiology.models import ImagingType, ImagingOrder
from notifications.models import Notification
from analytics.models import DailyMetrics, DoctorPerformance, PatientActivity
from appointments.models import DoctorLeave


# ---------------------------------------------------------------------------
# Realistic Indian data pools
# ---------------------------------------------------------------------------

INDIAN_MALE_FIRST_NAMES = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh',
    'Ayaan', 'Krishna', 'Ishaan', 'Shaurya', 'Atharva', 'Advait', 'Dhruv',
    'Kabir', 'Ritvik', 'Aarush', 'Kian', 'Darsh', 'Veer', 'Rohan', 'Rahul',
    'Amit', 'Suresh', 'Rajesh', 'Vikram', 'Anand', 'Deepak', 'Manoj', 'Prakash',
    'Sanjay', 'Ravi', 'Kiran', 'Nikhil', 'Harsh', 'Gaurav', 'Pradeep', 'Ajay',
    'Naveen', 'Mohan', 'Ramesh', 'Ganesh', 'Ashok', 'Pankaj', 'Tarun', 'Sachin',
]

INDIAN_FEMALE_FIRST_NAMES = [
    'Aadhya', 'Saanvi', 'Aanya', 'Isha', 'Ananya', 'Diya', 'Priya', 'Shruti',
    'Pooja', 'Neha', 'Anjali', 'Kavya', 'Meera', 'Tanvi', 'Sneha', 'Riya',
    'Simran', 'Nandini', 'Divya', 'Lakshmi', 'Geeta', 'Sunita', 'Rekha', 'Padma',
    'Shalini', 'Swati', 'Rashmi', 'Jyoti', 'Pallavi', 'Manisha',
]

INDIAN_LAST_NAMES = [
    'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Reddy', 'Nair',
    'Iyer', 'Joshi', 'Mishra', 'Rao', 'Chauhan', 'Mehta', 'Agarwal', 'Bose',
    'Das', 'Mukherjee', 'Banerjee', 'Pillai', 'Menon', 'Deshmukh', 'Patil',
    'Kulkarni', 'Deshpande', 'Kaur', 'Malhotra', 'Kapoor', 'Tiwari', 'Saxena',
    'Pandey', 'Dubey', 'Sinha', 'Chaudhary', 'Thakur', 'Bhatt', 'Bhat',
    'Naidu', 'Choudhury', 'Rajan',
]

INDIAN_CITIES = [
    ('Mumbai', 'Maharashtra', '400001'),
    ('Delhi', 'Delhi', '110001'),
    ('Bangalore', 'Karnataka', '560001'),
    ('Hyderabad', 'Telangana', '500001'),
    ('Chennai', 'Tamil Nadu', '600001'),
    ('Kolkata', 'West Bengal', '700001'),
    ('Pune', 'Maharashtra', '411001'),
    ('Ahmedabad', 'Gujarat', '380001'),
    ('Jaipur', 'Rajasthan', '302001'),
    ('Lucknow', 'Uttar Pradesh', '226001'),
    ('Chandigarh', 'Punjab', '160001'),
    ('Bhopal', 'Madhya Pradesh', '462001'),
    ('Kochi', 'Kerala', '682001'),
    ('Indore', 'Madhya Pradesh', '452001'),
    ('Nagpur', 'Maharashtra', '440001'),
]

STREETS = [
    'MG Road', 'Station Road', 'Gandhi Nagar', 'Nehru Street', 'Park Avenue',
    'Ring Road', 'Lake View Colony', 'Sarojini Nagar', 'Civil Lines',
    'Shastri Nagar', 'Rajendra Nagar', 'Lajpat Nagar', 'Model Town',
    'Sector 15', 'Jubilee Hills', 'Banjara Hills', 'Koramangala',
]

BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
BLOOD_GROUP_WEIGHTS = [0.22, 0.06, 0.30, 0.08, 0.07, 0.02, 0.20, 0.05]

ALLERGIES_LIST = [
    'Penicillin', 'Sulfa drugs', 'Aspirin', 'Ibuprofen', 'Dust',
    'Pollen', 'Latex', 'Peanuts', 'Shellfish', 'Dairy', 'None known',
]

MEDICAL_HISTORIES = [
    'No significant past medical history',
    'Hypertension - on medication since 2019',
    'Type 2 Diabetes Mellitus - controlled with Metformin',
    'Asthma - mild intermittent',
    'Hypothyroidism - on Levothyroxine',
    'History of appendectomy (2018)',
    'Migraine - episodic',
    'GERD - on PPI therapy',
    'Chronic lower back pain',
    'History of dengue fever (2020)',
    'No significant history',
    'Iron deficiency anemia - on supplements',
    'History of fracture right arm (2017)',
    'Allergic rhinitis - seasonal',
    'Vitamin D deficiency',
]

DOCTOR_DATA = [
    ('Rajesh', 'Sharma', 'CARDIOLOGY', 'MBBS, MD (Cardiology), DM', 18),
    ('Priya', 'Gupta', 'DERMATOLOGY', 'MBBS, MD (Dermatology)', 12),
    ('Amit', 'Verma', 'ORTHOPEDICS', 'MBBS, MS (Orthopedics)', 15),
    ('Sunita', 'Patel', 'PEDIATRICS', 'MBBS, MD (Pediatrics)', 10),
    ('Vikram', 'Singh', 'NEUROLOGY', 'MBBS, MD (Neurology), DM', 20),
    ('Ananya', 'Reddy', 'GYNECOLOGY', 'MBBS, MS (OBG), DNB', 14),
    ('Deepak', 'Mishra', 'GENERAL', 'MBBS, MD (General Medicine)', 8),
    ('Kavya', 'Nair', 'ENDOCRINOLOGY', 'MBBS, MD, DM (Endocrinology)', 11),
    ('Rohan', 'Joshi', 'GASTROENTEROLOGY', 'MBBS, MD, DM (Gastro)', 13),
    ('Meera', 'Rao', 'ONCOLOGY', 'MBBS, MD (Oncology), DM', 16),
    ('Sanjay', 'Kulkarni', 'ORTHOPEDICS', 'MBBS, DNB (Ortho)', 9),
    ('Tanvi', 'Mehta', 'PSYCHIATRY', 'MBBS, MD (Psychiatry)', 7),
    ('Aditya', 'Das', 'CARDIOLOGY', 'MBBS, MD, DM (Cardiology)', 22),
    ('Neha', 'Kapoor', 'DERMATOLOGY', 'MBBS, DVD, DNB', 6),
    ('Harsh', 'Tiwari', 'GENERAL', 'MBBS, MD (Internal Medicine)', 5),
    ('Divya', 'Pillai', 'PEDIATRICS', 'MBBS, DCH, DNB', 8),
    ('Arjun', 'Chauhan', 'NEUROLOGY', 'MBBS, MD (Neuro)', 10),
    ('Shreya', 'Banerjee', 'GYNECOLOGY', 'MBBS, DGO, MS', 12),
    ('Kiran', 'Deshmukh', 'GENERAL', 'MBBS, FCGP', 25),
    ('Pallavi', 'Saxena', 'ENDOCRINOLOGY', 'MBBS, MD, DM', 9),
    ('Nikhil', 'Bhatt', 'GASTROENTEROLOGY', 'MBBS, MD, DNB', 11),
    ('Riya', 'Mukherjee', 'ONCOLOGY', 'MBBS, MD, DM (Medical Oncology)', 14),
    ('Gaurav', 'Pandey', 'PSYCHIATRY', 'MBBS, MD (Psychiatry), DPM', 8),
    ('Swati', 'Malhotra', 'PEDIATRICS', 'MBBS, MD (Peds), Fellowship Neonatology', 15),
    ('Tarun', 'Naidu', 'ORTHOPEDICS', 'MBBS, MS (Ortho), MCh', 17),
]

DEPARTMENT_DATA = [
    ('General Medicine', 'GEN', 'Ground', 'General outpatient and inpatient care for adults'),
    ('Cardiology', 'CARD', '2', 'Heart and cardiovascular disease management'),
    ('Orthopedics', 'ORTH', '3', 'Bone, joint, and musculoskeletal treatment'),
    ('Pediatrics', 'PED', '1', 'Medical care for infants, children, and adolescents'),
    ('ENT', 'ENT', '2', 'Ear, Nose, and Throat specialist department'),
    ('Ophthalmology', 'OPH', '2', 'Eye care and ophthalmic surgery'),
    ('Neurology', 'NEUR', '3', 'Brain, spinal cord, and nervous system disorders'),
    ('Dermatology', 'DERM', '1', 'Skin, hair, and nail conditions'),
    ('Gynecology', 'GYN', '1', 'Women\'s reproductive health and obstetrics'),
    ('Emergency', 'EMER', 'Ground', 'Emergency and trauma care services'),
]

APPOINTMENT_REASONS = [
    'Routine health check-up', 'Follow-up consultation', 'Persistent headache',
    'Chest pain evaluation', 'Skin rash and itching', 'Joint pain and stiffness',
    'Fever and cold symptoms', 'Abdominal pain', 'Back pain', 'Diabetic review',
    'Blood pressure monitoring', 'Thyroid follow-up', 'Breathing difficulty',
    'Ear pain and discharge', 'Eye examination', 'Child vaccination',
    'Pregnancy check-up', 'Anxiety and stress', 'Weight management',
    'Allergy consultation', 'Dental referral evaluation', 'Pre-surgical assessment',
    'Post-surgical follow-up', 'Lab report review', 'Gastric issues',
    'Urinary tract infection', 'Menstrual irregularities', 'Hair fall consultation',
    'Knee pain', 'Shoulder injury', 'Migraine management', 'Insomnia',
]

DIAGNOSES = [
    'Acute upper respiratory infection', 'Essential hypertension',
    'Type 2 Diabetes Mellitus - uncontrolled', 'Lumbar spondylosis',
    'Allergic rhinitis', 'Viral fever', 'Gastroesophageal reflux disease',
    'Urinary tract infection', 'Iron deficiency anemia', 'Osteoarthritis of knee',
    'Migraine without aura', 'Hypothyroidism', 'Eczema - atopic dermatitis',
    'Acute bronchitis', 'Generalized anxiety disorder', 'Cervical spondylosis',
    'Vitamin D deficiency', 'Acute gastroenteritis', 'Plantar fasciitis',
    'Chronic sinusitis', 'Tension headache', 'Conjunctivitis',
    'Polycystic ovarian syndrome', 'Dengue fever', 'Pneumonia',
]

MEDICINE_CATEGORIES_DATA = [
    ('Antibiotics', 'Medications that fight bacterial infections'),
    ('Pain Relief', 'Analgesics and anti-inflammatory medications'),
    ('Cardiac', 'Cardiovascular medications'),
    ('Diabetes', 'Anti-diabetic medications'),
    ('Respiratory', 'Medications for respiratory conditions'),
    ('Gastrointestinal', 'Medications for digestive system'),
    ('Dermatological', 'Topical and skin medications'),
    ('Neurological', 'Medications for neurological conditions'),
    ('Hormonal', 'Hormonal and endocrine medications'),
    ('Vitamins & Supplements', 'Nutritional supplements'),
    ('Psychiatric', 'Psychiatric and psychotropic medications'),
    ('Antihistamines', 'Allergy and antihistamine medications'),
]

MEDICINES_DATA = [
    # (name, generic_name, category_name, manufacturer, form, strength, price, rx, stock)
    ('Augmentin 625', 'Amoxicillin + Clavulanate', 'Antibiotics', 'GSK India', 'TABLET', '625mg', 28.50, True, 500),
    ('Azithral 500', 'Azithromycin', 'Antibiotics', 'Alembic Pharma', 'TABLET', '500mg', 85.00, True, 300),
    ('Ciprofloxacin 500', 'Ciprofloxacin', 'Antibiotics', 'Cipla', 'TABLET', '500mg', 12.00, True, 400),
    ('Cefixime 200', 'Cefixime', 'Antibiotics', 'Mankind Pharma', 'TABLET', '200mg', 75.00, True, 350),
    ('Metronidazole 400', 'Metronidazole', 'Antibiotics', 'Abbott India', 'TABLET', '400mg', 8.50, True, 600),
    ('Doxycycline 100', 'Doxycycline', 'Antibiotics', 'Sun Pharma', 'CAPSULE', '100mg', 15.00, True, 250),
    ('Amoxicillin 500', 'Amoxicillin', 'Antibiotics', 'Cipla', 'CAPSULE', '500mg', 10.00, True, 800),
    ('Levofloxacin 500', 'Levofloxacin', 'Antibiotics', 'Glenmark', 'TABLET', '500mg', 65.00, True, 200),

    ('Dolo 650', 'Paracetamol', 'Pain Relief', 'Micro Labs', 'TABLET', '650mg', 2.50, False, 2000),
    ('Crocin Advance', 'Paracetamol', 'Pain Relief', 'GSK India', 'TABLET', '500mg', 2.00, False, 1500),
    ('Combiflam', 'Ibuprofen + Paracetamol', 'Pain Relief', 'Sanofi India', 'TABLET', '400mg+325mg', 5.50, False, 1000),
    ('Voveran SR 100', 'Diclofenac', 'Pain Relief', 'Novartis India', 'TABLET', '100mg', 8.00, True, 600),
    ('Brufen 400', 'Ibuprofen', 'Pain Relief', 'Abbott India', 'TABLET', '400mg', 4.50, False, 800),
    ('Ultracet', 'Tramadol + Paracetamol', 'Pain Relief', 'J&J India', 'TABLET', '37.5mg+325mg', 12.00, True, 200),
    ('Flexon MR', 'Ibuprofen + Paracetamol + Chlorzoxazone', 'Pain Relief', 'Aristo Pharma', 'TABLET', '400mg', 6.50, True, 400),

    ('Amlodipine 5', 'Amlodipine', 'Cardiac', 'Cipla', 'TABLET', '5mg', 5.00, True, 700),
    ('Telmisartan 40', 'Telmisartan', 'Cardiac', 'Glenmark', 'TABLET', '40mg', 8.00, True, 500),
    ('Atorvastatin 10', 'Atorvastatin', 'Cardiac', 'Sun Pharma', 'TABLET', '10mg', 7.50, True, 600),
    ('Clopidogrel 75', 'Clopidogrel', 'Cardiac', 'Torrent Pharma', 'TABLET', '75mg', 6.00, True, 400),
    ('Ecosprin 75', 'Aspirin', 'Cardiac', 'USV Ltd', 'TABLET', '75mg', 1.50, True, 1500),
    ('Metoprolol 50', 'Metoprolol', 'Cardiac', 'Cipla', 'TABLET', '50mg', 4.50, True, 300),
    ('Losartan 50', 'Losartan', 'Cardiac', 'Zydus Healthcare', 'TABLET', '50mg', 6.00, True, 400),
    ('Ramipril 5', 'Ramipril', 'Cardiac', 'Sanofi India', 'CAPSULE', '5mg', 9.00, True, 350),

    ('Metformin 500', 'Metformin', 'Diabetes', 'USV Ltd', 'TABLET', '500mg', 3.00, True, 1200),
    ('Glimepiride 2', 'Glimepiride', 'Diabetes', 'Sanofi India', 'TABLET', '2mg', 5.50, True, 500),
    ('Januvia 100', 'Sitagliptin', 'Diabetes', 'MSD India', 'TABLET', '100mg', 55.00, True, 200),
    ('Voglibose 0.3', 'Voglibose', 'Diabetes', 'Ranbaxy', 'TABLET', '0.3mg', 8.00, True, 400),
    ('Insulin Glargine', 'Insulin Glargine', 'Diabetes', 'Sanofi India', 'INJECTION', '100IU/ml', 950.00, True, 100),
    ('Gliclazide 80', 'Gliclazide', 'Diabetes', 'Serdia Pharma', 'TABLET', '80mg', 4.50, True, 350),

    ('Asthalin Inhaler', 'Salbutamol', 'Respiratory', 'Cipla', 'INHALER', '100mcg', 125.00, True, 150),
    ('Budecort Inhaler', 'Budesonide', 'Respiratory', 'Cipla', 'INHALER', '200mcg', 220.00, True, 100),
    ('Montelukast 10', 'Montelukast', 'Respiratory', 'Sun Pharma', 'TABLET', '10mg', 8.00, True, 400),
    ('Cetirizine 10', 'Cetirizine', 'Antihistamines', 'Cipla', 'TABLET', '10mg', 2.00, False, 1000),
    ('Allegra 120', 'Fexofenadine', 'Antihistamines', 'Sanofi India', 'TABLET', '120mg', 12.00, False, 500),
    ('Levocetrizine 5', 'Levocetirizine', 'Antihistamines', 'Glenmark', 'TABLET', '5mg', 3.50, False, 600),
    ('Alex Cough Syrup', 'Dextromethorphan + CPM', 'Respiratory', 'Glenmark', 'SYRUP', '100ml', 75.00, False, 200),

    ('Pan 40', 'Pantoprazole', 'Gastrointestinal', 'Alkem Labs', 'TABLET', '40mg', 6.00, True, 800),
    ('Omeprazole 20', 'Omeprazole', 'Gastrointestinal', 'Dr Reddys', 'CAPSULE', '20mg', 4.50, True, 700),
    ('Domperidone 10', 'Domperidone', 'Gastrointestinal', 'Torrent Pharma', 'TABLET', '10mg', 3.00, True, 500),
    ('Ondansetron 4', 'Ondansetron', 'Gastrointestinal', 'Sun Pharma', 'TABLET', '4mg', 8.50, True, 300),
    ('Rabeprazole 20', 'Rabeprazole', 'Gastrointestinal', 'Cadila Healthcare', 'TABLET', '20mg', 7.00, True, 400),
    ('ORS Sachet', 'Oral Rehydration Salts', 'Gastrointestinal', 'FDC Ltd', 'OTHER', '21.8g', 5.00, False, 1000),
    ('Lactulose Syrup', 'Lactulose', 'Gastrointestinal', 'Abbott India', 'SYRUP', '200ml', 110.00, True, 150),

    ('Betamethasone Cream', 'Betamethasone', 'Dermatological', 'GSK India', 'CREAM', '0.1%', 45.00, True, 200),
    ('Clobetasol Cream', 'Clobetasol', 'Dermatological', 'Glenmark', 'CREAM', '0.05%', 55.00, True, 150),
    ('Clotrimazole Cream', 'Clotrimazole', 'Dermatological', 'Bayer India', 'CREAM', '1%', 35.00, False, 300),
    ('Mupirocin Ointment', 'Mupirocin', 'Dermatological', 'GSK India', 'CREAM', '2%', 120.00, True, 100),

    ('Thyronorm 50', 'Levothyroxine', 'Hormonal', 'Abbott India', 'TABLET', '50mcg', 4.50, True, 500),
    ('Eltroxin 100', 'Levothyroxine', 'Hormonal', 'GSK India', 'TABLET', '100mcg', 5.00, True, 400),

    ('Pregabalin 75', 'Pregabalin', 'Neurological', 'Torrent Pharma', 'CAPSULE', '75mg', 8.00, True, 300),
    ('Gabapentin 300', 'Gabapentin', 'Neurological', 'Sun Pharma', 'CAPSULE', '300mg', 12.00, True, 250),
    ('Sumatriptan 50', 'Sumatriptan', 'Neurological', 'Cipla', 'TABLET', '50mg', 45.00, True, 150),

    ('Sertraline 50', 'Sertraline', 'Psychiatric', 'Sun Pharma', 'TABLET', '50mg', 8.00, True, 200),
    ('Escitalopram 10', 'Escitalopram', 'Psychiatric', 'Cipla', 'TABLET', '10mg', 7.00, True, 250),
    ('Alprazolam 0.5', 'Alprazolam', 'Psychiatric', 'Torrent Pharma', 'TABLET', '0.5mg', 3.50, True, 150),
    ('Clonazepam 0.5', 'Clonazepam', 'Psychiatric', 'Sun Pharma', 'TABLET', '0.5mg', 4.00, True, 200),

    ('Becosules Capsule', 'B-Complex + Vit C', 'Vitamins & Supplements', 'Pfizer', 'CAPSULE', '1 cap', 3.50, False, 1000),
    ('Calcimax 500', 'Calcium + Vitamin D3', 'Vitamins & Supplements', 'Meyer Organics', 'TABLET', '500mg', 8.00, False, 600),
    ('Shelcal 500', 'Calcium Carbonate + D3', 'Vitamins & Supplements', 'Elder Pharma', 'TABLET', '500mg', 7.00, False, 500),
    ('Zincovit', 'Multivitamin + Zinc', 'Vitamins & Supplements', 'Apex Labs', 'TABLET', '1 tab', 5.50, False, 700),
    ('Ferrous Sulphate 200', 'Ferrous Sulphate', 'Vitamins & Supplements', 'GlaxoSmithKline', 'TABLET', '200mg', 2.50, False, 900),
    ('D-Rise 60K', 'Cholecalciferol', 'Vitamins & Supplements', 'USV Ltd', 'CAPSULE', '60000IU', 35.00, True, 400),
    ('Folic Acid 5mg', 'Folic Acid', 'Vitamins & Supplements', 'Abbott India', 'TABLET', '5mg', 2.00, False, 800),

    # Extra to reach 100+
    ('Norfloxacin 400', 'Norfloxacin', 'Antibiotics', 'Cipla', 'TABLET', '400mg', 7.00, True, 300),
    ('Nimesulide 100', 'Nimesulide', 'Pain Relief', 'Panacea Biotec', 'TABLET', '100mg', 3.00, True, 500),
    ('Torsemide 10', 'Torsemide', 'Cardiac', 'Zydus Healthcare', 'TABLET', '10mg', 7.50, True, 200),
    ('Diltiazem 30', 'Diltiazem', 'Cardiac', 'Torrent Pharma', 'TABLET', '30mg', 5.00, True, 250),
    ('Pioglitazone 30', 'Pioglitazone', 'Diabetes', 'Sun Pharma', 'TABLET', '30mg', 6.00, True, 300),
    ('Ranitidine 150', 'Ranitidine', 'Gastrointestinal', 'J B Chemicals', 'TABLET', '150mg', 3.50, False, 500),
    ('Amitriptyline 25', 'Amitriptyline', 'Psychiatric', 'Sun Pharma', 'TABLET', '25mg', 3.00, True, 250),
    ('Hydroxyzine 25', 'Hydroxyzine', 'Antihistamines', 'UCB India', 'TABLET', '25mg', 5.00, True, 200),
    ('Fluconazole 150', 'Fluconazole', 'Antibiotics', 'Cipla', 'CAPSULE', '150mg', 22.00, True, 200),
    ('Acyclovir 400', 'Acyclovir', 'Antibiotics', 'Cipla', 'TABLET', '400mg', 15.00, True, 200),
    ('Sildenafil Citrate 50', 'Sildenafil', 'Other', 'Cipla', 'TABLET', '50mg', 45.00, True, 100),
    ('Minoxidil Solution', 'Minoxidil', 'Dermatological', 'Dr Reddys', 'OTHER', '5%', 500.00, False, 100),
    ('Ketoconazole Shampoo', 'Ketoconazole', 'Dermatological', 'J&J India', 'OTHER', '2%', 180.00, False, 150),
    ('Chloramphenicol Eye Drops', 'Chloramphenicol', 'Antibiotics', 'Cipla', 'DROPS', '0.5%', 20.00, True, 300),
    ('Tobramycin Eye Drops', 'Tobramycin', 'Antibiotics', 'Alcon India', 'DROPS', '0.3%', 65.00, True, 150),
    ('Prednisolone 10', 'Prednisolone', 'Hormonal', 'Cadila Healthcare', 'TABLET', '10mg', 4.00, True, 300),
    ('Dexamethasone 0.5', 'Dexamethasone', 'Hormonal', 'Zydus Healthcare', 'TABLET', '0.5mg', 3.50, True, 250),
]

LAB_TEST_CATEGORIES_DATA = [
    ('Hematology', 'Blood cell counts and related tests'),
    ('Biochemistry', 'Blood chemistry and metabolic panel'),
    ('Microbiology', 'Culture and sensitivity tests'),
    ('Immunology', 'Immune system and antibody tests'),
    ('Endocrinology', 'Hormone level tests'),
    ('Urine Analysis', 'Urine examination tests'),
    ('Coagulation', 'Blood clotting tests'),
    ('Cardiac Markers', 'Heart-related biomarkers'),
]

LAB_TESTS_DATA = [
    # (name, code, category, description, price, normal_range, unit, turnaround, fasting)
    ('Complete Blood Count', 'CBC', 'Hematology', 'Full blood count with differential', 350, '4.5-11.0', '10^3/uL', '2 hours', False),
    ('Hemoglobin', 'HGB', 'Hematology', 'Hemoglobin concentration', 150, '12.0-17.5', 'g/dL', '1 hour', False),
    ('ESR', 'ESR', 'Hematology', 'Erythrocyte sedimentation rate', 100, '0-20', 'mm/hr', '2 hours', False),
    ('Platelet Count', 'PLT', 'Hematology', 'Platelet count', 200, '150-400', '10^3/uL', '2 hours', False),
    ('Peripheral Blood Smear', 'PBS', 'Hematology', 'Microscopic examination of blood', 250, 'Normal morphology', '', '4 hours', False),
    ('Reticulocyte Count', 'RETIC', 'Hematology', 'Immature red blood cell count', 300, '0.5-2.5', '%', '3 hours', False),

    ('Fasting Blood Sugar', 'FBS', 'Biochemistry', 'Fasting glucose level', 100, '70-100', 'mg/dL', '2 hours', True),
    ('Post Prandial Blood Sugar', 'PPBS', 'Biochemistry', 'Post-meal glucose', 100, '< 140', 'mg/dL', '2 hours', False),
    ('HbA1c', 'HBA1C', 'Biochemistry', 'Glycated hemoglobin', 500, '4.0-5.6', '%', '4 hours', False),
    ('Lipid Profile', 'LIPID', 'Biochemistry', 'Total cholesterol, HDL, LDL, triglycerides', 600, 'TC < 200', 'mg/dL', '4 hours', True),
    ('Liver Function Test', 'LFT', 'Biochemistry', 'ALT, AST, ALP, bilirubin, albumin, total protein', 500, 'Variable', '', '4 hours', True),
    ('Kidney Function Test', 'KFT', 'Biochemistry', 'Creatinine, BUN, uric acid, electrolytes', 500, 'Variable', '', '4 hours', True),
    ('Serum Creatinine', 'CREAT', 'Biochemistry', 'Kidney function marker', 200, '0.7-1.3', 'mg/dL', '2 hours', False),
    ('Blood Urea Nitrogen', 'BUN', 'Biochemistry', 'Kidney waste product', 150, '7-20', 'mg/dL', '2 hours', False),
    ('Serum Uric Acid', 'URIC', 'Biochemistry', 'Uric acid level', 200, '3.5-7.2', 'mg/dL', '2 hours', True),
    ('Serum Electrolytes', 'ELEC', 'Biochemistry', 'Na, K, Cl, HCO3', 400, 'Variable', 'mEq/L', '2 hours', False),
    ('Serum Calcium', 'CA', 'Biochemistry', 'Calcium level', 200, '8.5-10.5', 'mg/dL', '2 hours', False),
    ('Serum Iron', 'IRON', 'Biochemistry', 'Iron level and TIBC', 350, '60-170', 'ug/dL', '3 hours', True),

    ('Blood Culture', 'BCULT', 'Microbiology', 'Bacterial culture from blood', 800, 'No growth', '', '48-72 hours', False),
    ('Urine Culture', 'UCULT', 'Microbiology', 'Bacterial culture from urine', 500, 'No growth', '', '24-48 hours', False),
    ('Throat Swab Culture', 'TCULT', 'Microbiology', 'Throat bacterial culture', 400, 'No growth', '', '24-48 hours', False),

    ('CRP', 'CRP', 'Immunology', 'C-Reactive protein', 350, '< 10', 'mg/L', '3 hours', False),
    ('RF Factor', 'RF', 'Immunology', 'Rheumatoid factor', 400, '< 14', 'IU/mL', '4 hours', False),
    ('ANA', 'ANA', 'Immunology', 'Anti-nuclear antibodies', 800, 'Negative', '', '1 day', False),
    ('HIV ELISA', 'HIV', 'Immunology', 'HIV screening test', 500, 'Non-reactive', '', '1 day', False),
    ('HBsAg', 'HBSAG', 'Immunology', 'Hepatitis B surface antigen', 400, 'Negative', '', '4 hours', False),
    ('Dengue NS1', 'DNS1', 'Immunology', 'Dengue NS1 antigen', 600, 'Negative', '', '4 hours', False),

    ('Thyroid Profile', 'THYROID', 'Endocrinology', 'T3, T4, TSH', 600, 'TSH 0.4-4.0', 'mIU/L', '4 hours', False),
    ('TSH', 'TSH', 'Endocrinology', 'Thyroid stimulating hormone', 300, '0.4-4.0', 'mIU/L', '3 hours', False),
    ('Vitamin D', 'VITD', 'Endocrinology', '25-OH Vitamin D', 800, '30-100', 'ng/mL', '1 day', False),
    ('Vitamin B12', 'VITB12', 'Endocrinology', 'Serum Vitamin B12', 700, '200-900', 'pg/mL', '1 day', False),

    ('Urine Routine', 'URINE', 'Urine Analysis', 'Complete urine examination', 150, 'Normal', '', '2 hours', False),
    ('Urine Microalbumin', 'UALB', 'Urine Analysis', 'Urine albumin', 400, '< 30', 'mg/L', '4 hours', False),

    ('PT/INR', 'PTINR', 'Coagulation', 'Prothrombin time', 350, '11-13.5 / 0.8-1.2', 'sec / ratio', '2 hours', False),
    ('APTT', 'APTT', 'Coagulation', 'Activated partial thromboplastin time', 350, '25-35', 'seconds', '2 hours', False),
    ('D-Dimer', 'DDIMER', 'Coagulation', 'Fibrin degradation product', 600, '< 500', 'ng/mL', '3 hours', False),

    ('Troponin I', 'TROP', 'Cardiac Markers', 'Cardiac troponin I', 800, '< 0.04', 'ng/mL', '2 hours', False),
    ('BNP', 'BNP', 'Cardiac Markers', 'Brain natriuretic peptide', 1200, '< 100', 'pg/mL', '3 hours', False),
    ('CPK-MB', 'CPKMB', 'Cardiac Markers', 'Creatine phosphokinase MB', 500, '< 25', 'U/L', '2 hours', False),
]

IMAGING_TYPES_DATA = [
    ('X-Ray', 'XRAY', 1500, 'No special preparation needed', '30 minutes', False),
    ('CT Scan', 'CT', 5000, 'Remove metal objects. Fasting 4 hours if contrast needed.', '1 hour', False),
    ('CT Scan with Contrast', 'CTCON', 8000, 'Fasting 4 hours. Check renal function.', '1.5 hours', True),
    ('MRI', 'MRI', 8000, 'Remove all metal objects. No claustrophobia.', '1.5 hours', False),
    ('MRI with Contrast', 'MRICON', 12000, 'Remove metal objects. Fasting 4 hours.', '2 hours', True),
    ('Ultrasound', 'USG', 1500, 'Full bladder for pelvic scan. Fasting for abdomen.', '30 minutes', False),
    ('Echocardiography', 'ECHO', 2500, 'No special preparation', '45 minutes', False),
    ('Doppler Ultrasound', 'DOPP', 2000, 'No special preparation', '45 minutes', False),
    ('Digital Mammography', 'MAMMO', 3000, 'Avoid deodorant/powder on chest', '30 minutes', False),
    ('DEXA Scan', 'DEXA', 2500, 'No calcium supplements for 24 hours', '20 minutes', False),
    ('Fluoroscopy', 'FLUORO', 3500, 'Varies by procedure', '1 hour', True),
    ('PET-CT', 'PETCT', 25000, 'Fasting 6 hours. Avoid strenuous activity.', '3 hours', True),
]

BODY_PARTS = [
    'Chest', 'Abdomen', 'Pelvis', 'Head', 'Cervical Spine', 'Lumbar Spine',
    'Right Knee', 'Left Knee', 'Right Shoulder', 'Left Hip', 'Right Hand',
    'Both Kidneys', 'Liver', 'Thyroid', 'Brain', 'Heart',
]

WARD_DATA = [
    # (name, dept_name, ward_type, floor, total_beds)
    ('General Ward A', 'General Medicine', 'GENERAL', 'Ground', 20),
    ('General Ward B', 'General Medicine', 'GENERAL', 'Ground', 20),
    ('Cardiac Ward', 'Cardiology', 'SEMI_PRIVATE', '2', 15),
    ('Cardiac ICU', 'Cardiology', 'ICU', '2', 8),
    ('Orthopedic Ward', 'Orthopedics', 'GENERAL', '3', 18),
    ('Pediatric Ward', 'Pediatrics', 'SEMI_PRIVATE', '1', 15),
    ('NICU', 'Pediatrics', 'NICU', '1', 6),
    ('Neurology Ward', 'Neurology', 'SEMI_PRIVATE', '3', 12),
    ('Gynecology Ward', 'Gynecology', 'PRIVATE', '1', 12),
    ('Private Suite A', 'General Medicine', 'PRIVATE', '4', 10),
    ('Private Suite B', 'Cardiology', 'PRIVATE', '4', 8),
    ('Emergency Ward', 'Emergency', 'EMERGENCY', 'Ground', 15),
    ('Surgical ICU', 'General Medicine', 'ICU', '3', 10),
    ('Dermatology Daycare', 'Dermatology', 'GENERAL', '1', 8),
    ('ENT Ward', 'ENT', 'SEMI_PRIVATE', '2', 10),
]


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def random_indian_address():
    city, state, pin = random.choice(INDIAN_CITIES)
    house = random.randint(1, 500)
    street = random.choice(STREETS)
    return f"{house}, {street}, {city}, {state} - {pin}"


def random_phone():
    return f"+91{random.randint(7000000000, 9999999999)}"


def random_date_in_range(start_days_ago, end_days_ago=0):
    now = timezone.now().date()
    start = now - timedelta(days=start_days_ago)
    end = now - timedelta(days=end_days_ago)
    delta = (end - start).days
    if delta <= 0:
        return end
    return start + timedelta(days=random.randint(0, delta))


def random_time_slot(start_hour=8, end_hour=17):
    hour = random.randint(start_hour, end_hour - 1)
    minute = random.choice([0, 15, 30, 45])
    return time(hour, minute)


class Command(BaseCommand):
    help = 'Populate the Healthcare Management System with realistic demo data'

    @transaction.atomic
    def handle(self, *args, **options):
        # Disconnect ALL signals to avoid conflicts during seeding
        from django.db.models.signals import post_save, pre_save, post_delete
        from appointments.signals import appointment_workflow, track_status_change
        from prescriptions.signals import create_pharmacy_order_from_prescription
        from users.signals import (
            create_or_update_doctor_user, create_or_update_patient_user,
            disconnect_doctor_user, disconnect_patient_user,
        )
        from appointments.models import Appointment as ApptModel
        from prescriptions.models import Prescription as RxModel

        pre_save.disconnect(track_status_change, sender=ApptModel)
        post_save.disconnect(appointment_workflow, sender=ApptModel)
        post_save.disconnect(create_pharmacy_order_from_prescription, sender=RxModel)
        post_save.disconnect(create_or_update_doctor_user, sender=Doctor)
        post_save.disconnect(create_or_update_patient_user, sender=Patient)
        post_delete.disconnect(disconnect_doctor_user, sender=Doctor)
        post_delete.disconnect(disconnect_patient_user, sender=Patient)

        self.stdout.write(self.style.WARNING('Clearing existing data...'))
        self._clear_data()

        self.stdout.write(self.style.NOTICE('Creating users...'))
        users = self._create_users()

        self.stdout.write(self.style.NOTICE('Creating patients...'))
        patients = self._create_patients()

        self.stdout.write(self.style.NOTICE('Creating doctors...'))
        doctors = self._create_doctors()

        # Link user profiles
        users['doctor_user'].doctor_profile = doctors[0]
        users['doctor_user'].save()
        users['patient_user'].patient_profile = patients[0]
        users['patient_user'].save()

        self.stdout.write(self.style.NOTICE('Creating departments...'))
        departments = self._create_departments(doctors)

        self.stdout.write(self.style.NOTICE('Creating wards and beds...'))
        wards, beds = self._create_wards_and_beds(departments, patients)

        self.stdout.write(self.style.NOTICE('Creating time slots...'))
        self._create_time_slots(doctors)

        self.stdout.write(self.style.NOTICE('Creating appointments...'))
        appointments = self._create_appointments(patients, doctors)

        self.stdout.write(self.style.NOTICE('Creating prescriptions...'))
        self._create_prescriptions(appointments, patients, doctors)

        self.stdout.write(self.style.NOTICE('Creating medicine categories and medicines...'))
        self._create_medicines()

        self.stdout.write(self.style.NOTICE('Creating invoices and payments...'))
        self._create_invoices(appointments, patients)

        self.stdout.write(self.style.NOTICE('Creating lab tests and orders...'))
        self._create_lab_data(patients, doctors, appointments)

        self.stdout.write(self.style.NOTICE('Creating vitals...'))
        self._create_vitals(patients, doctors, appointments)

        self.stdout.write(self.style.NOTICE('Creating blood bank data...'))
        self._create_blood_bank_data()

        self.stdout.write(self.style.NOTICE('Creating staff members...'))
        staff_members = self._create_staff(departments, users)

        self.stdout.write(self.style.NOTICE('Creating emergency data...'))
        self._create_emergency_data(patients, doctors)

        self.stdout.write(self.style.NOTICE('Creating operation theater data...'))
        self._create_ot_data(patients, doctors)

        self.stdout.write(self.style.NOTICE('Creating assets...'))
        self._create_assets(departments)

        self.stdout.write(self.style.NOTICE('Creating imaging data...'))
        self._create_imaging_data(patients, doctors, appointments)

        self.stdout.write(self.style.NOTICE('Creating OPD queue...'))
        self._create_queue_entries(patients, doctors, departments, appointments)

        self.stdout.write(self.style.NOTICE('Creating discharge summaries...'))
        self._create_discharge_summaries(patients, doctors, appointments)

        self.stdout.write(self.style.NOTICE('Creating notifications...'))
        self._create_notifications(users)

        self.stdout.write(self.style.NOTICE('Creating analytics data...'))
        self._create_analytics(doctors)

        # Reconnect all signals
        pre_save.connect(track_status_change, sender=ApptModel)
        post_save.connect(appointment_workflow, sender=ApptModel)
        post_save.connect(create_pharmacy_order_from_prescription, sender=RxModel)
        post_save.connect(create_or_update_doctor_user, sender=Doctor)
        post_save.connect(create_or_update_patient_user, sender=Patient)
        post_delete.connect(disconnect_doctor_user, sender=Doctor)
        post_delete.connect(disconnect_patient_user, sender=Patient)

        self.stdout.write(self.style.SUCCESS(
            '\nSeed data created successfully!\n'
            'Login credentials:\n'
            '  Admin:   admin@hospital.com / admin123\n'
            '  Doctor:  doctor@hospital.com / admin123\n'
            '  Patient: patient@hospital.com / admin123\n'
            '  Staff:   staff@hospital.com / admin123'
        ))

    # ------------------------------------------------------------------
    def _clear_data(self):
        """Remove all existing demo data using TRUNCATE CASCADE for PostgreSQL."""
        from django.db import connection

        if connection.vendor == 'postgresql':
            with connection.cursor() as cursor:
                cursor.execute("""
                    DO $$
                    DECLARE r RECORD;
                    BEGIN
                        FOR r IN (SELECT tablename FROM pg_tables
                                  WHERE schemaname = 'public'
                                  AND tablename NOT LIKE 'django_migrations') LOOP
                            EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
                        END LOOP;
                    END $$;
                """)
        else:
            # SQLite fallback
            User.objects.all().update(doctor_profile=None, patient_profile=None)
            models_to_clear = [
                PatientActivity, DoctorPerformance, DailyMetrics,
                Notification, DischargeSummary,
                QueueEntry, Asset, AssetCategory, Surgery, OperationTheater,
                Ambulance, EmergencyVisit, StaffMember,
                BloodUnit, BloodDonor, VitalSign,
                LabReport, LabOrderItem, LabOrder, LabTest, LabTestCategory,
                MedicineOrderItem, MedicineOrder, Medicine, MedicineCategory,
                InsuranceClaim, Payment, InvoiceItem, Invoice,
                MedicalRecord, PrescriptionItem, Prescription,
                DoctorLeave, TimeSlot, Appointment,
                ImagingOrder, ImagingType,
                Bed, Ward, Department,
                DoctorReview, Doctor, Patient, User,
            ]
            for model in models_to_clear:
                model.objects.all().delete()

    # ------------------------------------------------------------------
    def _create_users(self):
        admin_user = User.objects.create_superuser(
            email='admin@hospital.com',
            password='admin123',
            first_name='Admin',
            last_name='User',
        )
        doctor_user = User.objects.create_user(
            email='doctor@hospital.com',
            password='admin123',
            first_name='Rajesh',
            last_name='Sharma',
            role='doctor',
        )
        patient_user = User.objects.create_user(
            email='patient@hospital.com',
            password='admin123',
            first_name='Aarav',
            last_name='Patel',
            role='patient',
        )
        staff_user = User.objects.create_user(
            email='staff@hospital.com',
            password='admin123',
            first_name='Staff',
            last_name='User',
            role='staff',
        )
        return {
            'admin_user': admin_user,
            'doctor_user': doctor_user,
            'patient_user': patient_user,
            'staff_user': staff_user,
        }

    # ------------------------------------------------------------------
    def _create_patients(self):
        patients = []
        used_emails = set()
        for i in range(60):
            gender = random.choice(['M', 'F'])
            if gender == 'M':
                first = random.choice(INDIAN_MALE_FIRST_NAMES)
            else:
                first = random.choice(INDIAN_FEMALE_FIRST_NAMES)
            last = random.choice(INDIAN_LAST_NAMES)
            email_base = f"{first.lower()}.{last.lower()}{i}"
            email = f"{email_base}@email.com"
            while email in used_emails:
                email = f"{email_base}{random.randint(100,999)}@email.com"
            used_emails.add(email)

            bg = random.choices(BLOOD_GROUPS, weights=BLOOD_GROUP_WEIGHTS, k=1)[0]
            p = Patient.objects.create(
                first_name=first,
                last_name=last,
                date_of_birth=random_date_in_range(365 * 70, 365 * 5),
                gender=gender,
                phone_number=random_phone(),
                email=email,
                address=random_indian_address(),
                medical_history=random.choice(MEDICAL_HISTORIES),
                blood_group=bg,
                allergies=random.choice(ALLERGIES_LIST),
                emergency_contact_name=f"{random.choice(INDIAN_MALE_FIRST_NAMES)} {last}",
                emergency_contact_number=random_phone(),
            )
            patients.append(p)
        self.stdout.write(f'  Created {len(patients)} patients')
        return patients

    # ------------------------------------------------------------------
    def _create_doctors(self):
        doctors = []
        for i, (first, last, spec, qual, exp) in enumerate(DOCTOR_DATA):
            fee = Decimal(str(random.randint(300, 1500)))
            days = ','.join(random.sample(
                ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                k=random.randint(4, 6),
            ))
            start_h = random.choice([8, 9, 10])
            end_h = start_h + random.randint(6, 8)
            d = Doctor.objects.create(
                first_name=first,
                last_name=last,
                specialization=spec,
                license_number=f"MCI-{50000 + i:06d}",
                phone_number=random_phone(),
                email=f"dr.{first.lower()}.{last.lower()}@hospital.com",
                qualification=qual,
                experience_years=exp,
                bio=f"Dr. {first} {last} is a highly experienced {spec.lower().replace('_', ' ')} specialist with {exp} years of practice.",
                consultation_fee=fee,
                available_days=days,
                available_hours_start=time(start_h, 0),
                available_hours_end=time(min(end_h, 20), 0),
            )
            doctors.append(d)
        self.stdout.write(f'  Created {len(doctors)} doctors')
        return doctors

    # ------------------------------------------------------------------
    def _create_departments(self, doctors):
        departments = {}
        spec_to_dept = {
            'GENERAL': 'General Medicine',
            'CARDIOLOGY': 'Cardiology',
            'ORTHOPEDICS': 'Orthopedics',
            'PEDIATRICS': 'Pediatrics',
            'NEUROLOGY': 'Neurology',
            'DERMATOLOGY': 'Dermatology',
            'GYNECOLOGY': 'Gynecology',
        }
        # Map doctors to departments for head assignment
        dept_head_map = {}
        for doc in doctors:
            dept_name = spec_to_dept.get(doc.specialization)
            if dept_name and dept_name not in dept_head_map:
                dept_head_map[dept_name] = doc

        for name, code, floor, desc in DEPARTMENT_DATA:
            dept = Department.objects.create(
                name=name,
                code=code,
                description=desc,
                head_doctor=dept_head_map.get(name),
                phone_extension=str(random.randint(1000, 9999)),
                email=f"{code.lower()}@hospital.com",
                floor=floor,
                is_active=True,
            )
            departments[name] = dept
        self.stdout.write(f'  Created {len(departments)} departments')
        return departments

    # ------------------------------------------------------------------
    def _create_wards_and_beds(self, departments, patients):
        wards = []
        all_beds = []
        bed_rates = {
            'GENERAL': Decimal('800'),
            'SEMI_PRIVATE': Decimal('2000'),
            'PRIVATE': Decimal('5000'),
            'ICU': Decimal('8000'),
            'NICU': Decimal('10000'),
            'EMERGENCY': Decimal('3000'),
            'OPERATION_THEATER': Decimal('15000'),
        }
        for name, dept_name, ward_type, floor, total_beds in WARD_DATA:
            dept = departments.get(dept_name)
            if not dept:
                continue
            ward = Ward.objects.create(
                name=name,
                department=dept,
                ward_type=ward_type,
                floor=floor,
                total_beds=total_beds,
                is_active=True,
            )
            wards.append(ward)

            rate = bed_rates.get(ward_type, Decimal('1000'))
            for b in range(1, total_beds + 1):
                status = random.choices(
                    ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED'],
                    weights=[0.55, 0.30, 0.05, 0.10],
                    k=1,
                )[0]
                pat = None
                adm_date = None
                exp_disc = None
                if status == 'OCCUPIED':
                    pat = random.choice(patients)
                    adm_date = timezone.now() - timedelta(days=random.randint(1, 14))
                    exp_disc = (timezone.now() + timedelta(days=random.randint(1, 10))).date()

                bed = Bed.objects.create(
                    bed_number=f"{ward.name[:3].upper()}-{b:03d}",
                    ward=ward,
                    status=status,
                    patient=pat,
                    admission_date=adm_date,
                    expected_discharge=exp_disc,
                    daily_rate=rate,
                )
                all_beds.append(bed)

        self.stdout.write(f'  Created {len(wards)} wards with {len(all_beds)} beds')
        return wards, all_beds

    # ------------------------------------------------------------------
    def _create_time_slots(self, doctors):
        count = 0
        for doc in doctors:
            for day in range(6):  # Mon-Sat
                ts = TimeSlot.objects.create(
                    doctor=doc,
                    day_of_week=day,
                    start_time=doc.available_hours_start,
                    end_time=doc.available_hours_end,
                    slot_duration=30,
                    max_patients=1,
                    is_active=True,
                )
                count += 1
        self.stdout.write(f'  Created {count} time slots')

    # ------------------------------------------------------------------
    def _create_appointments(self, patients, doctors):
        appointments = []
        now = timezone.now()
        today = now.date()
        used_slots = set()
        token_counter = {}

        for _ in range(200):
            doc = random.choice(doctors)
            pat = random.choice(patients)

            # Decide if past or future
            if random.random() < 0.75:
                days_offset = random.randint(1, 30)
                appt_date = today - timedelta(days=days_offset)
                status = random.choices(
                    ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
                    weights=[0.70, 0.15, 0.15],
                    k=1,
                )[0]
            else:
                days_offset = random.randint(0, 7)
                appt_date = today + timedelta(days=days_offset)
                status = 'SCHEDULED'

            hour = random.randint(
                doc.available_hours_start.hour,
                max(doc.available_hours_start.hour, doc.available_hours_end.hour - 1),
            )
            minute = random.choice([0, 30])
            appt_time = time(hour, minute)

            slot_key = (doc.id, appt_date, appt_time)
            if slot_key in used_slots:
                continue
            used_slots.add(slot_key)

            # Token number for the date
            date_key = appt_date.isoformat()
            token_counter.setdefault(date_key, 0)
            token_counter[date_key] += 1
            token = token_counter[date_key]

            check_in = None
            check_out = None
            if status == 'COMPLETED':
                check_in = timezone.make_aware(
                    timezone.datetime.combine(appt_date, appt_time)
                ) - timedelta(minutes=random.randint(5, 30))
                check_out = check_in + timedelta(minutes=random.randint(15, 45))

            appt = Appointment.objects.create(
                patient=pat,
                doctor=doc,
                appointment_date=appt_date,
                appointment_time=appt_time,
                reason=random.choice(APPOINTMENT_REASONS),
                status=status,
                notes=random.choice(['', 'Patient was referred by GP', 'Follow-up needed', 'First visit']),
                check_in_time=check_in,
                check_out_time=check_out,
                token_number=token,
                is_walk_in=random.random() < 0.2,
            )
            appointments.append(appt)

        self.stdout.write(f'  Created {len(appointments)} appointments')
        return appointments

    # ------------------------------------------------------------------
    def _create_prescriptions(self, appointments, patients, doctors):
        completed = [a for a in appointments if a.status == 'COMPLETED']
        count = 0
        medicines_list = [
            ('Paracetamol', '650mg', 'Three times daily', '5 days', 'Take after meals'),
            ('Amoxicillin', '500mg', 'Twice daily', '7 days', 'Take with water'),
            ('Omeprazole', '20mg', 'Once daily before breakfast', '14 days', 'Take on empty stomach'),
            ('Cetirizine', '10mg', 'Once daily at bedtime', '10 days', 'May cause drowsiness'),
            ('Metformin', '500mg', 'Twice daily', '30 days', 'Take with meals'),
            ('Amlodipine', '5mg', 'Once daily', '30 days', 'Monitor blood pressure'),
            ('Azithromycin', '500mg', 'Once daily', '3 days', 'Take 1 hour before meals'),
            ('Montelukast', '10mg', 'Once daily at bedtime', '15 days', ''),
            ('Pantoprazole', '40mg', 'Once daily before breakfast', '14 days', 'Take 30 min before food'),
            ('Ibuprofen', '400mg', 'Three times daily', '5 days', 'Take after meals. Avoid on empty stomach.'),
            ('Atorvastatin', '10mg', 'Once daily at bedtime', '30 days', 'Avoid grapefruit'),
            ('Levothyroxine', '50mcg', 'Once daily empty stomach', '30 days', 'Take 30 min before breakfast'),
            ('Diclofenac', '50mg', 'Twice daily', '5 days', 'Take after meals'),
            ('Vitamin D3', '60000IU', 'Once weekly', '8 weeks', 'Take with fatty meal'),
            ('Calcium + D3', '500mg', 'Twice daily', '30 days', 'Take after meals'),
        ]

        for appt in completed[:50]:
            diagnosis = random.choice(DIAGNOSES)
            presc = Prescription.objects.create(
                appointment=appt,
                patient=appt.patient,
                doctor=appt.doctor,
                diagnosis=diagnosis,
                notes=random.choice([
                    'Review after 1 week', 'Get lab tests done', 'Increase fluid intake',
                    'Rest for 3 days', 'Avoid spicy food', '', '',
                ]),
                follow_up_date=appt.appointment_date + timedelta(days=random.randint(7, 30)),
            )

            num_items = random.randint(2, 5)
            chosen_meds = random.sample(medicines_list, min(num_items, len(medicines_list)))
            for med_name, dosage, freq, dur, instr in chosen_meds:
                PrescriptionItem.objects.create(
                    prescription=presc,
                    medicine_name=med_name,
                    dosage=dosage,
                    frequency=freq,
                    duration=dur,
                    instructions=instr,
                )
            count += 1

        self.stdout.write(f'  Created {count} prescriptions')

    # ------------------------------------------------------------------
    def _create_medicines(self):
        categories = {}
        for name, desc in MEDICINE_CATEGORIES_DATA:
            cat = MedicineCategory.objects.create(name=name, description=desc)
            categories[name] = cat

        med_count = 0
        for data in MEDICINES_DATA:
            name, generic, cat_name, mfr, form, strength, price, rx, stock = data
            cat = categories.get(cat_name)
            Medicine.objects.create(
                name=name,
                generic_name=generic,
                category=cat,
                manufacturer=mfr,
                form=form,
                strength=strength,
                unit_price=Decimal(str(price)),
                stock_quantity=stock,
                reorder_level=max(10, stock // 10),
                expiry_date=timezone.now().date() + timedelta(days=random.randint(90, 730)),
                requires_prescription=rx,
                is_active=True,
            )
            med_count += 1

        self.stdout.write(f'  Created {len(categories)} medicine categories and {med_count} medicines')

    # ------------------------------------------------------------------
    def _create_invoices(self, appointments, patients):
        completed = [a for a in appointments if a.status == 'COMPLETED']
        inv_count = 0
        pay_count = 0

        for appt in completed[:55]:
            inv = Invoice(
                patient=appt.patient,
                appointment=appt,
                due_date=appt.appointment_date + timedelta(days=30),
                notes='Auto-generated invoice',
            )
            inv.save()  # auto-generates invoice_number

            # Create items
            consultation_fee = appt.doctor.consultation_fee
            InvoiceItem.objects.create(
                invoice=inv,
                description=f'Consultation with Dr. {appt.doctor.last_name}',
                item_type='CONSULTATION',
                quantity=1,
                unit_price=consultation_fee,
                total_price=consultation_fee,
            )
            subtotal = consultation_fee

            if random.random() < 0.4:
                lab_price = Decimal(str(random.choice([350, 500, 600, 800])))
                InvoiceItem.objects.create(
                    invoice=inv,
                    description='Laboratory Tests',
                    item_type='LAB_TEST',
                    quantity=1,
                    unit_price=lab_price,
                    total_price=lab_price,
                )
                subtotal += lab_price

            if random.random() < 0.5:
                med_price = Decimal(str(random.randint(100, 500)))
                InvoiceItem.objects.create(
                    invoice=inv,
                    description='Prescribed Medications',
                    item_type='MEDICATION',
                    quantity=1,
                    unit_price=med_price,
                    total_price=med_price,
                )
                subtotal += med_price

            tax_pct = Decimal('5.00')
            tax_amt = (subtotal * tax_pct / 100).quantize(Decimal('0.01'))
            total = subtotal + tax_amt

            inv.subtotal = subtotal
            inv.tax_percentage = tax_pct
            inv.tax_amount = tax_amt
            inv.total_amount = total
            inv.save()

            # Create payments
            pay_status = random.choices(
                ['PAID', 'PARTIALLY_PAID', 'PENDING'],
                weights=[0.60, 0.20, 0.20],
                k=1,
            )[0]

            if pay_status == 'PAID':
                Payment.objects.create(
                    invoice=inv,
                    payment_method=random.choice(['CASH', 'UPI', 'CREDIT_CARD', 'DEBIT_CARD']),
                    amount=total,
                    transaction_id=f"TXN{random.randint(100000, 999999)}",
                )
                pay_count += 1
            elif pay_status == 'PARTIALLY_PAID':
                partial = (total * Decimal(str(random.randint(30, 70))) / 100).quantize(Decimal('0.01'))
                Payment.objects.create(
                    invoice=inv,
                    payment_method=random.choice(['CASH', 'UPI']),
                    amount=partial,
                    transaction_id=f"TXN{random.randint(100000, 999999)}",
                )
                pay_count += 1
            # PENDING: no payment created

            inv_count += 1

        self.stdout.write(f'  Created {inv_count} invoices with {pay_count} payments')

    # ------------------------------------------------------------------
    def _create_lab_data(self, patients, doctors, appointments):
        # Categories
        categories = {}
        for name, desc in LAB_TEST_CATEGORIES_DATA:
            cat = LabTestCategory.objects.create(name=name, description=desc)
            categories[name] = cat

        # Tests
        tests = []
        for data in LAB_TESTS_DATA:
            name, code, cat_name, desc, price, nr, unit, tat, fasting = data
            t = LabTest.objects.create(
                name=name,
                code=code,
                category=categories.get(cat_name),
                description=desc,
                price=Decimal(str(price)),
                normal_range=nr,
                unit=unit,
                turnaround_time=tat,
                requires_fasting=fasting,
                is_active=True,
            )
            tests.append(t)

        self.stdout.write(f'  Created {len(categories)} lab categories and {len(tests)} lab tests')

        # Lab orders
        completed_appts = [a for a in appointments if a.status == 'COMPLETED']
        order_count = 0
        for _ in range(45):
            pat = random.choice(patients)
            doc = random.choice(doctors)
            appt = random.choice(completed_appts) if random.random() < 0.5 else None

            order = LabOrder(
                patient=pat,
                doctor=doc,
                appointment=appt,
                status=random.choice(['ORDERED', 'SAMPLE_COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'COMPLETED']),
                priority=random.choices(['ROUTINE', 'URGENT', 'STAT'], weights=[0.7, 0.2, 0.1], k=1)[0],
                clinical_notes=random.choice(['Routine check', 'Pre-op evaluation', 'Follow-up', 'Suspected infection', '']),
            )
            order.save()  # auto-generates order_number

            # Items
            selected_tests = random.sample(tests, min(random.randint(1, 4), len(tests)))
            total = Decimal('0')
            for test in selected_tests:
                is_completed = order.status == 'COMPLETED'
                result_val = None
                result_unit = None
                is_abnormal = False
                completed_at = None

                if is_completed and test.normal_range:
                    result_val = str(round(random.uniform(0.5, 200), 1))
                    result_unit = test.unit
                    is_abnormal = random.random() < 0.15
                    completed_at = timezone.now() - timedelta(hours=random.randint(1, 48))

                LabOrderItem.objects.create(
                    lab_order=order,
                    test=test,
                    status='COMPLETED' if is_completed else 'PENDING',
                    result_value=result_val,
                    result_unit=result_unit,
                    is_abnormal=is_abnormal,
                    remarks='Slightly elevated' if is_abnormal else '',
                    completed_at=completed_at,
                )
                total += test.price

            order.total_amount = total
            order.save(update_fields=['total_amount'])
            order_count += 1

        self.stdout.write(f'  Created {order_count} lab orders')

    # ------------------------------------------------------------------
    def _create_vitals(self, patients, doctors, appointments):
        completed_appts = [a for a in appointments if a.status == 'COMPLETED']
        count = 0
        for appt in completed_appts[:60]:
            VitalSign.objects.create(
                patient=appt.patient,
                recorded_by=appt.doctor,
                appointment=appt,
                temperature=Decimal(str(round(random.uniform(97.0, 100.4), 1))),
                blood_pressure_systolic=random.randint(100, 160),
                blood_pressure_diastolic=random.randint(60, 100),
                pulse_rate=random.randint(60, 100),
                respiratory_rate=random.randint(14, 22),
                oxygen_saturation=Decimal(str(round(random.uniform(94.0, 100.0), 1))),
                weight=Decimal(str(round(random.uniform(45.0, 100.0), 1))),
                height=Decimal(str(round(random.uniform(150.0, 185.0), 1))),
                blood_sugar=Decimal(str(round(random.uniform(70.0, 200.0), 1))),
                notes=random.choice(['', 'Vitals normal', 'Elevated BP noted', 'Mild fever']),
            )
            count += 1
        self.stdout.write(f'  Created {count} vital sign records')

    # ------------------------------------------------------------------
    def _create_blood_bank_data(self):
        donors = []
        for i in range(15):
            gender = random.choice(['M', 'F'])
            first = random.choice(
                INDIAN_MALE_FIRST_NAMES if gender == 'M' else INDIAN_FEMALE_FIRST_NAMES
            )
            last = random.choice(INDIAN_LAST_NAMES)
            bg = random.choices(BLOOD_GROUPS, weights=BLOOD_GROUP_WEIGHTS, k=1)[0]
            donor = BloodDonor.objects.create(
                first_name=first,
                last_name=last,
                blood_group=bg,
                date_of_birth=random_date_in_range(365 * 55, 365 * 18),
                gender=gender,
                phone_number=random_phone(),
                email=f"donor.{first.lower()}.{last.lower()}{i}@email.com",
                address=random_indian_address(),
                last_donation_date=random_date_in_range(180, 0) if random.random() < 0.7 else None,
                total_donations=random.randint(0, 15),
                is_eligible=random.random() < 0.85,
                medical_notes=random.choice(['', 'Regular donor', 'Deferred once for low Hb', '']),
            )
            donors.append(donor)

        # Blood units
        components = ['WHOLE_BLOOD', 'PACKED_RBC', 'PLATELETS', 'FRESH_FROZEN_PLASMA', 'CRYOPRECIPITATE']
        statuses = ['AVAILABLE', 'RESERVED', 'ISSUED', 'TESTING']
        unit_count = 0
        for i in range(35):
            donor = random.choice(donors) if random.random() < 0.8 else None
            bg = donor.blood_group if donor else random.choices(BLOOD_GROUPS, weights=BLOOD_GROUP_WEIGHTS, k=1)[0]
            collection = timezone.now().date() - timedelta(days=random.randint(1, 30))
            component = random.choice(components)
            shelf_life = {'WHOLE_BLOOD': 35, 'PACKED_RBC': 42, 'PLATELETS': 5, 'FRESH_FROZEN_PLASMA': 365, 'CRYOPRECIPITATE': 365}
            expiry = collection + timedelta(days=shelf_life.get(component, 35))

            BloodUnit.objects.create(
                unit_number=f"BU-{100000 + i:06d}",
                donor=donor,
                blood_group=bg,
                component_type=component,
                collection_date=collection,
                expiry_date=expiry,
                volume_ml=random.choice([200, 250, 300, 350, 450]),
                status=random.choice(statuses),
                storage_location=f"Fridge-{random.choice(['A', 'B', 'C'])}-Shelf-{random.randint(1, 5)}",
                tested_by=f"Tech. {random.choice(INDIAN_LAST_NAMES)}" if random.random() < 0.8 else '',
                is_tested=random.random() < 0.85,
                test_results='All negative - safe for transfusion' if random.random() < 0.85 else 'Pending',
            )
            unit_count += 1

        self.stdout.write(f'  Created {len(donors)} blood donors and {unit_count} blood units')

    # ------------------------------------------------------------------
    def _create_staff(self, departments, users):
        staff_data = [
            ('NURSE', 'Priya', 'Kumari', 'GNM Nursing', 'MORNING', 35000),
            ('NURSE', 'Anita', 'Devi', 'B.Sc Nursing', 'AFTERNOON', 38000),
            ('NURSE', 'Sunita', 'Yadav', 'GNM Nursing', 'NIGHT', 35000),
            ('NURSE', 'Kavita', 'Singh', 'M.Sc Nursing', 'MORNING', 42000),
            ('NURSE', 'Rekha', 'Sharma', 'B.Sc Nursing', 'AFTERNOON', 38000),
            ('NURSE', 'Mamta', 'Gupta', 'GNM Nursing', 'NIGHT', 35000),
            ('TECHNICIAN', 'Ajay', 'Kumar', 'B.Sc MLT', 'GENERAL', 30000),
            ('TECHNICIAN', 'Ravi', 'Prasad', 'DMLT', 'MORNING', 25000),
            ('LAB_TECHNICIAN', 'Sunil', 'Verma', 'B.Sc MLT', 'GENERAL', 32000),
            ('LAB_TECHNICIAN', 'Manoj', 'Tiwari', 'DMLT', 'MORNING', 28000),
            ('RECEPTIONIST', 'Shweta', 'Mishra', 'BBA', 'GENERAL', 22000),
            ('RECEPTIONIST', 'Neelam', 'Jha', 'B.Com', 'GENERAL', 20000),
            ('PHARMACIST', 'Vinod', 'Pandey', 'B.Pharm', 'GENERAL', 35000),
            ('PHARMACIST', 'Arun', 'Mehta', 'D.Pharm', 'MORNING', 28000),
            ('WARD_BOY', 'Ramesh', 'Paswan', '10th Pass', 'ROTATING', 18000),
            ('WARD_BOY', 'Dinesh', 'Pal', '12th Pass', 'ROTATING', 18000),
            ('SECURITY', 'Balram', 'Yadav', 'Ex-Army', 'NIGHT', 20000),
            ('SECURITY', 'Sukhdev', 'Singh', '12th Pass', 'MORNING', 18000),
            ('HOUSEKEEPING', 'Kamla', 'Devi', '8th Pass', 'MORNING', 15000),
            ('ADMIN_STAFF', 'Alok', 'Srivastava', 'MBA Hospital Admin', 'GENERAL', 45000),
            ('OTHER', 'Prem', 'Chand', 'ITI Electrical', 'GENERAL', 22000),
            ('TECHNICIAN', 'Rajiv', 'Saxena', 'B.Sc Radiology', 'GENERAL', 30000),
        ]

        staff_members = []
        dept_list = list(departments.values())
        for i, (role, first, last, qual, shift, salary) in enumerate(staff_data):
            # Create a user for each staff member
            staff_email = f"staff.{first.lower()}.{last.lower()}@hospital.com"
            user = User.objects.create_user(
                email=staff_email,
                password='admin123',
                first_name=first,
                last_name=last,
                role='staff',
            )
            sm = StaffMember.objects.create(
                user=user,
                employee_id=f"EMP-{10001 + i:05d}",
                first_name=first,
                last_name=last,
                role=role,
                department=random.choice(dept_list),
                phone_number=random_phone(),
                email=staff_email,
                date_of_joining=random_date_in_range(365 * 8, 30),
                qualification=qual,
                current_shift=shift,
                salary=Decimal(str(salary)),
                is_active=True,
                address=random_indian_address(),
                emergency_contact_name=f"{random.choice(INDIAN_MALE_FIRST_NAMES)} {last}",
                emergency_contact_number=random_phone(),
            )
            staff_members.append(sm)

        self.stdout.write(f'  Created {len(staff_members)} staff members')
        return staff_members

    # ------------------------------------------------------------------
    def _create_emergency_data(self, patients, doctors):
        # Ambulances
        ambulances = []
        amb_data = [
            ('KA-01-EM-1234', 'BASIC', 'Raju Driver', 'Mohan Paramedic'),
            ('KA-01-EM-5678', 'ADVANCED', 'Suresh Naik', 'Priya Nurse'),
            ('MH-02-EM-9012', 'CARDIAC', 'Vijay Yadav', 'Amit Paramedic'),
            ('DL-03-EM-3456', 'BASIC', 'Ramesh Chauhan', 'Rekha Nurse'),
            ('TN-04-EM-7890', 'NEONATAL', 'Kumar Pillai', 'Dr. Meena'),
        ]
        for vnum, atype, driver, paramedic in amb_data:
            amb = Ambulance.objects.create(
                vehicle_number=vnum,
                ambulance_type=atype,
                driver_name=driver,
                driver_phone=random_phone(),
                paramedic_name=paramedic,
                status=random.choice(['AVAILABLE', 'AVAILABLE', 'ON_CALL', 'RETURNING']),
                current_location=random.choice(['Hospital Campus', 'MG Road Area', 'City Center', 'Highway Junction']),
                is_active=True,
            )
            ambulances.append(amb)
        self.stdout.write(f'  Created {len(ambulances)} ambulances')

        # Emergency visits
        complaints = [
            'Severe chest pain radiating to left arm',
            'Road traffic accident - multiple injuries',
            'High fever with convulsions in child',
            'Acute abdominal pain',
            'Severe breathlessness',
            'Fall from height - suspected fractures',
            'Snake bite on right foot',
            'Drug overdose',
            'Severe allergic reaction - anaphylaxis',
            'Head injury with loss of consciousness',
            'Severe burns on upper limbs',
            'Diabetic ketoacidosis',
            'Stroke symptoms - sudden weakness',
            'Acute asthma attack',
        ]
        ev_count = 0
        for _ in range(12):
            pat = random.choice(patients)
            triage = random.choices([1, 2, 3, 4, 5], weights=[0.05, 0.15, 0.30, 0.30, 0.20], k=1)[0]
            arrival = timezone.now() - timedelta(hours=random.randint(1, 72))
            status = random.choice(['WAITING', 'TRIAGED', 'IN_TREATMENT', 'DISCHARGED', 'ADMITTED'])

            ev = EmergencyVisit(
                patient=pat,
                triage_level=triage,
                chief_complaint=random.choice(complaints),
                arrival_mode=random.choice(['AMBULANCE', 'WALK_IN', 'REFERRED', 'POLICE']),
                arrival_time=arrival,
                status=status,
                attending_doctor=random.choice(doctors) if status != 'WAITING' else None,
                is_critical=triage <= 2,
            )
            ev.save()  # auto-generates visit_number
            ev_count += 1

        self.stdout.write(f'  Created {ev_count} emergency visits')

    # ------------------------------------------------------------------
    def _create_ot_data(self, patients, doctors):
        ot_data = [
            ('Operation Theater 1', 'OT-01', '3', 'MAJOR', 'Anesthesia machine, Defibrillator, Cautery, Suction'),
            ('Operation Theater 2', 'OT-02', '3', 'MAJOR', 'Anesthesia machine, Laparoscopic tower, Cautery'),
            ('Minor OT', 'OT-03', '2', 'MINOR', 'Basic surgical instruments, Local anesthesia setup'),
            ('Cardiac OT', 'OT-04', '2', 'CARDIAC', 'Heart-lung machine, IABP, TEE, Defibrillator'),
            ('Emergency OT', 'OT-05', 'Ground', 'EMERGENCY', 'Full surgical setup, Ventilator, Rapid infuser'),
        ]
        theaters = []
        for name, code, floor, ot_type, equip in ot_data:
            ot = OperationTheater.objects.create(
                name=name,
                code=code,
                floor=floor,
                theater_type=ot_type,
                status='AVAILABLE',
                equipment_list=equip,
                is_active=True,
            )
            theaters.append(ot)

        # Surgeries
        procedures = [
            ('Appendectomy', 'Acute appendicitis', 'GENERAL', 60),
            ('Total Knee Replacement', 'Severe osteoarthritis of knee', 'GENERAL', 180),
            ('Laparoscopic Cholecystectomy', 'Cholelithiasis', 'GENERAL', 90),
            ('Coronary Artery Bypass Graft', 'Triple vessel coronary artery disease', 'GENERAL', 300),
            ('Hernia Repair', 'Inguinal hernia', 'LOCAL', 60),
            ('Cesarean Section', 'Previous LSCS with CPD', 'SPINAL', 45),
            ('Cataract Surgery', 'Senile cataract', 'LOCAL', 30),
            ('Lumbar Discectomy', 'Prolapsed intervertebral disc L4-L5', 'GENERAL', 120),
            ('Thyroidectomy', 'Multinodular goiter', 'GENERAL', 120),
            ('Tonsillectomy', 'Chronic tonsillitis', 'GENERAL', 45),
        ]

        surg_count = 0
        for proc_name, diag, anesthesia, duration in procedures:
            pat = random.choice(patients)
            doc = random.choice(doctors)
            ot = random.choice(theaters)
            scheduled = timezone.now() - timedelta(days=random.randint(-7, 20))
            status = 'COMPLETED' if scheduled < timezone.now() else 'SCHEDULED'

            surg = Surgery(
                patient=pat,
                primary_surgeon=doc,
                operation_theater=ot,
                surgery_type=random.choice(['ELECTIVE', 'EMERGENCY', 'DAY_CASE']),
                procedure_name=proc_name,
                diagnosis=diag,
                scheduled_date=scheduled,
                status=status,
                anesthesia_type=anesthesia,
                estimated_duration=duration,
            )
            surg.save()  # auto-generates surgery_number
            surg_count += 1

        self.stdout.write(f'  Created {len(theaters)} operation theaters and {surg_count} surgeries')

    # ------------------------------------------------------------------
    def _create_assets(self, departments):
        cat_data = [
            ('Medical Equipment', 'Clinical and diagnostic medical equipment'),
            ('IT Hardware', 'Computers, servers, networking equipment'),
            ('Furniture', 'Hospital beds, chairs, tables, cabinets'),
            ('Surgical Instruments', 'Instruments used in surgeries'),
            ('Diagnostic Equipment', 'Imaging and lab diagnostic equipment'),
            ('Vehicles', 'Ambulances and hospital vehicles'),
        ]
        categories = {}
        for name, desc in cat_data:
            cat = AssetCategory.objects.create(name=name, description=desc)
            categories[name] = cat

        assets_data = [
            ('Ventilator', 'Medical Equipment', 'EQUIPMENT', 'Draeger', 'Savina 300', 1500000),
            ('Patient Monitor', 'Medical Equipment', 'EQUIPMENT', 'Philips', 'MX800', 800000),
            ('Defibrillator', 'Medical Equipment', 'EQUIPMENT', 'Zoll', 'R Series', 600000),
            ('Infusion Pump', 'Medical Equipment', 'EQUIPMENT', 'B. Braun', 'Infusomat', 150000),
            ('ECG Machine', 'Medical Equipment', 'EQUIPMENT', 'BPL', 'Cardiart 8108', 200000),
            ('Ultrasound Machine', 'Diagnostic Equipment', 'EQUIPMENT', 'GE Healthcare', 'Voluson E10', 3500000),
            ('X-Ray Machine', 'Diagnostic Equipment', 'EQUIPMENT', 'Siemens', 'Ysio Max', 5000000),
            ('CT Scanner', 'Diagnostic Equipment', 'EQUIPMENT', 'GE Healthcare', 'Revolution CT', 25000000),
            ('MRI Machine', 'Diagnostic Equipment', 'EQUIPMENT', 'Siemens', 'Magnetom Sola', 50000000),
            ('Blood Gas Analyzer', 'Diagnostic Equipment', 'EQUIPMENT', 'Radiometer', 'ABL90', 1200000),
            ('Autoclave', 'Medical Equipment', 'EQUIPMENT', 'Tuttnauer', '3870EA', 300000),
            ('Surgical Table', 'Surgical Instruments', 'EQUIPMENT', 'Maquet', 'Magnus', 2000000),
            ('Surgical Light', 'Surgical Instruments', 'EQUIPMENT', 'Dr. Mach', 'LED 5', 500000),
            ('Anesthesia Machine', 'Surgical Instruments', 'EQUIPMENT', 'Draeger', 'Fabius GS', 2500000),
            ('Pulse Oximeter', 'Medical Equipment', 'EQUIPMENT', 'Nellcor', 'PM10N', 25000),
            ('Syringe Pump', 'Medical Equipment', 'EQUIPMENT', 'B. Braun', 'Perfusor Space', 80000),
            ('Desktop Computer', 'IT Hardware', 'IT_HARDWARE', 'HP', 'ProDesk 400 G7', 55000),
            ('Laptop', 'IT Hardware', 'IT_HARDWARE', 'Dell', 'Latitude 5520', 75000),
            ('Printer', 'IT Hardware', 'IT_HARDWARE', 'HP', 'LaserJet Pro M404', 25000),
            ('Network Switch', 'IT Hardware', 'IT_HARDWARE', 'Cisco', 'Catalyst 2960', 45000),
            ('Server', 'IT Hardware', 'IT_HARDWARE', 'Dell', 'PowerEdge R740', 500000),
            ('Hospital Bed Manual', 'Furniture', 'FURNITURE', 'Stryker', 'Secure II', 80000),
            ('Hospital Bed Electric', 'Furniture', 'FURNITURE', 'Hill-Rom', 'Centrella', 250000),
            ('ICU Bed', 'Furniture', 'FURNITURE', 'Stryker', 'InTouch', 500000),
            ('Wheelchair', 'Furniture', 'FURNITURE', 'Karma', 'KM-2500', 15000),
            ('Stretcher', 'Furniture', 'FURNITURE', 'Stryker', 'Prime Series', 120000),
            ('OT Table', 'Surgical Instruments', 'EQUIPMENT', 'Schaerer', 'Axis 800', 3000000),
            ('Nebulizer', 'Medical Equipment', 'EQUIPMENT', 'Omron', 'NE-C28', 3000),
            ('BP Monitor Digital', 'Medical Equipment', 'EQUIPMENT', 'Omron', 'HEM-7120', 2000),
            ('Glucometer', 'Medical Equipment', 'EQUIPMENT', 'Accu-Chek', 'Active', 1500),
            ('Suction Machine', 'Medical Equipment', 'EQUIPMENT', 'Medela', 'Dominant Flex', 80000),
            ('Oxygen Concentrator', 'Medical Equipment', 'EQUIPMENT', 'Philips', 'EverFlo', 70000),
        ]

        dept_list = list(departments.values())
        conditions = ['EXCELLENT', 'GOOD', 'GOOD', 'FAIR']
        asset_count = 0
        for name, cat_name, atype, mfr, model, price in assets_data:
            cat = categories.get(cat_name, list(categories.values())[0])
            asset = Asset(
                name=name,
                category=cat,
                asset_type=atype,
                manufacturer=mfr,
                model_number=model,
                serial_number=f"SN-{random.randint(100000, 999999)}",
                purchase_date=random_date_in_range(365 * 5, 30),
                purchase_price=Decimal(str(price)),
                warranty_expiry=timezone.now().date() + timedelta(days=random.randint(30, 1095)),
                department=random.choice(dept_list),
                location=f"Floor {random.choice(['Ground', '1', '2', '3', '4'])}, Room {random.randint(101, 450)}",
                status='ACTIVE',
                condition=random.choice(conditions),
            )
            asset.save()  # auto-generates asset_tag
            asset_count += 1

        self.stdout.write(f'  Created {len(categories)} asset categories and {asset_count} assets')

    # ------------------------------------------------------------------
    def _create_imaging_data(self, patients, doctors, appointments):
        imaging_types = []
        for name, code, price, prep, tat, contrast in IMAGING_TYPES_DATA:
            it = ImagingType.objects.create(
                name=name,
                code=code,
                description=f'{name} imaging study',
                base_price=Decimal(str(price)),
                preparation_instructions=prep,
                turnaround_time=tat,
                requires_contrast=contrast,
                is_active=True,
            )
            imaging_types.append(it)

        indications = [
            'Rule out fracture', 'Chronic pain evaluation', 'Pre-operative assessment',
            'Follow-up study', 'Suspected mass', 'Screening', 'Trauma evaluation',
            'Persistent symptoms despite treatment', 'Post-surgical evaluation',
            'Rule out metastasis', 'Cardiac evaluation', 'Suspected infection',
        ]

        order_count = 0
        for _ in range(25):
            img_type = random.choice(imaging_types)
            pat = random.choice(patients)
            doc = random.choice(doctors)
            appt = random.choice(appointments) if random.random() < 0.4 else None

            order = ImagingOrder(
                patient=pat,
                doctor=doc,
                appointment=appt,
                imaging_type=img_type,
                body_part=random.choice(BODY_PARTS),
                priority=random.choices(['ROUTINE', 'URGENT', 'STAT'], weights=[0.7, 0.2, 0.1], k=1)[0],
                status=random.choice(['ORDERED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'COMPLETED']),
                scheduled_date=timezone.now() + timedelta(hours=random.randint(-72, 72)),
                clinical_indication=random.choice(indications),
                price=img_type.base_price,
            )
            order.save()  # auto-generates order_number
            order_count += 1

        self.stdout.write(f'  Created {len(imaging_types)} imaging types and {order_count} imaging orders')

    # ------------------------------------------------------------------
    def _create_queue_entries(self, patients, doctors, departments, appointments):
        today_appts = [a for a in appointments if a.appointment_date == timezone.now().date() and a.status == 'SCHEDULED']
        dept_list = list(departments.values())
        count = 0

        # Create entries for today's scheduled appointments
        for i, appt in enumerate(today_appts[:15]):
            entry = QueueEntry(
                patient=appt.patient,
                doctor=appt.doctor,
                department=random.choice(dept_list),
                appointment=appt,
                queue_type='APPOINTMENT',
                status=random.choices(
                    ['WAITING', 'IN_CONSULTATION', 'COMPLETED'],
                    weights=[0.5, 0.2, 0.3],
                    k=1,
                )[0],
                priority='NORMAL',
                estimated_wait_minutes=random.randint(5, 60),
                position=i + 1,
            )
            entry.save()  # auto-generates token_number
            count += 1

        # Add some walk-ins
        for i in range(5):
            entry = QueueEntry(
                patient=random.choice(patients),
                doctor=random.choice(doctors),
                department=random.choice(dept_list),
                queue_type='WALK_IN',
                status='WAITING',
                priority=random.choice(['NORMAL', 'HIGH']),
                estimated_wait_minutes=random.randint(15, 90),
                position=count + i + 1,
            )
            entry.save()
            count += 1

        self.stdout.write(f'  Created {count} queue entries for today')

    # ------------------------------------------------------------------
    def _create_discharge_summaries(self, patients, doctors, appointments):
        completed = [a for a in appointments if a.status == 'COMPLETED']
        count = 0
        treatments = [
            'IV antibiotics, oral medications, supportive care',
            'Surgical intervention followed by post-op care and physiotherapy',
            'Conservative management with medications and bed rest',
            'Chemotherapy regimen completed successfully',
            'Cardiac catheterization and stenting',
            'IV fluids, antipyretics, and monitoring',
            'Nebulization, bronchodilators, and steroids',
            'Insulin therapy optimization and diet counseling',
        ]
        conditions = [
            'Stable, afebrile, vitals within normal limits',
            'Improved, tolerating oral feeds well',
            'Good condition, wound healing satisfactory',
            'Stable, pain controlled, ambulating independently',
            'Fair condition, needs continued home care',
        ]

        for appt in completed[:14]:
            admission = appt.appointment_date - timedelta(days=random.randint(1, 7))
            discharge_date = appt.appointment_date + timedelta(days=random.randint(0, 3))
            ds = DischargeSummary(
                patient=appt.patient,
                doctor=appt.doctor,
                appointment=appt,
                admission_date=admission,
                discharge_date=discharge_date,
                discharge_type='NORMAL',
                admission_diagnosis=random.choice(DIAGNOSES),
                discharge_diagnosis=random.choice(DIAGNOSES),
                treatment_given=random.choice(treatments),
                condition_at_discharge=random.choice(conditions),
                medications_on_discharge='Tab. Paracetamol 650mg TDS x 5 days\nTab. Omeprazole 20mg OD x 14 days',
                follow_up_instructions='Follow up after 1 week with reports',
                follow_up_date=discharge_date + timedelta(days=random.randint(7, 21)),
                status=random.choice(['DRAFT', 'COMPLETED', 'APPROVED']),
            )
            ds.save()  # auto-generates summary_number
            count += 1

        self.stdout.write(f'  Created {count} discharge summaries')

    # ------------------------------------------------------------------
    def _create_notifications(self, users):
        all_users = list(User.objects.all()[:10])
        notif_data = [
            ('APPOINTMENT_REMINDER', 'Appointment Reminder', 'Your appointment with Dr. Sharma is scheduled for tomorrow at 10:00 AM', 'MEDIUM'),
            ('APPOINTMENT_CONFIRMED', 'Appointment Confirmed', 'Your appointment has been confirmed for 15th June 2026', 'MEDIUM'),
            ('PRESCRIPTION_READY', 'Prescription Ready', 'Your prescription is ready for pickup at the pharmacy', 'HIGH'),
            ('LAB_RESULT_READY', 'Lab Results Available', 'Your CBC test results are now available. Please check your reports.', 'HIGH'),
            ('PAYMENT_DUE', 'Payment Reminder', 'Invoice INV-000012 of Rs. 2,500 is due for payment', 'HIGH'),
            ('PAYMENT_RECEIVED', 'Payment Confirmed', 'We have received your payment of Rs. 1,500. Thank you!', 'LOW'),
            ('GENERAL', 'Hospital Announcement', 'Free health check-up camp this Saturday from 9 AM to 1 PM', 'LOW'),
            ('SYSTEM', 'System Maintenance', 'System will be under maintenance on Sunday 2 AM - 5 AM', 'MEDIUM'),
            ('APPOINTMENT_CANCELLED', 'Appointment Cancelled', 'Your appointment on 20th June has been cancelled. Please reschedule.', 'HIGH'),
            ('GENERAL', 'New Department', 'We are proud to announce our new Oncology department with state-of-the-art facilities', 'LOW'),
            ('LAB_RESULT_READY', 'Thyroid Report Ready', 'Your thyroid profile results are available. TSH levels are within normal range.', 'MEDIUM'),
            ('SYSTEM', 'Password Expiry', 'Your password will expire in 7 days. Please update it.', 'MEDIUM'),
            ('APPOINTMENT_REMINDER', 'Follow-up Reminder', 'You have a follow-up appointment with Dr. Gupta next week', 'MEDIUM'),
            ('PAYMENT_DUE', 'Overdue Payment', 'Invoice INV-000005 is overdue. Please clear the balance at your earliest convenience.', 'URGENT'),
            ('GENERAL', 'Vaccination Drive', 'Flu vaccination available at discounted rates this month', 'LOW'),
        ]

        count = 0
        for ntype, title, msg, priority in notif_data:
            user = random.choice(all_users)
            Notification.objects.create(
                recipient=user,
                notification_type=ntype,
                title=title,
                message=msg,
                is_read=random.random() < 0.4,
                priority=priority,
                link=random.choice(['/appointments/', '/lab/results/', '/billing/', '/dashboard/', '', '']),
            )
            count += 1

        self.stdout.write(f'  Created {count} notifications')

    # ------------------------------------------------------------------
    def _create_analytics(self, doctors):
        now = timezone.now().date()
        # Daily metrics for 30 days
        for i in range(30):
            d = now - timedelta(days=i)
            new_patients = random.randint(3, 15)
            new_appts = random.randint(15, 45)
            completed = int(new_appts * random.uniform(0.6, 0.85))
            cancelled = int(new_appts * random.uniform(0.05, 0.15))
            no_show = new_appts - completed - cancelled
            if no_show < 0:
                no_show = 0
            revenue = Decimal(str(random.randint(50000, 250000)))
            avg_val = revenue / max(completed, 1)

            DailyMetrics.objects.create(
                date=d,
                new_patients=new_patients,
                new_appointments=new_appts,
                completed_appointments=completed,
                cancelled_appointments=cancelled,
                no_show_appointments=no_show,
                total_revenue=revenue,
                avg_appointment_value=avg_val.quantize(Decimal('0.01')),
            )

        # Doctor performance for 30 days
        perf_count = 0
        for doc in doctors:
            for i in range(30):
                d = now - timedelta(days=i)
                appts = random.randint(3, 12)
                comp = int(appts * random.uniform(0.6, 0.9))
                canc = random.randint(0, max(1, appts - comp))
                ns = appts - comp - canc
                if ns < 0:
                    ns = 0
                rev = Decimal(str(comp)) * doc.consultation_fee

                DoctorPerformance.objects.create(
                    doctor=doc,
                    date=d,
                    appointments_count=appts,
                    completed_count=comp,
                    cancelled_count=canc,
                    no_show_count=ns,
                    revenue=rev,
                )
                perf_count += 1

        self.stdout.write(f'  Created 30 days of daily metrics and {perf_count} doctor performance records')
