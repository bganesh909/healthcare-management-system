import random
from datetime import timedelta, date, time, datetime
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from users.models import User
from patients.models import Patient
from doctors.models import Doctor
from departments.models import Department
from appointments.models import Appointment

from vitals.models import VitalSign, ClinicalNote, TreatmentPlan, Allergy
from staff.models import StaffMember, Attendance, LeaveRequest, Payroll
from blood_bank.models import BloodDonor, BloodUnit, BloodRequest, CrossMatch
from radiology.models import ImagingType, ImagingOrder, ImagingReport
from emergency.models import EmergencyVisit, Ambulance, AmbulanceDispatch, EmergencyContact
from operation_theater.models import (
    OperationTheater, Surgery, SurgicalTeam, PreOpChecklist, PostOpNote,
)
from inventory.models import (
    AssetCategory, Asset, MaintenanceLog, Vendor, PurchaseOrder, PurchaseOrderItem,
)
from opd_queue.models import QueueEntry, QueueDisplay
from discharge.models import DischargeSummary, FollowUp, Readmission


class Command(BaseCommand):
    help = 'Seed data for new hospital modules'

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush',
            action='store_true',
            help='Clear all data from new modules before seeding',
        )

    def handle(self, *args, **options):
        if options['flush']:
            self._flush()

        self.now = timezone.now()
        self.today = self.now.date()

        self.patients = list(Patient.objects.all())
        self.doctors = list(Doctor.objects.all())
        self.departments = list(Department.objects.all())
        self.appointments = list(Appointment.objects.all())

        if not self.patients:
            self.stderr.write(self.style.ERROR('No patients found. Seed base data first.'))
            return
        if not self.doctors:
            self.stderr.write(self.style.ERROR('No doctors found. Seed base data first.'))
            return

        with transaction.atomic():
            self._seed_vitals()
            self._seed_clinical_notes()
            self._seed_treatment_plans()
            self._seed_allergies()
            self._seed_staff()
            self._seed_attendance()
            self._seed_leave_requests()
            self._seed_payroll()
            self._seed_blood_bank()
            self._seed_radiology()
            self._seed_emergency()
            self._seed_operation_theater()
            self._seed_inventory()
            self._seed_opd_queue()
            self._seed_discharge()

        self.stdout.write(self.style.SUCCESS('All new module data seeded successfully!'))

    # ------------------------------------------------------------------
    # Flush
    # ------------------------------------------------------------------
    def _flush(self):
        models_to_flush = [
            Readmission, FollowUp, DischargeSummary,
            QueueDisplay, QueueEntry,
            PurchaseOrderItem, PurchaseOrder, Vendor, MaintenanceLog, Asset, AssetCategory,
            PostOpNote, PreOpChecklist, SurgicalTeam, Surgery, OperationTheater,
            AmbulanceDispatch, Ambulance, EmergencyContact, EmergencyVisit,
            ImagingReport, ImagingOrder, ImagingType,
            CrossMatch, BloodRequest, BloodUnit, BloodDonor,
            Payroll, LeaveRequest, Attendance,
        ]
        for m in models_to_flush:
            count = m.objects.all().delete()[0]
            self.stdout.write(f'  Deleted {count} {m.__name__} records')

        # Staff members + their user accounts
        staff_users = list(StaffMember.objects.values_list('user_id', flat=True))
        count = StaffMember.objects.all().delete()[0]
        self.stdout.write(f'  Deleted {count} StaffMember records')
        if staff_users:
            count = User.objects.filter(id__in=staff_users, role='staff').delete()[0]
            self.stdout.write(f'  Deleted {count} staff User accounts')

        # Vitals models
        for m in [VitalSign, ClinicalNote, TreatmentPlan, Allergy]:
            count = m.objects.all().delete()[0]
            self.stdout.write(f'  Deleted {count} {m.__name__} records')

        self.stdout.write(self.style.WARNING('Flushed all new module data.'))

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _rp(self):
        """Random patient."""
        return random.choice(self.patients)

    def _rd(self):
        """Random doctor."""
        return random.choice(self.doctors)

    def _rdept(self):
        """Random department."""
        return random.choice(self.departments) if self.departments else None

    def _ra(self):
        """Random appointment or None."""
        return random.choice(self.appointments) if self.appointments else None

    def _past_dt(self, days_back=90):
        """Random datetime in the past N days."""
        delta = timedelta(
            days=random.randint(0, days_back),
            hours=random.randint(6, 20),
            minutes=random.randint(0, 59),
        )
        return self.now - delta

    def _past_date(self, days_back=90):
        return self.today - timedelta(days=random.randint(0, days_back))

    # ------------------------------------------------------------------
    # 1. Vitals
    # ------------------------------------------------------------------
    def _seed_vitals(self):
        if VitalSign.objects.exists():
            self.stdout.write('  VitalSign data already exists, skipping.')
            return

        records = []
        for _ in range(65):
            is_abnormal = random.random() < 0.2
            temp = Decimal(str(round(random.uniform(100.0, 103.0) if is_abnormal else random.uniform(97.0, 99.0), 1)))
            sys_bp = random.randint(150, 180) if is_abnormal else random.randint(100, 140)
            dia_bp = random.randint(95, 110) if is_abnormal else random.randint(60, 90)
            spo2 = Decimal(str(round(random.uniform(88.0, 93.0) if is_abnormal else random.uniform(95.0, 100.0), 1)))
            weight = Decimal(str(round(random.uniform(45.0, 95.0), 2)))
            height = Decimal(str(round(random.uniform(150.0, 185.0), 2)))

            records.append(VitalSign(
                patient=self._rp(),
                recorded_by=self._rd(),
                appointment=self._ra() if random.random() < 0.6 else None,
                temperature=temp,
                blood_pressure_systolic=sys_bp,
                blood_pressure_diastolic=dia_bp,
                pulse_rate=random.randint(90, 120) if is_abnormal else random.randint(60, 90),
                respiratory_rate=random.randint(12, 24),
                oxygen_saturation=spo2,
                weight=weight,
                height=height,
                blood_sugar=Decimal(str(round(random.uniform(70, 250), 2))) if random.random() < 0.5 else None,
                notes='Abnormal readings noted.' if is_abnormal else '',
            ))

        # bulk_create won't call save() so compute BMI manually
        for r in records:
            if r.weight and r.height and r.height > 0:
                h = r.height / Decimal('100')
                r.bmi = round(r.weight / (h ** 2), 1)

        VitalSign.objects.bulk_create(records)
        # update recorded_at via raw SQL (auto_now_add)
        for vs in VitalSign.objects.all():
            dt = self._past_dt(90)
            VitalSign.objects.filter(pk=vs.pk).update(recorded_at=dt)

        self.stdout.write(self.style.SUCCESS(f'  Created {len(records)} VitalSign records'))

    # ------------------------------------------------------------------
    # 2. Clinical Notes
    # ------------------------------------------------------------------
    def _seed_clinical_notes(self):
        if ClinicalNote.objects.exists():
            self.stdout.write('  ClinicalNote data already exists, skipping.')
            return

        soap_data = [
            ('Headache and dizziness', 'BP 160/100, mild papilledema', 'Hypertensive urgency', 'Start Amlodipine 5mg OD, review in 1 week'),
            ('Persistent cough for 2 weeks', 'Bilateral rhonchi, SpO2 94%', 'Acute bronchitis', 'Azithromycin 500mg x 5 days, steam inhalation, follow-up in 5 days'),
            ('Fever and body aches for 3 days', 'Temp 101.2F, throat congestion', 'Viral upper respiratory infection', 'Paracetamol 650mg TDS, fluids, rest'),
            ('Chest pain on exertion', 'ECG shows ST depression V4-V6', 'Unstable angina - rule out MI', 'Admit, serial Troponin, Aspirin, Heparin drip, cardiology consult'),
            ('Epigastric pain after meals', 'Tenderness in epigastrium, no guarding', 'GERD / Peptic ulcer disease', 'Pantoprazole 40mg BD, antacid gel, bland diet, UGI scope if no improvement'),
            ('Swelling in both feet for 1 week', 'Pedal edema grade 2, JVP raised', 'Congestive heart failure - NYHA Class II', 'Furosemide 40mg OD, salt restriction, 2D Echo, BNP levels'),
            ('Burning micturition and frequency', 'Suprapubic tenderness, urine dipstick positive for nitrites', 'Urinary tract infection', 'Nitrofurantoin 100mg BD x 7 days, urine C/S, plenty of fluids'),
            ('Joint pain in both knees', 'Bilateral knee crepitus, mild effusion right knee', 'Osteoarthritis bilateral knees', 'Diclofenac gel topical, Glucosamine 1500mg, physiotherapy referral'),
            ('Excessive thirst and frequent urination', 'BMI 32, acanthosis nigricans', 'Type 2 Diabetes Mellitus - new onset', 'Metformin 500mg BD, HbA1c, fasting lipid profile, diabetic diet counseling'),
            ('Skin rash on trunk for 5 days', 'Erythematous papular rash, dermatomal distribution', 'Herpes Zoster (Shingles)', 'Acyclovir 800mg 5x/day x 7 days, Gabapentin 100mg TDS for neuralgia'),
            ('Low back pain radiating to left leg', 'SLR positive left, reduced ankle reflex', 'Lumbar radiculopathy L5-S1', 'MRI lumbar spine, Pregabalin 75mg BD, strict bed rest, ortho referral'),
            ('Breathlessness on lying down', 'Bilateral basal crepts, SpO2 91% on room air', 'Acute exacerbation of COPD', 'Nebulization with Salbutamol + Ipratropium, IV Hydrocortisone, O2 support'),
            ('Abdominal pain right lower quadrant', 'McBurney point tenderness, positive Rovsing sign', 'Acute appendicitis', 'NPO, IV fluids, surgical consultation for appendectomy, CBC, USG abdomen'),
            ('Vomiting and loose stools since morning', 'Dehydrated, sunken eyes, dry tongue', 'Acute gastroenteritis with dehydration', 'ORS, IV RL 1L stat, Ondansetron 4mg SOS, stool R/E'),
            ('Difficulty in swallowing for 2 weeks', 'Weight loss 4kg, palpable cervical lymph node', 'Dysphagia for evaluation - rule out malignancy', 'Urgent UGI endoscopy, CT neck and chest, biopsy, oncology referral'),
        ]

        progress_notes = [
            'Day 2 post-admission: Patient responding well to IV antibiotics. Fever trending down. WBC count improving. Continue current management.',
            'Post-op Day 1 appendectomy: Vitals stable. Minimal drain output. Started clear liquids. Ambulating with assistance.',
            'Review visit: Blood sugar fasting 126 mg/dL, PP 210 mg/dL. HbA1c 8.2%. Increase Metformin to 1000mg BD. Add Glimepiride 1mg.',
            'Follow-up: Knee pain improved by 60% with physiotherapy. ROM improved. Continue exercises, reduce analgesics.',
            'Day 3 CHF management: Pedal edema reduced. Weight down by 2kg. Urine output adequate. Echo shows EF 35%. Add Carvedilol 3.125mg BD.',
            'Chemotherapy cycle 3 completed. Mild nausea managed with Ondansetron. Counts stable. Next cycle in 3 weeks.',
            'Post-CABG Day 5: Hemodynamically stable. Chest drains removed. Started cardiac rehab. Discharge planned in 2 days.',
            'Dialysis session 15: Dry weight achieved. Potassium 4.8. Phosphorus slightly elevated - increase Sevelamer.',
            'Psychiatry follow-up: PHQ-9 score reduced from 18 to 11. Sleep improving. Continue Escitalopram 10mg. Next review in 4 weeks.',
            'Ante-natal visit 28 weeks: BP normal, no proteinuria. FHS regular. GTT normal. Iron and calcium supplementation continued.',
            'Wound care review: Diabetic foot ulcer showing healthy granulation tissue. Reduced wound size by 30%. Continue VAC therapy.',
            'Pulmonary rehab session 8: 6MWT distance improved from 280m to 350m. SpO2 maintained above 92%. Encourage continued exercises.',
            'Oncology review: CT scan shows partial response. Tumor marker CA 19-9 reduced by 45%. Continue current chemotherapy regimen.',
            'Endocrine follow-up: Thyroid function normalized on Levothyroxine 75mcg. TSH 3.2. Continue same dose, recheck in 3 months.',
            'Rheumatology: RA disease activity reduced. DAS28 score 2.8 (low activity). Continue Methotrexate 15mg weekly with folic acid.',
        ]

        notes = []
        for i, (subj, obj, assess, plan) in enumerate(soap_data):
            notes.append(ClinicalNote(
                patient=self._rp(),
                doctor=self._rd(),
                appointment=self._ra() if random.random() < 0.5 else None,
                note_type='SOAP',
                subjective=subj,
                objective=obj,
                assessment=assess,
                plan=plan,
            ))

        for content in progress_notes:
            notes.append(ClinicalNote(
                patient=self._rp(),
                doctor=self._rd(),
                appointment=self._ra() if random.random() < 0.3 else None,
                note_type='PROGRESS',
                content=content,
            ))

        ClinicalNote.objects.bulk_create(notes)
        # backdate created_at
        for cn in ClinicalNote.objects.all():
            ClinicalNote.objects.filter(pk=cn.pk).update(created_at=self._past_dt(60))

        self.stdout.write(self.style.SUCCESS(f'  Created {len(notes)} ClinicalNote records'))

    # ------------------------------------------------------------------
    # 3. Treatment Plans
    # ------------------------------------------------------------------
    def _seed_treatment_plans(self):
        if TreatmentPlan.objects.exists():
            self.stdout.write('  TreatmentPlan data already exists, skipping.')
            return

        plans_data = [
            ('Hypertension Management', 'Essential Hypertension Stage 2', 'Maintain BP < 130/80 mmHg', 'Amlodipine 5mg + Telmisartan 40mg, low-sodium diet, 30 min daily walking, weekly BP log'),
            ('Type 2 DM Control', 'Type 2 Diabetes Mellitus, uncontrolled', 'HbA1c < 7%, FBS < 130 mg/dL', 'Metformin 1000mg BD, Glimepiride 2mg OD, diabetic diet, SMBG twice daily'),
            ('Cardiac Rehabilitation', 'Post CABG surgery', 'Restore functional capacity, prevent recurrence', 'Graded exercise program, lipid management (Atorvastatin 40mg), antiplatelet therapy, lifestyle modification'),
            ('Asthma Action Plan', 'Bronchial Asthma - moderate persistent', 'Achieve symptom-free days > 80%, reduce exacerbations', 'Budesonide/Formoterol 200/6 inhaler BD, Montelukast 10mg HS, peak flow monitoring, trigger avoidance'),
            ('Chronic Kidney Disease Management', 'CKD Stage 3b, eGFR 38', 'Slow progression, maintain eGFR > 30', 'Losartan 50mg, protein-restricted diet 0.8g/kg, monitor creatinine monthly, avoid nephrotoxins'),
            ('Rheumatoid Arthritis Treatment', 'Seropositive RA, moderate activity', 'DAS28 < 2.6 (remission)', 'Methotrexate 15mg weekly, Folic acid 5mg, Hydroxychloroquine 200mg BD, regular ESR/CRP monitoring'),
            ('Depression Treatment Plan', 'Major Depressive Disorder, moderate', 'PHQ-9 < 5, functional improvement', 'Escitalopram 10mg OD, CBT sessions weekly, sleep hygiene, social activity scheduling'),
            ('Post-Stroke Rehabilitation', 'Left MCA territory ischemic stroke', 'Regain independence in ADLs, prevent recurrence', 'Physiotherapy daily, occupational therapy, speech therapy, Aspirin 150mg, Atorvastatin 80mg'),
            ('Obesity Management', 'Morbid obesity BMI 42, metabolic syndrome', 'Lose 10% body weight in 6 months', 'Caloric deficit 500kcal/day, structured exercise 150min/week, behavioral therapy, consider bariatric referral'),
            ('COPD Management', 'COPD Gold Stage 3, severe', 'Reduce exacerbations, improve exercise tolerance', 'Tiotropium 18mcg inhaler OD, Salbutamol PRN, pulmonary rehab, annual flu vaccine, smoking cessation'),
            ('Epilepsy Management', 'Generalized tonic-clonic epilepsy', 'Seizure freedom for > 1 year', 'Levetiracetam 500mg BD, seizure diary, adequate sleep, avoid triggers, driving restriction'),
            ('Osteoporosis Treatment', 'Post-menopausal osteoporosis, T-score -3.2', 'Improve bone density, prevent fractures', 'Alendronate 70mg weekly, Calcium 1000mg + Vitamin D3 60000IU monthly, weight-bearing exercises'),
            ('Thyroid Management', 'Hypothyroidism - Hashimoto thyroiditis', 'Maintain TSH 1-4 mIU/L', 'Levothyroxine 75mcg OD empty stomach, TSH check every 3 months, iodine-adequate diet'),
            ('Hepatitis B Treatment', 'Chronic Hepatitis B, HBeAg positive', 'Achieve viral suppression, prevent cirrhosis', 'Tenofovir 300mg OD, LFT and viral load every 3 months, fibroscan annually, HCC surveillance'),
            ('Iron Deficiency Anemia', 'Severe iron deficiency anemia, Hb 7.2', 'Hb > 12g/dL, ferritin > 50', 'Iron sucrose IV 200mg x 5 doses, oral ferrous sulfate 200mg TDS after IV course, investigate cause'),
            ('Diabetic Foot Care', 'Diabetic foot ulcer Wagner Grade 2', 'Complete wound healing within 8 weeks', 'Offloading with therapeutic footwear, daily dressing with silver alginate, glycemic control, vascular assessment'),
        ]

        statuses = ['ACTIVE'] * 8 + ['COMPLETED'] * 5 + ['ON_HOLD'] * 3
        random.shuffle(statuses)

        objs = []
        for i, (title, diag, goals, interventions) in enumerate(plans_data):
            start = self._past_date(120)
            status = statuses[i % len(statuses)]
            end = start + timedelta(days=random.randint(30, 180)) if status == 'COMPLETED' else None
            review = start + timedelta(days=random.randint(14, 45)) if status == 'ACTIVE' else None
            objs.append(TreatmentPlan(
                patient=self._rp(),
                doctor=self._rd(),
                title=title,
                diagnosis=diag,
                goals=goals,
                interventions=interventions,
                status=status,
                start_date=start,
                end_date=end,
                review_date=review,
            ))

        TreatmentPlan.objects.bulk_create(objs)
        self.stdout.write(self.style.SUCCESS(f'  Created {len(objs)} TreatmentPlan records'))

    # ------------------------------------------------------------------
    # 4. Allergies
    # ------------------------------------------------------------------
    def _seed_allergies(self):
        if Allergy.objects.exists():
            self.stdout.write('  Allergy data already exists, skipping.')
            return

        allergy_data = [
            ('Penicillin', 'DRUG', 'SEVERE', 'Anaphylaxis, urticaria, angioedema'),
            ('Sulfonamides', 'DRUG', 'MODERATE', 'Skin rash, fever'),
            ('Aspirin', 'DRUG', 'MODERATE', 'Bronchospasm, nasal polyps'),
            ('Ibuprofen', 'DRUG', 'MILD', 'GI upset, mild rash'),
            ('Metformin', 'DRUG', 'MILD', 'GI intolerance, nausea'),
            ('Codeine', 'DRUG', 'MODERATE', 'Nausea, vomiting, itching'),
            ('Ciprofloxacin', 'DRUG', 'SEVERE', 'Stevens-Johnson syndrome'),
            ('Cephalosporins', 'DRUG', 'MODERATE', 'Urticaria, cross-reactivity with penicillin'),
            ('Peanuts', 'FOOD', 'LIFE_THREATENING', 'Anaphylaxis, throat swelling, hypotension'),
            ('Shellfish', 'FOOD', 'SEVERE', 'Urticaria, abdominal cramps, anaphylaxis'),
            ('Dairy', 'FOOD', 'MILD', 'Bloating, diarrhea, abdominal discomfort'),
            ('Eggs', 'FOOD', 'MODERATE', 'Skin rash, GI symptoms'),
            ('Wheat/Gluten', 'FOOD', 'MODERATE', 'Abdominal pain, diarrhea, malabsorption'),
            ('Soy', 'FOOD', 'MILD', 'Mild GI upset, skin itching'),
            ('Dust mites', 'ENVIRONMENTAL', 'MODERATE', 'Rhinitis, sneezing, watery eyes, asthma exacerbation'),
            ('Pollen', 'ENVIRONMENTAL', 'MILD', 'Seasonal rhinitis, conjunctivitis'),
            ('Animal dander', 'ENVIRONMENTAL', 'MILD', 'Sneezing, rhinorrhea, itchy eyes'),
            ('Mold', 'ENVIRONMENTAL', 'MODERATE', 'Wheezing, cough, nasal congestion'),
            ('Latex', 'LATEX', 'SEVERE', 'Contact dermatitis, anaphylaxis during procedures'),
            ('Bee venom', 'OTHER', 'LIFE_THREATENING', 'Anaphylaxis, cardiovascular collapse'),
            ('Nickel', 'OTHER', 'MILD', 'Contact dermatitis at jewelry/watch sites'),
            ('Iodine contrast dye', 'DRUG', 'SEVERE', 'Anaphylactoid reaction, bronchospasm, hypotension'),
        ]

        objs = []
        for allergen, atype, severity, reaction in allergy_data:
            objs.append(Allergy(
                patient=self._rp(),
                allergen=allergen,
                allergy_type=atype,
                severity=severity,
                reaction=reaction,
                first_observed=self._past_date(365 * 3),
                is_active=random.random() < 0.9,
            ))

        Allergy.objects.bulk_create(objs)
        self.stdout.write(self.style.SUCCESS(f'  Created {len(objs)} Allergy records'))

    # ------------------------------------------------------------------
    # 5. Staff Members
    # ------------------------------------------------------------------
    def _seed_staff(self):
        if StaffMember.objects.exists():
            self.stdout.write('  StaffMember data already exists, skipping.')
            return

        staff_list = [
            # (first, last, role, qualification, salary, shift)
            ('Priya', 'Sharma', 'NURSE', 'B.Sc Nursing', 35000, 'MORNING'),
            ('Anjali', 'Patel', 'NURSE', 'GNM Diploma', 28000, 'AFTERNOON'),
            ('Rekha', 'Singh', 'NURSE', 'B.Sc Nursing', 32000, 'NIGHT'),
            ('Kavita', 'Reddy', 'NURSE', 'M.Sc Nursing', 40000, 'MORNING'),
            ('Sunita', 'Verma', 'NURSE', 'B.Sc Nursing', 30000, 'ROTATING'),
            ('Meena', 'Gupta', 'NURSE', 'GNM Diploma', 27000, 'AFTERNOON'),
            ('Pooja', 'Nair', 'NURSE', 'B.Sc Nursing', 33000, 'MORNING'),
            ('Deepa', 'Joshi', 'NURSE', 'Post Basic B.Sc', 36000, 'NIGHT'),
            ('Rajesh', 'Kumar', 'TECHNICIAN', 'B.Sc Medical Technology', 30000, 'GENERAL'),
            ('Suresh', 'Yadav', 'TECHNICIAN', 'Diploma in Medical Lab Technology', 25000, 'MORNING'),
            ('Amit', 'Deshmukh', 'TECHNICIAN', 'B.Sc Radiology Technology', 28000, 'ROTATING'),
            ('Vikram', 'Menon', 'TECHNICIAN', 'B.Sc OT Technology', 27000, 'GENERAL'),
            ('Neha', 'Kapoor', 'RECEPTIONIST', 'B.Com', 22000, 'GENERAL'),
            ('Swati', 'Malhotra', 'RECEPTIONIST', 'BBA', 23000, 'MORNING'),
            ('Ritu', 'Agarwal', 'RECEPTIONIST', 'B.A.', 20000, 'AFTERNOON'),
            ('Manoj', 'Pillai', 'PHARMACIST', 'B.Pharm', 35000, 'GENERAL'),
            ('Divya', 'Iyer', 'PHARMACIST', 'D.Pharm', 28000, 'ROTATING'),
            ('Arun', 'Mishra', 'LAB_TECHNICIAN', 'DMLT', 25000, 'MORNING'),
            ('Sanjay', 'Tiwari', 'LAB_TECHNICIAN', 'B.Sc MLT', 30000, 'AFTERNOON'),
            ('Vinod', 'Das', 'LAB_TECHNICIAN', 'DMLT', 24000, 'NIGHT'),
            ('Ramesh', 'Chauhan', 'WARD_BOY', '10th Pass', 15000, 'MORNING'),
            ('Sunil', 'Bhatt', 'WARD_BOY', '12th Pass', 16000, 'NIGHT'),
            ('Dinesh', 'Thakur', 'SECURITY', '12th Pass', 18000, 'NIGHT'),
            ('Prakash', 'Sawant', 'SECURITY', '10th Pass', 17000, 'ROTATING'),
            ('Laxmi', 'Devi', 'HOUSEKEEPING', '8th Pass', 15000, 'GENERAL'),
        ]

        self.staff_members = []
        for i, (first, last, role, qual, salary, shift) in enumerate(staff_list, 1):
            email = f"{first.lower()}.{last.lower()}@hospital.com"
            user = User.objects.create_user(
                email=email,
                password='staff1234',
                first_name=first,
                last_name=last,
                role='staff',
            )
            dept = self._rdept()
            sm = StaffMember.objects.create(
                user=user,
                employee_id=f'EMP-{i:05d}',
                first_name=first,
                last_name=last,
                role=role,
                department=dept,
                phone_number=f'+9198{random.randint(10000000, 99999999)}',
                email=email,
                date_of_joining=self.today - timedelta(days=random.randint(180, 1800)),
                qualification=qual,
                current_shift=shift,
                salary=Decimal(str(salary)),
                is_active=True,
                address=f'{random.randint(1,500)}, {random.choice(["MG Road","Station Road","Gandhi Nagar","Nehru Colony","Shivaji Nagar"])}, {random.choice(["Bangalore","Mumbai","Pune","Chennai","Hyderabad","Delhi"])}',
                emergency_contact_name=f'{random.choice(["Ravi","Suman","Mohan","Geeta","Anil"])} {last}',
                emergency_contact_number=f'+9199{random.randint(10000000, 99999999)}',
            )
            self.staff_members.append(sm)

        self.stdout.write(self.style.SUCCESS(f'  Created {len(self.staff_members)} StaffMember records'))

    # ------------------------------------------------------------------
    # 6. Attendance (last 30 days)
    # ------------------------------------------------------------------
    def _seed_attendance(self):
        if Attendance.objects.exists():
            self.stdout.write('  Attendance data already exists, skipping.')
            return

        if not hasattr(self, 'staff_members'):
            self.staff_members = list(StaffMember.objects.all())
        if not self.staff_members:
            return

        objs = []
        for sm in self.staff_members:
            for day_offset in range(30):
                d = self.today - timedelta(days=day_offset)
                # skip sundays
                if d.weekday() == 6:
                    continue

                r = random.random()
                if r < 0.75:
                    status = 'PRESENT'
                    ci = time(random.randint(6, 9), random.randint(0, 30))
                    co = time(random.randint(16, 20), random.randint(0, 59))
                    hours = Decimal(str(round(random.uniform(7.0, 9.5), 2)))
                    ot = Decimal(str(round(random.uniform(0, 2.0), 2))) if random.random() < 0.2 else Decimal('0')
                elif r < 0.85:
                    status = 'LATE'
                    ci = time(random.randint(10, 11), random.randint(0, 59))
                    co = time(random.randint(17, 20), random.randint(0, 59))
                    hours = Decimal(str(round(random.uniform(5.0, 7.5), 2)))
                    ot = Decimal('0')
                elif r < 0.92:
                    status = 'HALF_DAY'
                    ci = time(9, random.randint(0, 30))
                    co = time(13, random.randint(0, 59))
                    hours = Decimal(str(round(random.uniform(3.5, 4.5), 2)))
                    ot = Decimal('0')
                else:
                    status = 'ON_LEAVE'
                    ci = None
                    co = None
                    hours = None
                    ot = Decimal('0')

                objs.append(Attendance(
                    staff_member=sm,
                    date=d,
                    status=status,
                    check_in=ci,
                    check_out=co,
                    hours_worked=hours,
                    overtime_hours=ot,
                ))

        Attendance.objects.bulk_create(objs)
        self.stdout.write(self.style.SUCCESS(f'  Created {len(objs)} Attendance records'))

    # ------------------------------------------------------------------
    # 7. Leave Requests
    # ------------------------------------------------------------------
    def _seed_leave_requests(self):
        if LeaveRequest.objects.exists():
            self.stdout.write('  LeaveRequest data already exists, skipping.')
            return

        if not hasattr(self, 'staff_members'):
            self.staff_members = list(StaffMember.objects.all())

        leave_reasons = [
            ('CASUAL', 'Family function - wedding ceremony'),
            ('CASUAL', 'Personal work - bank and government office visit'),
            ('SICK', 'Fever and body ache, need rest'),
            ('SICK', 'Migraine attack, unable to work'),
            ('SICK', 'Food poisoning, under medication'),
            ('EARNED', 'Annual vacation - visiting hometown'),
            ('EARNED', 'Planning a short trip with family'),
            ('CASUAL', 'Child school function attendance'),
            ('SICK', 'Dental procedure scheduled'),
            ('COMPENSATORY', 'Worked on public holiday last week'),
            ('CASUAL', 'House shifting and settling in'),
            ('SICK', 'Eye infection, doctor advised rest'),
            ('EARNED', 'Sister marriage preparations'),
            ('UNPAID', 'Extended family emergency out of station'),
            ('CASUAL', 'Passport renewal appointment at RPO'),
            ('SICK', 'Back pain, physiotherapy sessions needed'),
        ]

        statuses = ['APPROVED'] * 7 + ['PENDING'] * 4 + ['REJECTED'] * 3 + ['CANCELLED'] * 2
        random.shuffle(statuses)
        admin_user = User.objects.filter(role='admin').first()

        objs = []
        for i, (ltype, reason) in enumerate(leave_reasons):
            start = self._past_date(60)
            days = random.randint(1, 5) if ltype != 'EARNED' else random.randint(3, 10)
            st = statuses[i % len(statuses)]
            objs.append(LeaveRequest(
                staff_member=random.choice(self.staff_members),
                leave_type=ltype,
                start_date=start,
                end_date=start + timedelta(days=days),
                reason=reason,
                status=st,
                approved_by=admin_user if st == 'APPROVED' else None,
            ))

        LeaveRequest.objects.bulk_create(objs)
        self.stdout.write(self.style.SUCCESS(f'  Created {len(objs)} LeaveRequest records'))

    # ------------------------------------------------------------------
    # 8. Payroll (last 3 months)
    # ------------------------------------------------------------------
    def _seed_payroll(self):
        if Payroll.objects.exists():
            self.stdout.write('  Payroll data already exists, skipping.')
            return

        if not hasattr(self, 'staff_members'):
            self.staff_members = list(StaffMember.objects.all())

        objs = []
        for sm in self.staff_members:
            for months_back in range(1, 4):
                m_date = self.today.replace(day=1) - timedelta(days=30 * months_back)
                month = m_date.month
                year = m_date.year
                basic = sm.salary
                allowances = round(basic * Decimal('0.30'), 2)
                deductions = round(basic * Decimal('0.12'), 2)
                ot_pay = round(Decimal(str(random.randint(0, 3000))), 2)
                net = basic + allowances - deductions + ot_pay
                status = 'PAID' if months_back > 1 else random.choice(['PAID', 'PROCESSED'])
                paid = m_date.replace(day=28) if status == 'PAID' else None

                objs.append(Payroll(
                    staff_member=sm,
                    month=month,
                    year=year,
                    basic_salary=basic,
                    allowances=allowances,
                    deductions=deductions,
                    overtime_pay=ot_pay,
                    net_salary=net,
                    status=status,
                    paid_date=paid,
                ))

        Payroll.objects.bulk_create(objs)
        self.stdout.write(self.style.SUCCESS(f'  Created {len(objs)} Payroll records'))

    # ------------------------------------------------------------------
    # 9. Blood Bank
    # ------------------------------------------------------------------
    def _seed_blood_bank(self):
        if BloodDonor.objects.exists():
            self.stdout.write('  BloodDonor data already exists, skipping.')
            return

        donor_names = [
            ('Rajiv', 'Mehta', 'M'), ('Shalini', 'Bose', 'F'), ('Vikrant', 'Patil', 'M'),
            ('Aarti', 'Sinha', 'F'), ('Manoj', 'Kulkarni', 'M'), ('Sneha', 'Chavan', 'F'),
            ('Rohit', 'Saxena', 'M'), ('Megha', 'Jain', 'F'), ('Kiran', 'Naidu', 'M'),
            ('Poornima', 'Rao', 'F'), ('Ashwin', 'Hegde', 'M'), ('Preeti', 'Deshpande', 'F'),
            ('Ganesh', 'Bhosale', 'M'), ('Tanvi', 'Gaikwad', 'F'), ('Deepak', 'Pandey', 'M'),
            ('Nandini', 'Choudhary', 'F'), ('Harish', 'Shetty', 'M'), ('Ankita', 'Mukherjee', 'F'),
            ('Sachin', 'Jadhav', 'M'), ('Rashmi', 'Nair', 'F'),
        ]
        blood_groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

        donors = []
        for first, last, gender in donor_names:
            bg = random.choice(blood_groups)
            d = BloodDonor(
                first_name=first,
                last_name=last,
                blood_group=bg,
                date_of_birth=date(random.randint(1975, 2000), random.randint(1, 12), random.randint(1, 28)),
                gender=gender,
                phone_number=f'+9198{random.randint(10000000, 99999999)}',
                email=f'{first.lower()}.{last.lower()}@email.com',
                address=f'{random.randint(1,200)}, {random.choice(["Anna Nagar","Koramangala","Bandra West","Jubilee Hills","Connaught Place"])}, {random.choice(["Chennai","Bangalore","Mumbai","Hyderabad","Delhi"])}',
                last_donation_date=self._past_date(180) if random.random() < 0.7 else None,
                total_donations=random.randint(0, 12),
                is_eligible=random.random() < 0.85,
            )
            donors.append(d)

        BloodDonor.objects.bulk_create(donors)
        saved_donors = list(BloodDonor.objects.all())

        # Blood units
        components = ['WHOLE_BLOOD', 'PACKED_RBC', 'PLATELETS', 'FRESH_FROZEN_PLASMA', 'CRYOPRECIPITATE']
        unit_statuses = ['AVAILABLE'] * 25 + ['RESERVED'] * 5 + ['ISSUED'] * 8 + ['EXPIRED'] * 5 + ['TESTING'] * 7
        random.shuffle(unit_statuses)

        units = []
        for i in range(50):
            donor = random.choice(saved_donors)
            coll = self._past_date(45)
            comp = random.choice(components)
            shelf_days = {'WHOLE_BLOOD': 35, 'PACKED_RBC': 42, 'PLATELETS': 5, 'FRESH_FROZEN_PLASMA': 365, 'CRYOPRECIPITATE': 365}
            exp = coll + timedelta(days=shelf_days[comp])
            vol = {'WHOLE_BLOOD': 450, 'PACKED_RBC': 280, 'PLATELETS': 50, 'FRESH_FROZEN_PLASMA': 200, 'CRYOPRECIPITATE': 30}

            st = unit_statuses[i % len(unit_statuses)]
            units.append(BloodUnit(
                unit_number=f'BU-{2024}{i+1:04d}',
                donor=donor,
                blood_group=donor.blood_group,
                component_type=comp,
                collection_date=coll,
                expiry_date=exp,
                volume_ml=vol[comp] + random.randint(-10, 20),
                status=st,
                storage_location=f'Rack-{random.choice(["A","B","C","D"])}-Shelf-{random.randint(1,5)}',
                tested_by=f'Dr. {random.choice(["Anil","Suresh","Meera"])} (Pathologist)' if st != 'TESTING' else '',
                is_tested=st != 'TESTING',
                test_results='HIV: Negative, HBsAg: Negative, HCV: Negative, VDRL: Negative, Malaria: Negative' if st != 'TESTING' else '',
            ))

        BloodUnit.objects.bulk_create(units)

        # Blood requests
        saved_units = list(BloodUnit.objects.all())
        requests = []
        for i in range(10):
            patient = self._rp()
            bg = random.choice(blood_groups)
            requests.append(BloodRequest(
                request_number=f'BR-{2024}{i+1:04d}',
                patient=patient,
                doctor=self._rd(),
                blood_group=bg,
                component_type=random.choice(components),
                units_required=random.randint(1, 4),
                priority=random.choice(['ROUTINE', 'URGENT', 'EMERGENCY']),
                status=random.choice(['PENDING', 'APPROVED', 'ISSUED', 'COMPLETED']),
                reason=random.choice([
                    'Pre-surgical requirement for planned surgery',
                    'Post-operative hemorrhage management',
                    'Severe anemia requiring transfusion',
                    'Dengue with low platelet count',
                    'GI bleed with dropping hemoglobin',
                    'Thalassemia major - routine transfusion',
                ]),
                required_date=self._past_date(30),
                approved_by=f'Dr. {random.choice(["Verma","Gupta","Singh"])}',
            ))

        BloodRequest.objects.bulk_create(requests)
        saved_requests = list(BloodRequest.objects.all())

        # Cross-matches
        cm_objs = []
        for i in range(min(5, len(saved_requests))):
            req = saved_requests[i]
            unit = random.choice(saved_units)
            cm_objs.append(CrossMatch(
                blood_request=req,
                blood_unit=unit,
                patient=req.patient,
                result=random.choice(['COMPATIBLE', 'COMPATIBLE', 'COMPATIBLE', 'INCOMPATIBLE', 'PENDING']),
                tested_by=f'Dr. {random.choice(["Anil","Meera","Suresh"])} (Blood Bank)',
            ))

        CrossMatch.objects.bulk_create(cm_objs)
        self.stdout.write(self.style.SUCCESS(f'  Created {len(donors)} donors, {len(units)} units, {len(requests)} requests, {len(cm_objs)} cross-matches'))

    # ------------------------------------------------------------------
    # 10. Radiology
    # ------------------------------------------------------------------
    def _seed_radiology(self):
        if ImagingType.objects.exists():
            self.stdout.write('  ImagingType data already exists, skipping.')
            return

        imaging_types_data = [
            ('X-Ray', 'XRAY', 'Standard radiography', Decimal('500'), '30 minutes', False),
            ('MRI', 'MRI', 'Magnetic Resonance Imaging', Decimal('8000'), '2-3 hours', False),
            ('CT Scan', 'CT', 'Computed Tomography', Decimal('4000'), '1-2 hours', True),
            ('Ultrasound', 'USG', 'Ultrasonography', Decimal('1500'), '30-45 minutes', False),
            ('Mammography', 'MAMMO', 'Breast imaging', Decimal('2000'), '1 hour', False),
            ('Fluoroscopy', 'FLUORO', 'Real-time X-ray imaging', Decimal('3000'), '1-2 hours', True),
            ('PET Scan', 'PET', 'Positron Emission Tomography', Decimal('15000'), '3-4 hours', True),
            ('DEXA Scan', 'DEXA', 'Bone density measurement', Decimal('2500'), '30 minutes', False),
        ]

        types_objs = []
        for name, code, desc, price, tat, contrast in imaging_types_data:
            types_objs.append(ImagingType(
                name=name,
                code=code,
                description=desc,
                base_price=price,
                turnaround_time=tat,
                requires_contrast=contrast,
            ))
        ImagingType.objects.bulk_create(types_objs)
        saved_types = list(ImagingType.objects.all())

        # Imaging orders
        body_parts_indications = [
            ('Chest', 'Persistent cough with hemoptysis, rule out pulmonary TB'),
            ('Lumbar Spine', 'Low back pain radiating to left leg for 3 weeks'),
            ('Brain', 'Severe headache with projectile vomiting, rule out SOL'),
            ('Abdomen', 'Right upper quadrant pain, rule out cholelithiasis'),
            ('Right Knee', 'Trauma to right knee, rule out fracture'),
            ('Left Shoulder', 'Chronic left shoulder pain, rule out rotator cuff tear'),
            ('Pelvis', 'Hip pain in elderly patient, rule out femoral neck fracture'),
            ('Bilateral Breast', 'Screening mammography, age > 40 years'),
            ('Whole Body', 'Known carcinoma lung, staging PET scan'),
            ('Cervical Spine', 'Neck pain with numbness in right arm'),
            ('Right Wrist', 'Fall on outstretched hand, rule out scaphoid fracture'),
            ('KUB', 'Colicky flank pain, rule out renal calculus'),
            ('Left Hip', 'Avascular necrosis evaluation, bilateral hip pain'),
            ('Thorax', 'Pre-operative chest screening for planned surgery'),
            ('Right Ankle', 'Inversion injury right ankle, rule out ligament tear'),
            ('Abdomen and Pelvis', 'Vague abdominal pain, weight loss, anorexia'),
            ('Brain and Spine', 'Multiple sclerosis follow-up, new neurological symptoms'),
            ('Upper GI', 'Barium swallow for dysphagia evaluation'),
            ('Right Hand', 'Crush injury to right hand, assess bony injuries'),
            ('Lumbar Spine', 'Post-decompression surgery follow-up at 6 weeks'),
            ('Liver', 'Hepatomegaly on palpation, rule out hepatic mass'),
            ('Bilateral Hips', 'Bone densitometry for post-menopausal osteoporosis screening'),
            ('Chest', 'Follow-up chest X-ray for resolving pneumonia'),
            ('Abdomen', 'Obstetric ultrasound - anomaly scan at 20 weeks'),
            ('Skull', 'Trauma to head, rule out skull fracture, GCS 14'),
        ]

        order_statuses = ['COMPLETED'] * 15 + ['SCHEDULED'] * 5 + ['ORDERED'] * 3 + ['IN_PROGRESS'] * 2
        random.shuffle(order_statuses)

        orders = []
        for i, (body_part, indication) in enumerate(body_parts_indications):
            itype = random.choice(saved_types)
            st = order_statuses[i % len(order_statuses)]
            orders.append(ImagingOrder(
                order_number=f'IMG-{i+1:06d}',
                patient=self._rp(),
                doctor=self._rd(),
                appointment=self._ra() if random.random() < 0.4 else None,
                imaging_type=itype,
                body_part=body_part,
                priority=random.choice(['ROUTINE', 'URGENT', 'STAT']),
                status=st,
                scheduled_date=self._past_dt(45) if st != 'ORDERED' else None,
                clinical_indication=indication,
                price=itype.base_price,
            ))

        ImagingOrder.objects.bulk_create(orders)
        saved_orders = list(ImagingOrder.objects.filter(status='COMPLETED'))

        # Imaging reports for completed orders
        findings_data = [
            ('NORMAL', 'No acute cardiopulmonary disease. Heart size normal. Lung fields clear.', 'Normal chest radiograph.', 'No further imaging required.'),
            ('MILD', 'Mild degenerative changes at L4-L5 level with disc space narrowing. No significant neural compression.', 'Mild lumbar spondylosis.', 'Correlate clinically. MRI if symptoms persist.'),
            ('MODERATE', 'A 2.5cm enhancing lesion in the right frontal lobe with surrounding edema. Mild midline shift.', 'Right frontal space-occupying lesion - likely meningioma.', 'Urgent neurosurgery consultation. Consider stereotactic biopsy.'),
            ('NORMAL', 'Liver, spleen, pancreas, kidneys appear normal. No free fluid. Gallbladder normal.', 'Normal abdominal ultrasound.', 'No follow-up imaging needed.'),
            ('NORMAL', 'No fracture or dislocation. Joint spaces maintained. Soft tissues normal.', 'Normal knee radiograph.', 'Clinical correlation recommended.'),
            ('MODERATE', 'Partial thickness tear of the supraspinatus tendon with mild subacromial bursitis.', 'Rotator cuff partial tear with bursitis.', 'Orthopedic consultation. Consider physiotherapy vs surgical repair.'),
            ('SEVERE', 'Displaced femoral neck fracture, Garden type III. Posterior displacement of femoral head.', 'Displaced femoral neck fracture.', 'Urgent orthopedic intervention - hemiarthroplasty vs fixation.'),
            ('NORMAL', 'Bilateral breasts show heterogeneously dense tissue. No suspicious mass, calcification, or architectural distortion. BIRADS 1.', 'Normal screening mammogram.', 'Routine annual screening mammogram.'),
            ('CRITICAL', 'Multiple FDG-avid lesions in bilateral lungs, liver, and mediastinal lymph nodes. Primary right lung mass 4.2cm with SUVmax 12.5.', 'Extensive metastatic disease - lung primary.', 'Oncology multidisciplinary team discussion. Tissue diagnosis required.'),
            ('MILD', 'Straightening of cervical lordosis. Mild disc bulge at C5-C6 with minimal thecal sac compression.', 'Mild cervical spondylosis with disc bulge.', 'Conservative management. Neurosurgery referral if progressive symptoms.'),
            ('NORMAL', 'No fracture seen. Normal carpal alignment. Soft tissues unremarkable.', 'Normal wrist radiograph.', 'If clinical suspicion persists, repeat X-ray in 2 weeks or consider MRI.'),
            ('MODERATE', 'A 7mm radio-opaque calculus in the right renal pelvis with mild hydronephrosis.', 'Right renal calculus with mild hydronephrosis.', 'Urology referral. Consider CT KUB for detailed stone analysis.'),
            ('MODERATE', 'Bilateral femoral head irregularity with subchondral sclerosis. Ficat Stage II changes bilaterally.', 'Bilateral avascular necrosis of femoral heads.', 'Orthopedic consultation for surgical management. Core decompression vs arthroplasty.'),
            ('NORMAL', 'Heart size normal. Clear lung fields. No pleural effusion. Mediastinum normal.', 'Normal pre-operative chest radiograph.', 'Patient cleared from radiology perspective for surgery.'),
            ('MILD', 'Mild soft tissue swelling around right ankle. No fracture. Ankle mortise intact.', 'Soft tissue injury right ankle - no fracture.', 'MRI if ligament tear suspected clinically.'),
        ]

        reports = []
        for i, order in enumerate(saved_orders[:15]):
            if i < len(findings_data):
                sev, findings, impression, rec = findings_data[i]
            else:
                sev, findings, impression, rec = random.choice(findings_data)
            reports.append(ImagingReport(
                imaging_order=order,
                findings=findings,
                impression=impression,
                recommendation=rec,
                reported_by=f'Dr. {random.choice(["Anand Kulkarni","Smita Joshi","Ravi Shankar","Padma Lakshmi"])} (Radiologist)',
                verified_by=f'Dr. {random.choice(["Mohan Rao","Seema Gupta"])} (Sr. Radiologist)',
                severity=sev,
            ))

        ImagingReport.objects.bulk_create(reports)
        self.stdout.write(self.style.SUCCESS(f'  Created {len(saved_types)} imaging types, {len(orders)} orders, {len(reports)} reports'))

    # ------------------------------------------------------------------
    # 11. Emergency
    # ------------------------------------------------------------------
    def _seed_emergency(self):
        if Ambulance.objects.exists():
            self.stdout.write('  Emergency data already exists, skipping.')
            return

        # Ambulances
        ambulances_data = [
            ('KA-01-AB-1234', 'ADVANCED', 'Raju Gowda', '+919845123456', 'Suresh Babu'),
            ('KA-01-CD-5678', 'BASIC', 'Mohammed Ashraf', '+919845234567', 'Pradeep Kumar'),
            ('KA-01-EF-9012', 'CARDIAC', 'Venkatesh Murthy', '+919845345678', 'Dr. Anitha R'),
            ('KA-01-GH-3456', 'NEONATAL', 'Ramanna Shetty', '+919845456789', 'Kavitha Nair'),
        ]
        amb_objs = []
        for vn, atype, driver, phone, paramedic in ambulances_data:
            amb_objs.append(Ambulance(
                vehicle_number=vn,
                ambulance_type=atype,
                driver_name=driver,
                driver_phone=phone,
                paramedic_name=paramedic,
                status='AVAILABLE',
                current_location='Hospital Premises',
                gps_latitude=Decimal('12.971600'),
                gps_longitude=Decimal('77.594600'),
                last_maintenance_date=self._past_date(60),
                is_active=True,
            ))
        Ambulance.objects.bulk_create(amb_objs)
        saved_ambulances = list(Ambulance.objects.all())

        # Emergency visits
        complaints = [
            (1, 'Cardiac arrest, unresponsive, no pulse', 'AMBULANCE', True),
            (2, 'Severe chest pain radiating to left arm, diaphoresis', 'AMBULANCE', True),
            (2, 'Major road traffic accident, multiple injuries, GCS 10', 'AMBULANCE', True),
            (2, 'Acute stroke symptoms - right-sided weakness, slurred speech, onset 1 hour ago', 'AMBULANCE', True),
            (3, 'Severe abdominal pain with rigidity, suspected perforation', 'WALK_IN', False),
            (3, 'Acute asthma attack, severe breathlessness, SpO2 88%', 'WALK_IN', False),
            (3, 'Dog bite with deep laceration on right leg, bleeding profusely', 'WALK_IN', False),
            (3, 'High-grade fever 104F with altered sensorium', 'REFERRED', False),
            (3, 'Burns 20% BSA - hot oil spill on abdomen and thighs', 'AMBULANCE', True),
            (4, 'Fall from height - 6 feet, complaining of back pain, moving all limbs', 'WALK_IN', False),
            (4, 'Laceration on forehead after fall, moderate bleeding, conscious', 'WALK_IN', False),
            (4, 'Suspected food poisoning, severe vomiting and diarrhea', 'WALK_IN', False),
            (4, 'Allergic reaction - facial swelling, urticaria after medication', 'WALK_IN', False),
            (4, 'Seizure episode, now post-ictal, known epilepsy', 'REFERRED', False),
            (5, 'Minor hand laceration from kitchen knife, bleeding controlled', 'WALK_IN', False),
            (5, 'Insect bite with local swelling, no systemic symptoms', 'WALK_IN', False),
            (5, 'Sprained ankle after missed step, weight bearing with difficulty', 'WALK_IN', False),
            (5, 'Foreign body in eye - metal particle, watering', 'WALK_IN', False),
            (3, 'Organophosphate poisoning - excessive salivation, miosis', 'AMBULANCE', True),
            (2, 'Stab wound to abdomen, hemodynamically unstable', 'POLICE', True),
            (4, 'Snake bite on right foot, fang marks visible, mild local swelling', 'WALK_IN', False),
        ]

        visit_statuses = ['DISCHARGED'] * 10 + ['ADMITTED'] * 4 + ['IN_TREATMENT'] * 3 + ['WAITING'] * 2 + ['TRANSFERRED'] * 1 + ['LEFT_AMA'] * 1
        random.shuffle(visit_statuses)
        dispositions_map = {
            'DISCHARGED': 'DISCHARGED', 'ADMITTED': 'ADMITTED', 'TRANSFERRED': 'TRANSFERRED',
            'LEFT_AMA': 'LEFT_AMA',
        }

        er_visits = []
        for i, (triage, complaint, mode, critical) in enumerate(complaints):
            arrival = self._past_dt(45)
            triage_t = arrival + timedelta(minutes=random.randint(2, 15))
            treat_start = triage_t + timedelta(minutes=random.randint(5, 30))
            vs = visit_statuses[i % len(visit_statuses)]
            discharge_t = treat_start + timedelta(hours=random.randint(1, 8)) if vs in ('DISCHARGED', 'ADMITTED', 'TRANSFERRED', 'LEFT_AMA') else None

            er_visits.append(EmergencyVisit(
                visit_number=f'ER-{100001 + i}',
                patient=self._rp(),
                triage_level=triage,
                chief_complaint=complaint,
                arrival_mode=mode,
                arrival_time=arrival,
                triage_time=triage_t,
                treatment_start_time=treat_start if vs != 'WAITING' else None,
                discharge_time=discharge_t,
                status=vs,
                attending_doctor=self._rd(),
                vitals_on_arrival=f'BP: {random.randint(90,180)}/{random.randint(50,110)}, HR: {random.randint(60,140)}, SpO2: {random.randint(85,100)}%, Temp: {round(random.uniform(97,103),1)}F',
                disposition=dispositions_map.get(vs, ''),
                diagnosis=complaint.split(',')[0],
                treatment_notes='Emergency treatment initiated. Monitoring ongoing.' if vs in ('IN_TREATMENT', 'WAITING') else 'Treatment completed. Patient stable.',
                is_critical=critical,
            ))

        EmergencyVisit.objects.bulk_create(er_visits)
        saved_visits = list(EmergencyVisit.objects.all())

        # Ambulance dispatches
        ambulance_visits = [v for v in saved_visits if v.arrival_mode == 'AMBULANCE']
        dispatches = []
        for i, visit in enumerate(ambulance_visits[:10]):
            amb = saved_ambulances[i % len(saved_ambulances)]
            disp_time = visit.arrival_time - timedelta(minutes=random.randint(20, 45))
            dispatches.append(AmbulanceDispatch(
                ambulance=amb,
                emergency_visit=visit,
                dispatch_time=disp_time,
                arrival_at_scene=disp_time + timedelta(minutes=random.randint(8, 20)),
                departure_from_scene=disp_time + timedelta(minutes=random.randint(22, 35)),
                arrival_at_hospital=visit.arrival_time,
                pickup_location=f'{random.choice(["Near","Opposite","Behind"])} {random.choice(["Majestic","MG Road","Jayanagar 4th Block","Whitefield","Electronic City","Marathahalli","Koramangala 5th Block","HSR Layout","Indiranagar 100ft Road","Malleshwaram Circle"])}',
                priority=random.choice(['HIGH', 'CRITICAL', 'MEDIUM']),
                notes='Patient picked up and transported safely.',
                status='COMPLETED',
            ))

        AmbulanceDispatch.objects.bulk_create(dispatches)

        # Emergency contacts
        contacts_data = [
            ('Dr. Rajendra Prasad', 'ON_CALL_DOCTOR', '+919880011001'),
            ('Dr. Sunil Mehta', 'ON_CALL_DOCTOR', '+919880011002'),
            ('Dr. Kavitha Rao', 'SURGEON', '+919880011003'),
            ('Dr. Anil Kumar', 'SURGEON', '+919880011004'),
            ('Dr. Priya Nair', 'ANESTHESIOLOGIST', '+919880011005'),
            ('Dr. Mohan Das', 'ANESTHESIOLOGIST', '+919880011006'),
            ('Blood Bank In-charge', 'BLOOD_BANK', '+919880011007'),
            ('Bangalore Police Control Room', 'POLICE', '100'),
            ('Fire & Emergency Services', 'FIRE', '101'),
            ('Poison Information Centre NIMHANS', 'POISON_CONTROL', '+918026995000'),
        ]

        ec_objs = []
        for name, role, phone in contacts_data:
            ec_objs.append(EmergencyContact(
                name=name,
                role=role,
                phone_number=phone,
                is_available=True,
            ))
        EmergencyContact.objects.bulk_create(ec_objs)

        self.stdout.write(self.style.SUCCESS(
            f'  Created {len(amb_objs)} ambulances, {len(er_visits)} ER visits, '
            f'{len(dispatches)} dispatches, {len(ec_objs)} emergency contacts'
        ))

    # ------------------------------------------------------------------
    # 12. Operation Theater
    # ------------------------------------------------------------------
    def _seed_operation_theater(self):
        if OperationTheater.objects.exists():
            self.stdout.write('  OperationTheater data already exists, skipping.')
            return

        ot_data = [
            ('Operation Theater 1', 'OT-01', '3', 'MAJOR'),
            ('Operation Theater 2', 'OT-02', '3', 'MAJOR'),
            ('Operation Theater 3', 'OT-03', '3', 'CARDIAC'),
            ('Operation Theater 4', 'OT-04', '3', 'ORTHOPEDIC'),
            ('Operation Theater 5', 'OT-05', '2', 'MINOR'),
            ('Operation Theater 6', 'OT-06', '2', 'EMERGENCY'),
        ]

        ot_objs = []
        for name, code, floor, otype in ot_data:
            ot_objs.append(OperationTheater(
                name=name,
                code=code,
                floor=floor,
                theater_type=otype,
                status='AVAILABLE',
                equipment_list='OT Table, OT Light, Anesthesia Workstation, Electrosurgical Unit, Suction Machine, Patient Monitor, Defibrillator',
                is_active=True,
            ))
        OperationTheater.objects.bulk_create(ot_objs)
        saved_ots = list(OperationTheater.objects.all())

        # Surgeries
        surgery_data = [
            ('Laparoscopic Cholecystectomy', 'Cholelithiasis with recurrent biliary colic', 'ELECTIVE', 'GENERAL', 90),
            ('Total Knee Replacement - Right', 'Severe osteoarthritis right knee, Kellgren-Lawrence Grade 4', 'ELECTIVE', 'SPINAL', 150),
            ('Coronary Artery Bypass Grafting x3', 'Triple vessel coronary artery disease', 'ELECTIVE', 'GENERAL', 300),
            ('Appendectomy - Open', 'Acute appendicitis with perforation', 'EMERGENCY', 'GENERAL', 60),
            ('Cesarean Section', 'Failed induction, fetal distress', 'EMERGENCY', 'SPINAL', 45),
            ('Hernia Repair - Inguinal', 'Right inguinal hernia, reducible', 'ELECTIVE', 'LOCAL', 75),
            ('Cataract Surgery - Phacoemulsification', 'Mature cataract right eye, visual acuity 6/36', 'DAY_CASE', 'LOCAL', 30),
            ('Lumbar Discectomy L4-L5', 'Lumbar disc prolapse L4-L5 with radiculopathy', 'ELECTIVE', 'GENERAL', 120),
            ('Mastectomy - Modified Radical', 'Carcinoma left breast, Stage IIB', 'ELECTIVE', 'GENERAL', 180),
            ('Hip Hemiarthroplasty', 'Displaced femoral neck fracture - elderly', 'EMERGENCY', 'SPINAL', 90),
            ('Thyroidectomy - Total', 'Multinodular goiter with compressive symptoms', 'ELECTIVE', 'GENERAL', 120),
            ('TURP - Transurethral Resection of Prostate', 'Benign Prostatic Hyperplasia with retention', 'ELECTIVE', 'SPINAL', 60),
            ('Laparoscopic Hysterectomy', 'Fibroid uterus with menorrhagia', 'ELECTIVE', 'GENERAL', 120),
            ('Craniotomy for Tumor Excision', 'Right frontal meningioma', 'ELECTIVE', 'GENERAL', 240),
            ('Emergency Laparotomy', 'Duodenal ulcer perforation with peritonitis', 'EMERGENCY', 'GENERAL', 120),
            ('Skin Grafting', 'Post-burn raw area left forearm', 'ELECTIVE', 'GENERAL', 90),
            ('Fracture Fixation - ORIF Tibia', 'Closed fracture right tibia - distal third', 'EMERGENCY', 'SPINAL', 90),
            ('Tonsillectomy', 'Recurrent tonsillitis > 7 episodes/year', 'DAY_CASE', 'GENERAL', 45),
            ('Pacemaker Implantation', 'Complete heart block, symptomatic bradycardia', 'ELECTIVE', 'LOCAL', 60),
            ('Drainage of Abscess', 'Perianal abscess', 'DAY_CASE', 'LOCAL', 30),
            ('Amputation - Below Knee', 'Diabetic foot gangrene, non-salvageable', 'EMERGENCY', 'SPINAL', 90),
        ]

        statuses = ['COMPLETED'] * 12 + ['SCHEDULED'] * 5 + ['IN_PROGRESS'] * 2 + ['CANCELLED'] * 1 + ['POSTPONED'] * 1
        random.shuffle(statuses)

        surgeries = []
        for i, (proc, diag, stype, anesthesia, duration) in enumerate(surgery_data):
            st = statuses[i % len(statuses)]
            sched = self._past_dt(60) if st in ('COMPLETED', 'CANCELLED', 'POSTPONED') else self.now + timedelta(days=random.randint(1, 14))
            actual_start = sched + timedelta(minutes=random.randint(0, 30)) if st in ('COMPLETED', 'IN_PROGRESS') else None
            actual_end = actual_start + timedelta(minutes=duration + random.randint(-15, 30)) if st == 'COMPLETED' and actual_start else None

            surgeries.append(Surgery(
                surgery_number=f'SURG-{100001 + i}',
                patient=self._rp(),
                primary_surgeon=self._rd(),
                operation_theater=random.choice(saved_ots),
                surgery_type=stype,
                procedure_name=proc,
                diagnosis=diag,
                scheduled_date=sched,
                actual_start_time=actual_start,
                actual_end_time=actual_end,
                status=st,
                anesthesia_type=anesthesia,
                pre_op_diagnosis=diag,
                post_op_diagnosis=diag if st == 'COMPLETED' else '',
                procedure_notes=f'{proc} performed successfully. No intra-operative complications.' if st == 'COMPLETED' else '',
                complications='None' if st == 'COMPLETED' and random.random() < 0.8 else ('Minor bleeding controlled intra-operatively' if st == 'COMPLETED' else ''),
                estimated_duration=duration,
                actual_duration=duration + random.randint(-10, 25) if st == 'COMPLETED' else None,
                blood_loss_ml=random.randint(50, 500) if st == 'COMPLETED' else None,
            ))

        Surgery.objects.bulk_create(surgeries)
        saved_surgeries = list(Surgery.objects.all())

        # Surgical teams
        team_members = []
        nurse_names = ['Priya Sharma', 'Anjali Patel', 'Rekha Singh', 'Kavita Reddy', 'Sunita Verma']
        tech_names = ['Rajesh Kumar', 'Suresh Yadav', 'Amit Deshmukh']
        for surg in saved_surgeries:
            team_members.append(SurgicalTeam(surgery=surg, role='SURGEON', member_name=f'Dr. {surg.primary_surgeon.first_name} {surg.primary_surgeon.last_name}'))
            team_members.append(SurgicalTeam(surgery=surg, role='ASSISTANT_SURGEON', member_name=f'Dr. {self._rd().first_name} {self._rd().last_name}'))
            team_members.append(SurgicalTeam(surgery=surg, role='ANESTHESIOLOGIST', member_name=f'Dr. {random.choice(["Priya Nair","Mohan Das","Anitha R","Suresh Babu"])}'))
            team_members.append(SurgicalTeam(surgery=surg, role='SCRUB_NURSE', member_name=random.choice(nurse_names)))
            team_members.append(SurgicalTeam(surgery=surg, role='CIRCULATING_NURSE', member_name=random.choice(nurse_names)))
            team_members.append(SurgicalTeam(surgery=surg, role='TECHNICIAN', member_name=random.choice(tech_names)))

        SurgicalTeam.objects.bulk_create(team_members)

        # Pre-op checklists for scheduled + completed
        checklists = []
        for surg in saved_surgeries:
            if surg.status in ('SCHEDULED', 'COMPLETED', 'IN_PROGRESS'):
                all_checked = surg.status in ('COMPLETED', 'IN_PROGRESS')
                checklists.append(PreOpChecklist(
                    surgery=surg,
                    patient_identity_confirmed=True,
                    consent_signed=True,
                    site_marked=all_checked,
                    allergies_checked=True,
                    blood_type_confirmed=all_checked,
                    blood_units_available=all_checked,
                    npo_status_confirmed=all_checked,
                    pre_op_medications_given=all_checked,
                    imaging_available=all_checked,
                    lab_results_reviewed=all_checked,
                    anesthesia_assessment_done=all_checked,
                    equipment_checked=all_checked,
                    completed_by=f'Nurse {random.choice(nurse_names)}',
                    completed_at=surg.scheduled_date - timedelta(hours=1) if all_checked else None,
                ))
        PreOpChecklist.objects.bulk_create(checklists)

        # Post-op notes for completed
        post_ops = []
        for surg in saved_surgeries:
            if surg.status == 'COMPLETED':
                post_ops.append(PostOpNote(
                    surgery=surg,
                    recovery_status=random.choice(['STABLE', 'GOOD', 'GOOD', 'STABLE']),
                    pain_level=random.randint(2, 7),
                    vitals_stable=True,
                    consciousness_level=random.choice(['ALERT', 'ALERT', 'DROWSY']),
                    instructions=f'Post-{surg.procedure_name}: Monitor vitals every 2 hours. Maintain IV fluids. Start oral feeds as tolerated. Pain management with Paracetamol IV.',
                    diet_instructions=random.choice([
                        'NPO for 6 hours, then clear liquids, soft diet from next day',
                        'Light diet as tolerated from 4 hours post-op',
                        'Clear liquids only for 24 hours, then advance as tolerated',
                    ]),
                    activity_restrictions=random.choice([
                        'Strict bed rest for 24 hours. Ambulation with assistance from Day 2.',
                        'Elevate limb. No weight bearing for 6 weeks.',
                        'Ambulate same day with assistance. Avoid heavy lifting for 4 weeks.',
                    ]),
                    follow_up_date=self.today + timedelta(days=random.randint(7, 30)),
                    complications='None',
                    created_by=f'Dr. {surg.primary_surgeon.first_name} {surg.primary_surgeon.last_name}',
                ))
        PostOpNote.objects.bulk_create(post_ops)

        self.stdout.write(self.style.SUCCESS(
            f'  Created {len(ot_objs)} OTs, {len(surgeries)} surgeries, {len(team_members)} team members, '
            f'{len(checklists)} checklists, {len(post_ops)} post-op notes'
        ))

    # ------------------------------------------------------------------
    # 13. Inventory
    # ------------------------------------------------------------------
    def _seed_inventory(self):
        if AssetCategory.objects.exists():
            self.stdout.write('  Inventory data already exists, skipping.')
            return

        categories_data = [
            ('Medical Equipment', 'Life-saving and diagnostic medical equipment'),
            ('Furniture', 'Hospital furniture including beds, chairs, tables'),
            ('IT Hardware', 'Computers, printers, networking equipment'),
            ('Surgical Instruments', 'Instruments used in operation theaters'),
            ('Diagnostic Equipment', 'Equipment used for diagnostic purposes'),
        ]

        cat_objs = []
        for name, desc in categories_data:
            cat_objs.append(AssetCategory(name=name, description=desc))
        AssetCategory.objects.bulk_create(cat_objs)
        saved_cats = {c.name: c for c in AssetCategory.objects.all()}

        assets_data = [
            ('Ventilator ICU', 'Medical Equipment', 'EQUIPMENT', 'Draeger', 'Savina 300', Decimal('1500000')),
            ('ECG Machine 12-Lead', 'Medical Equipment', 'EQUIPMENT', 'BPL', 'Cardiart 9108', Decimal('85000')),
            ('Defibrillator', 'Medical Equipment', 'EQUIPMENT', 'Philips', 'HeartStart FRx', Decimal('250000')),
            ('Patient Monitor 5-Para', 'Medical Equipment', 'EQUIPMENT', 'Mindray', 'BeneVision N12', Decimal('180000')),
            ('Infusion Pump', 'Medical Equipment', 'EQUIPMENT', 'B Braun', 'Infusomat Space', Decimal('120000')),
            ('Syringe Pump', 'Medical Equipment', 'EQUIPMENT', 'Fresenius Kabi', 'Agilia SP', Decimal('75000')),
            ('Pulse Oximeter', 'Medical Equipment', 'EQUIPMENT', 'Nellcor', 'PM100N', Decimal('25000')),
            ('Nebulizer', 'Medical Equipment', 'EQUIPMENT', 'Omron', 'NE-C28', Decimal('4500')),
            ('Suction Machine', 'Medical Equipment', 'EQUIPMENT', 'Medela', 'Vario 18', Decimal('35000')),
            ('Oxygen Concentrator', 'Medical Equipment', 'EQUIPMENT', 'Philips', 'EverFlo', Decimal('65000')),
            ('Hospital Bed - Electric', 'Furniture', 'FURNITURE', 'Stryker', 'SV2', Decimal('250000')),
            ('Hospital Bed - Manual', 'Furniture', 'FURNITURE', 'Paramount', 'KA-77231A', Decimal('45000')),
            ('Wheelchair - Standard', 'Furniture', 'FURNITURE', 'Karma', 'KM-8520', Decimal('12000')),
            ('Stretcher Trolley', 'Furniture', 'FURNITURE', 'Narang Medical', 'HF-2020', Decimal('35000')),
            ('Examination Table', 'Furniture', 'FURNITURE', 'Biobase', 'BT-EA018', Decimal('28000')),
            ('Bedside Cabinet', 'Furniture', 'FURNITURE', 'Local', 'NA', Decimal('8000')),
            ('Desktop Computer', 'IT Hardware', 'IT_HARDWARE', 'HP', 'ProDesk 400 G7', Decimal('55000')),
            ('Laptop', 'IT Hardware', 'IT_HARDWARE', 'Dell', 'Latitude 5520', Decimal('75000')),
            ('Laser Printer', 'IT Hardware', 'IT_HARDWARE', 'HP', 'LaserJet Pro M404dn', Decimal('25000')),
            ('Network Switch 24-Port', 'IT Hardware', 'IT_HARDWARE', 'Cisco', 'SG350-28', Decimal('40000')),
            ('Surgical Light OT', 'Surgical Instruments', 'INSTRUMENT', 'Mach', 'LED 3SC', Decimal('350000')),
            ('Electrosurgical Unit', 'Surgical Instruments', 'INSTRUMENT', 'Covidien', 'ForceTriad', Decimal('450000')),
            ('Anesthesia Workstation', 'Surgical Instruments', 'INSTRUMENT', 'GE Healthcare', 'Aisys CS2', Decimal('2500000')),
            ('Laparoscopy Tower', 'Surgical Instruments', 'INSTRUMENT', 'Karl Storz', 'IMAGE1 S', Decimal('1800000')),
            ('Autoclave', 'Surgical Instruments', 'INSTRUMENT', 'Tuttnauer', '3870EA', Decimal('200000')),
            ('X-Ray Machine - Digital', 'Diagnostic Equipment', 'EQUIPMENT', 'Siemens', 'Multix Impact', Decimal('3500000')),
            ('Ultrasound Machine', 'Diagnostic Equipment', 'EQUIPMENT', 'GE Healthcare', 'LOGIQ P9', Decimal('2000000')),
            ('CT Scanner', 'Diagnostic Equipment', 'EQUIPMENT', 'Siemens', 'SOMATOM go.Now', Decimal('15000000')),
            ('MRI Machine', 'Diagnostic Equipment', 'EQUIPMENT', 'Philips', 'Ingenia Ambition 1.5T', Decimal('50000000')),
            ('Hematology Analyzer', 'Diagnostic Equipment', 'EQUIPMENT', 'Sysmex', 'XN-1000', Decimal('1200000')),
            ('Biochemistry Analyzer', 'Diagnostic Equipment', 'EQUIPMENT', 'Roche', 'cobas c311', Decimal('1500000')),
        ]

        asset_objs = []
        conditions = ['EXCELLENT'] * 10 + ['GOOD'] * 15 + ['FAIR'] * 5 + ['POOR'] * 1
        random.shuffle(conditions)
        for i, (name, cat_name, atype, mfr, model, price) in enumerate(assets_data):
            purchase = self._past_date(365 * 3)
            cond = conditions[i % len(conditions)]
            asset_objs.append(Asset(
                asset_tag=f'AST-{i+1:06d}',
                name=name,
                category=saved_cats[cat_name],
                asset_type=atype,
                manufacturer=mfr,
                model_number=model,
                serial_number=f'SN-{random.randint(100000, 999999)}',
                purchase_date=purchase,
                purchase_price=price,
                warranty_expiry=purchase + timedelta(days=365 * random.randint(2, 5)),
                department=self._rdept(),
                location=f'Floor {random.randint(1,5)}, Room {random.randint(100,500)}',
                status='ACTIVE' if cond != 'POOR' else random.choice(['ACTIVE', 'IN_REPAIR']),
                condition=cond,
                last_maintenance_date=self._past_date(90),
                next_maintenance_date=self.today + timedelta(days=random.randint(30, 180)),
            ))

        Asset.objects.bulk_create(asset_objs)
        saved_assets = list(Asset.objects.all())

        # Vendors
        vendors_data = [
            ('Hindustan Syringes & Medical Devices', 'V-001', 'MEDICAL_EQUIPMENT', 'Rajiv Sharma', '+911124682000', 'rajiv@hmdsyringes.com', '07AAACH1234F1ZM', 'AAACH1234F'),
            ('Philips India Healthcare', 'V-002', 'MEDICAL_EQUIPMENT', 'Anand Gupta', '+912226564000', 'anand@philips.in', '27AABCP5432G1Z2', 'AABCP5432G'),
            ('GE Healthcare India', 'V-003', 'MEDICAL_EQUIPMENT', 'Priya Singh', '+918041234500', 'priya@gehealthcare.in', '29AADCG7654H1ZP', 'AADCG7654H'),
            ('Siemens Healthineers India', 'V-004', 'MEDICAL_EQUIPMENT', 'Vikram Mehta', '+912261234000', 'vikram@siemens-healthineers.in', '27AABCS9876J1ZR', 'AABCS9876J'),
            ('Cipla Ltd', 'V-005', 'PHARMACEUTICALS', 'Neha Patel', '+912225654000', 'neha@cipla.com', '27AAACC1234B1ZQ', 'AAACC1234B'),
            ('Sun Pharmaceutical', 'V-006', 'PHARMACEUTICALS', 'Rohit Desai', '+912225671234', 'rohit@sunpharma.com', '27AADCS5678D1ZN', 'AADCS5678D'),
            ('B Braun Medical India', 'V-007', 'MEDICAL_EQUIPMENT', 'Manoj Kumar', '+912226789000', 'manoj@bbraun.in', '27AABCB3456E1ZL', 'AABCB3456E'),
            ('HP India Sales Pvt Ltd', 'V-008', 'IT', 'Suresh Iyer', '+918041267890', 'suresh@hp.in', '29AADCH2345F1ZK', 'AADCH2345F'),
            ('Dell Technologies India', 'V-009', 'IT', 'Kavitha Nair', '+918041238765', 'kavitha@dell.in', '29AABCD6789G1ZJ', 'AABCD6789G'),
            ('Narang Medical Ltd', 'V-010', 'GENERAL_SUPPLIES', 'Dinesh Tiwari', '+911145671234', 'dinesh@narangmedical.com', '07AAACN4567H1ZI', 'AAACN4567H'),
            ('Paramount Surgimed', 'V-011', 'MEDICAL_EQUIPMENT', 'Sachin Jain', '+911142345678', 'sachin@paramountsurgimed.com', '07AAACP7890J1ZH', 'AAACP7890J'),
            ('Karl Storz India', 'V-012', 'MEDICAL_EQUIPMENT', 'Meera Reddy', '+918041239876', 'meera@karlstorz.in', '29AABCK5432K1ZG', 'AABCK5432K'),
            ('Mindray India', 'V-013', 'MEDICAL_EQUIPMENT', 'Arun Bhat', '+918045678901', 'arun@mindray.in', '29AADCM2345L1ZF', 'AADCM2345L'),
            ('Roche Diagnostics India', 'V-014', 'MEDICAL_EQUIPMENT', 'Shalini Rao', '+912226543210', 'shalini@roche.in', '27AABCR8765M1ZE', 'AABCR8765M'),
            ('Wipro GE Healthcare', 'V-015', 'MEDICAL_EQUIPMENT', 'Ganesh Pillai', '+918042345678', 'ganesh@wiprogehe.in', '29AADCW1234N1ZD', 'AADCW1234N'),
        ]

        vendor_objs = []
        for name, code, vtype, contact, phone, email, gst, pan in vendors_data:
            vendor_objs.append(Vendor(
                name=name,
                code=code,
                contact_person=contact,
                phone=phone,
                email=email,
                address=f'{random.randint(1,500)}, Industrial Area, {random.choice(["Mumbai","Delhi","Bangalore","Chennai","Hyderabad","Pune"])}',
                gst_number=gst,
                pan_number=pan,
                vendor_type=vtype,
                is_active=True,
                rating=random.randint(3, 5),
            ))
        Vendor.objects.bulk_create(vendor_objs)
        saved_vendors = list(Vendor.objects.all())

        # Purchase orders
        po_items_data = [
            ('Disposable Syringes 5ml (Box of 100)', 50, Decimal('450')),
            ('Surgical Gloves - Sterile (Box of 50)', 100, Decimal('350')),
            ('N95 Masks (Box of 20)', 200, Decimal('500')),
            ('IV Cannula 20G (Box of 50)', 80, Decimal('750')),
            ('ECG Electrodes (Pack of 100)', 30, Decimal('600')),
            ('Pulse Oximeter Finger Probe', 10, Decimal('2500')),
            ('Suture Material - Vicryl 2-0', 50, Decimal('180')),
            ('Foley Catheter 16F', 40, Decimal('120')),
            ('Surgical Drapes - Disposable', 100, Decimal('250')),
            ('Hand Sanitizer 500ml', 200, Decimal('150')),
        ]

        po_statuses = ['RECEIVED'] * 4 + ['ORDERED'] * 2 + ['APPROVED'] * 2 + ['PARTIALLY_RECEIVED'] * 1 + ['DRAFT'] * 1
        random.shuffle(po_statuses)

        for i in range(10):
            vendor = random.choice(saved_vendors)
            order_date = self._past_date(60)
            items_for_po = random.sample(po_items_data, random.randint(2, 4))
            subtotal = sum(qty * price for _, qty, price in items_for_po)
            tax = round(subtotal * Decimal('0.18'), 2)
            total = subtotal + tax
            st = po_statuses[i]

            po = PurchaseOrder.objects.create(
                po_number=f'PO-{i+1:06d}',
                vendor=vendor,
                department=self._rdept(),
                status=st,
                order_date=order_date,
                expected_delivery=order_date + timedelta(days=random.randint(7, 30)),
                subtotal=subtotal,
                tax_amount=tax,
                total_amount=total,
                approved_by=f'Dr. {random.choice(["Verma","Gupta","Singh"])}' if st != 'DRAFT' else '',
            )

            for desc, qty, price in items_for_po:
                rcvd = qty if st == 'RECEIVED' else (random.randint(0, qty) if st == 'PARTIALLY_RECEIVED' else 0)
                PurchaseOrderItem.objects.create(
                    purchase_order=po,
                    description=desc,
                    quantity=qty,
                    unit_price=price,
                    total_price=qty * price,
                    received_quantity=rcvd,
                )

        # Maintenance logs
        maint_types = ['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY', 'CALIBRATION']
        maint_objs = []
        for i in range(20):
            asset = random.choice(saved_assets)
            mdate = self._past_date(90)
            mt = random.choice(maint_types)
            maint_objs.append(MaintenanceLog(
                asset=asset,
                maintenance_type=mt,
                description=random.choice([
                    'Routine preventive maintenance - cleaning, calibration, and functional check',
                    'Battery replacement and software update',
                    'Sensor calibration and accuracy verification',
                    'Motor replacement due to unusual noise during operation',
                    'Annual maintenance contract (AMC) service by OEM engineer',
                    'Emergency repair - power supply unit failure',
                    'Pressure calibration as per schedule',
                    'Filter replacement and general servicing',
                ]),
                performed_by=random.choice([
                    'OEM Service Engineer', 'In-house Biomedical Engineer',
                    'Vendor Service Team', 'Hospital Maintenance Staff',
                ]),
                cost=Decimal(str(random.randint(500, 50000))),
                date=mdate,
                next_due_date=mdate + timedelta(days=random.randint(90, 365)),
                status=random.choice(['COMPLETED', 'COMPLETED', 'SCHEDULED', 'IN_PROGRESS']),
            ))
        MaintenanceLog.objects.bulk_create(maint_objs)

        self.stdout.write(self.style.SUCCESS(
            f'  Created {len(cat_objs)} categories, {len(asset_objs)} assets, '
            f'{len(vendor_objs)} vendors, 10 POs, {len(maint_objs)} maintenance logs'
        ))

    # ------------------------------------------------------------------
    # 14. OPD Queue (today)
    # ------------------------------------------------------------------
    def _seed_opd_queue(self):
        if QueueEntry.objects.exists():
            self.stdout.write('  QueueEntry data already exists, skipping.')
            return

        queue_types = ['APPOINTMENT', 'WALK_IN', 'FOLLOW_UP']
        statuses_list = (
            ['WAITING'] * 5 + ['IN_CONSULTATION'] * 3 + ['COMPLETED'] * 5 +
            ['NO_SHOW'] * 1 + ['SKIPPED'] * 1
        )
        random.shuffle(statuses_list)

        entries = []
        for i in range(15):
            doc = self._rd()
            dept = self._rdept()
            st = statuses_list[i % len(statuses_list)]
            entries.append(QueueEntry(
                token_number=f'Q-{i+1:03d}',
                patient=self._rp(),
                doctor=doc,
                department=dept,
                appointment=self._ra() if random.random() < 0.4 else None,
                queue_type=random.choice(queue_types),
                status=st,
                priority=random.choice(['NORMAL', 'NORMAL', 'NORMAL', 'HIGH', 'EMERGENCY']),
                estimated_wait_minutes=random.randint(5, 45) if st == 'WAITING' else None,
                position=i + 1,
            ))

        QueueEntry.objects.bulk_create(entries)

        # Queue displays
        displays = []
        used_doctors = random.sample(self.doctors, min(5, len(self.doctors)))
        for i, doc in enumerate(used_doctors):
            dept = self._rdept()
            displays.append(QueueDisplay(
                department=dept,
                doctor=doc,
                display_name=f'Dr. {doc.first_name} {doc.last_name} - {dept.name if dept else "General"}',
                current_token=f'Q-{random.randint(1,15):03d}',
                next_tokens=', '.join([f'Q-{random.randint(1,15):03d}' for _ in range(3)]),
                avg_wait_time_minutes=random.randint(10, 30),
                is_active=True,
            ))
        QueueDisplay.objects.bulk_create(displays)

        self.stdout.write(self.style.SUCCESS(f'  Created {len(entries)} queue entries, {len(displays)} queue displays'))

    # ------------------------------------------------------------------
    # 15. Discharge
    # ------------------------------------------------------------------
    def _seed_discharge(self):
        if DischargeSummary.objects.exists():
            self.stdout.write('  DischargeSummary data already exists, skipping.')
            return

        discharge_data = [
            ('Acute Myocardial Infarction', 'Post-MI, medically managed with dual antiplatelet therapy', 'Primary PCI with stent placement to LAD', 'IV Heparin, Aspirin, Clopidogrel, Atorvastatin, Metoprolol', 'Hemodynamically stable, pain-free, ambulating independently'),
            ('Community Acquired Pneumonia', 'Resolved pneumonia with full recovery', 'IV Antibiotics (Ceftriaxone + Azithromycin)', 'Completed 7-day IV antibiotic course, oral antibiotics to continue', 'Afebrile, SpO2 97% on room air, appetite improved'),
            ('Dengue Fever with Thrombocytopenia', 'Recovered dengue, platelets normalizing', 'Supportive care, platelet monitoring', 'IV fluids, Paracetamol, serial platelet counts', 'Platelet count 85000 and rising, no bleeding manifestations'),
            ('Type 2 DM with Diabetic Ketoacidosis', 'Resolved DKA, sugar controlled on insulin', 'IV Insulin infusion transitioned to subcutaneous', 'Insulin Glargine 20U HS, Insulin Aspart sliding scale', 'Blood sugars 140-200 range, ketones cleared, eating well'),
            ('Acute Appendicitis - Post Appendectomy', 'Post-operative day 3 appendectomy, uncomplicated', 'Laparoscopic appendectomy', 'Cefuroxime 500mg BD x 5 days, Paracetamol SOS', 'Wound clean, tolerating diet, afebrile, mobile'),
            ('Fracture Neck of Femur - Post Hemiarthroplasty', 'Post-operative hip hemiarthroplasty', 'Cemented hemiarthroplasty right hip', 'Enoxaparin 40mg OD x 2 weeks, analgesics', 'Mobilizing with walker, wound healthy, DVT prophylaxis ongoing'),
            ('Chronic Kidney Disease with Fluid Overload', 'CKD Stage 4, fluid overload managed with dialysis', 'Hemodialysis x 3 sessions', 'Furosemide, Amlodipine, EPO injection weekly', 'Dry weight achieved, BP controlled, edema resolved'),
            ('Eclampsia - Post LSCS', 'Post-cesarean section for eclampsia, mother and baby well', 'Emergency LSCS, MgSO4 protocol', 'Labetalol, Nifedipine, gradually tapered MgSO4', 'BP stable 130/80, no seizures in 48 hours, breastfeeding established'),
            ('Acute Exacerbation of Asthma', 'Resolved acute asthma exacerbation', 'Nebulization, IV steroids, oxygen therapy', 'Budecort inhaler 200mcg BD, Salbutamol MDI PRN, oral Prednisolone tapering', 'PEFR improved to 85% predicted, comfortable on room air'),
            ('Road Traffic Accident - Polytrauma', 'Managed polytrauma with conservative treatment', 'Fracture splinting, wound debridement, chest tube', 'Analgesics, antibiotics, DVT prophylaxis', 'Fractures immobilized, chest drain removed, wounds healing'),
            ('Viral Hepatitis A', 'Resolved hepatitis A, LFT improving', 'Supportive care', 'IV fluids, hepatoprotective agents, antiemetics', 'Jaundice reducing, appetite improved, LFT trending down'),
            ('Seizure Disorder - Status Epilepticus', 'Status epilepticus controlled, maintenance started', 'IV Lorazepam, Phenytoin loading, Levetiracetam', 'Levetiracetam 500mg BD, Phenytoin 100mg TDS', 'No further seizures in 72 hours, EEG improved, alert and oriented'),
            ('Cholelithiasis - Post Laparoscopic Cholecystectomy', 'Post-op day 2 lap chole, uneventful recovery', 'Laparoscopic cholecystectomy', 'Paracetamol, Pantoprazole 40mg OD', 'Tolerating normal diet, port sites clean, pain minimal'),
            ('Pulmonary Tuberculosis', 'Initiated ATT, sputum sent for culture', 'DOTS Category I ATT initiated', 'HRZE kit as per RNTCP guidelines', 'Cough reducing, appetite improved, no drug side effects'),
            ('Hyperemesis Gravidarum', 'Resolved hyperemesis, tolerating oral intake', 'IV fluids, antiemetics, electrolyte correction', 'Ondansetron 4mg SOS, Doxylamine 10mg, B6 supplements', 'No vomiting x 24 hours, eating normally, USG shows viable fetus'),
        ]

        summaries = []
        for i, (adm_diag, dis_diag, procs, treatment, condition) in enumerate(discharge_data):
            adm_date = self._past_date(60)
            dis_date = adm_date + timedelta(days=random.randint(2, 14))
            doc = self._rd()
            patient = self._rp()
            dtype = 'NORMAL' if random.random() < 0.85 else random.choice(['AGAINST_MEDICAL_ADVICE', 'TRANSFERRED'])
            summaries.append(DischargeSummary(
                summary_number=f'DS-{i+1:06d}',
                patient=patient,
                doctor=doc,
                appointment=self._ra() if random.random() < 0.4 else None,
                admission_date=adm_date,
                discharge_date=dis_date,
                discharge_type=dtype,
                admission_diagnosis=adm_diag,
                discharge_diagnosis=dis_diag,
                procedures_performed=procs,
                treatment_given=treatment,
                condition_at_discharge=condition,
                medications_on_discharge=treatment,
                dietary_instructions=random.choice([
                    'Low salt, low fat diet. Avoid fried foods. Small frequent meals.',
                    'Diabetic diet - 1800 kcal. Avoid sweets and refined carbs.',
                    'Soft diet for 1 week, then normal diet. Plenty of fluids.',
                    'High protein diet. Egg whites, dal, chicken. Adequate hydration.',
                ]),
                activity_restrictions=random.choice([
                    'Avoid heavy lifting for 4 weeks. Gradual return to normal activity.',
                    'Bed rest for 1 week. Light walking from week 2.',
                    'No strenuous activity. Wound care as instructed.',
                    'Resume normal activities gradually. Avoid driving for 2 weeks.',
                ]),
                follow_up_instructions=f'Follow-up in OPD after {random.choice([7,10,14])} days with reports.',
                follow_up_date=dis_date + timedelta(days=random.randint(7, 21)),
                emergency_instructions='Visit ER immediately if: high fever, bleeding, severe pain, breathlessness, or any new symptoms.',
                status=random.choice(['APPROVED', 'COMPLETED', 'APPROVED']),
                approved_by=f'Dr. {doc.first_name} {doc.last_name}',
            ))

        DischargeSummary.objects.bulk_create(summaries)
        saved_summaries = list(DischargeSummary.objects.all())

        # Follow-ups
        follow_up_data = [
            ('POST_DISCHARGE', 'Review of recovery progress and medication compliance'),
            ('POST_SURGERY', 'Wound check and suture removal'),
            ('ROUTINE', 'Blood pressure and sugar monitoring'),
            ('LAB_REVIEW', 'Review of LFT and CBC reports'),
            ('IMAGING_REVIEW', 'Review of follow-up X-ray chest'),
            ('MEDICATION_REVIEW', 'Assessment of drug response and side effects'),
            ('POST_DISCHARGE', 'Post-discharge assessment for cardiac rehabilitation'),
            ('POST_SURGERY', 'Post-operative physiotherapy assessment'),
            ('ROUTINE', 'Routine diabetic foot examination'),
            ('LAB_REVIEW', 'Review of HbA1c and lipid profile'),
        ]

        fu_statuses = ['COMPLETED'] * 4 + ['SCHEDULED'] * 4 + ['MISSED'] * 1 + ['RESCHEDULED'] * 1
        random.shuffle(fu_statuses)

        fu_objs = []
        for i, (ftype, reason) in enumerate(follow_up_data):
            ds = random.choice(saved_summaries)
            sched = ds.discharge_date + timedelta(days=random.randint(7, 30))
            st = fu_statuses[i % len(fu_statuses)]
            fu_objs.append(FollowUp(
                patient=ds.patient,
                doctor=ds.doctor,
                discharge_summary=ds,
                scheduled_date=sched,
                follow_up_type=ftype,
                status=st,
                reason=reason,
                completed_date=sched if st == 'COMPLETED' else None,
                notes='Patient reviewed. Recovery satisfactory.' if st == 'COMPLETED' else '',
            ))

        FollowUp.objects.bulk_create(fu_objs)

        # Readmissions
        readm_objs = []
        for i in range(min(3, len(saved_summaries))):
            ds = saved_summaries[i]
            readm_date = ds.discharge_date + timedelta(days=random.randint(3, 28))
            readm_objs.append(Readmission(
                patient=ds.patient,
                original_discharge=ds,
                readmission_date=readm_date,
                reason=random.choice([
                    'Recurrence of symptoms - fever and breathlessness',
                    'Wound infection post surgery requiring IV antibiotics',
                    'Uncontrolled blood sugars despite compliance with medications',
                ]),
                is_related_to_original=random.choice([True, True, False]),
                days_since_discharge=(readm_date - ds.discharge_date).days,
            ))

        Readmission.objects.bulk_create(readm_objs)

        self.stdout.write(self.style.SUCCESS(
            f'  Created {len(summaries)} discharge summaries, {len(fu_objs)} follow-ups, {len(readm_objs)} readmissions'
        ))
