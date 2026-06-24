"""
Create user accounts for every role category with properly linked profiles.
Usage: python manage.py create_role_accounts --password <secure_password>
"""
import secrets
from django.core.management.base import BaseCommand
from django.db import transaction
from users.models import User
from patients.models import Patient
from doctors.models import Doctor


class Command(BaseCommand):
    help = 'Create user accounts for all role categories with linked profiles'

    def add_arguments(self, parser):
        parser.add_argument(
            '--password',
            type=str,
            help='Password for all created accounts (if not provided, a random password is generated)',
        )

    def handle(self, *args, **options):
        password = options.get('password')
        if not password:
            password = secrets.token_urlsafe(16)
            self.stdout.write(self.style.WARNING(f'\nNo --password provided. Generated password: {password}'))
            self.stdout.write(self.style.WARNING('Save this password — it will not be shown again.\n'))

        self.stdout.write('\nCreating role-based user accounts...\n')

        # ──────────────────────────────────────────────
        # 1. ADMIN ACCOUNTS
        # ──────────────────────────────────────────────
        admins = [
            {
                'email': 'admin@hospital.com',
                'password': password,
                'first_name': 'Super',
                'last_name': 'Admin',
                'phone_number': '+919000000001',
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'email': 'admin2@hospital.com',
                'password': password,
                'first_name': 'Ravi',
                'last_name': 'Administrator',
                'phone_number': '+919000000002',
                'is_staff': True,
                'is_superuser': True,
            },
        ]

        for data in admins:
            user, created = User.objects.get_or_create(
                email=data['email'],
                defaults={
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'phone_number': data['phone_number'],
                    'role': 'admin',
                    'is_staff': data.get('is_staff', True),
                    'is_superuser': data.get('is_superuser', True),
                },
            )
            if created:
                user.set_password(data['password'])
                user.save()
                self.stdout.write(f'  Created admin: {data["email"]}')
            else:
                self.stdout.write(f'  Exists: {data["email"]}')

        # ──────────────────────────────────────────────
        # 2. DOCTOR ACCOUNTS (link to Doctor model)
        # ──────────────────────────────────────────────
        doctor_accounts = [
            {'email': 'doctor@hospital.com', 'doctor_idx': 0},
            {'email': 'dr.cardio@hospital.com', 'spec': 'CARDIOLOGY', 'first_name': 'Vikram', 'last_name': 'Mehta'},
            {'email': 'dr.neuro@hospital.com', 'spec': 'NEUROLOGY', 'first_name': 'Priya', 'last_name': 'Kapoor'},
            {'email': 'dr.ortho@hospital.com', 'spec': 'ORTHOPEDICS', 'first_name': 'Suresh', 'last_name': 'Reddy'},
            {'email': 'dr.pediatrics@hospital.com', 'spec': 'PEDIATRICS', 'first_name': 'Ananya', 'last_name': 'Gupta'},
            {'email': 'dr.general@hospital.com', 'spec': 'GENERAL', 'first_name': 'Deepak', 'last_name': 'Singh'},
        ]

        existing_doctors = list(Doctor.objects.all()[:25])
        used_doctor_ids = set(
            User.objects.filter(doctor_profile__isnull=False).values_list('doctor_profile_id', flat=True)
        )

        for i, data in enumerate(doctor_accounts):
            if data['email'] == 'doctor@hospital.com':
                # Already exists, just ensure profile link
                user = User.objects.filter(email=data['email']).first()
                if user and not user.doctor_profile and existing_doctors:
                    user.doctor_profile = existing_doctors[0]
                    user.save()
                    self.stdout.write(f'  Linked: {data["email"]} -> Doctor #{existing_doctors[0].id}')
                else:
                    self.stdout.write(f'  Exists: {data["email"]}')
                continue

            # Find or create a doctor profile
            doctor_profile = None
            spec = data.get('spec', 'GENERAL')
            # Try to find an unlinked doctor with matching specialization
            for d in existing_doctors:
                if d.id not in used_doctor_ids and d.specialization == spec:
                    doctor_profile = d
                    break
            # Fallback: find any unlinked doctor
            if not doctor_profile:
                for d in existing_doctors:
                    if d.id not in used_doctor_ids:
                        doctor_profile = d
                        break

            user, created = User.objects.get_or_create(
                email=data['email'],
                defaults={
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'phone_number': f'+9190000100{i}',
                    'role': 'doctor',
                    'doctor_profile': doctor_profile,
                },
            )
            if created:
                user.set_password(password)
                user.save()
                if doctor_profile:
                    used_doctor_ids.add(doctor_profile.id)
                self.stdout.write(f'  Created doctor: {data["email"]} -> Doctor #{doctor_profile.id if doctor_profile else "None"} ({spec})')
            else:
                if not user.doctor_profile and doctor_profile:
                    user.doctor_profile = doctor_profile
                    user.save()
                    used_doctor_ids.add(doctor_profile.id)
                self.stdout.write(f'  Exists: {data["email"]}')

        # ──────────────────────────────────────────────
        # 3. PATIENT ACCOUNTS (link to Patient model)
        # ──────────────────────────────────────────────
        patient_accounts = [
            {'email': 'patient@hospital.com', 'patient_idx': 0},
            {'email': 'patient.rahul@hospital.com', 'first_name': 'Rahul', 'last_name': 'Verma'},
            {'email': 'patient.meera@hospital.com', 'first_name': 'Meera', 'last_name': 'Joshi'},
            {'email': 'patient.amit@hospital.com', 'first_name': 'Amit', 'last_name': 'Kumar'},
            {'email': 'patient.sunita@hospital.com', 'first_name': 'Sunita', 'last_name': 'Devi'},
            {'email': 'patient.arjun@hospital.com', 'first_name': 'Arjun', 'last_name': 'Nair'},
        ]

        existing_patients = list(Patient.objects.all()[:60])
        used_patient_ids = set(
            User.objects.filter(patient_profile__isnull=False).values_list('patient_profile_id', flat=True)
        )

        for i, data in enumerate(patient_accounts):
            if data['email'] == 'patient@hospital.com':
                user = User.objects.filter(email=data['email']).first()
                if user and not user.patient_profile and existing_patients:
                    user.patient_profile = existing_patients[0]
                    user.save()
                    self.stdout.write(f'  Linked: {data["email"]} -> Patient #{existing_patients[0].id}')
                else:
                    self.stdout.write(f'  Exists: {data["email"]}')
                continue

            # Find an unlinked patient
            patient_profile = None
            for p in existing_patients:
                if p.id not in used_patient_ids:
                    patient_profile = p
                    break

            user, created = User.objects.get_or_create(
                email=data['email'],
                defaults={
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'phone_number': f'+9190000200{i}',
                    'role': 'patient',
                    'patient_profile': patient_profile,
                },
            )
            if created:
                user.set_password(password)
                user.save()
                if patient_profile:
                    used_patient_ids.add(patient_profile.id)
                pname = f'{patient_profile.first_name} {patient_profile.last_name}' if patient_profile else 'N/A'
                pid = patient_profile.id if patient_profile else 'None'
                self.stdout.write(f'  Created patient: {data["email"]} -> Patient #{pid} ({pname})')
            else:
                if not user.patient_profile and patient_profile:
                    user.patient_profile = patient_profile
                    user.save()
                    used_patient_ids.add(patient_profile.id)
                self.stdout.write(f'  Exists: {data["email"]}')

        # ──────────────────────────────────────────────
        # 4. STAFF ACCOUNTS (different departments)
        # ──────────────────────────────────────────────
        staff_accounts = [
            {'email': 'staff@hospital.com', 'first_name': 'Staff', 'last_name': 'Manager'},
            {'email': 'nurse@hospital.com', 'first_name': 'Kavita', 'last_name': 'Sharma', 'title': 'Head Nurse'},
            {'email': 'receptionist@hospital.com', 'first_name': 'Pooja', 'last_name': 'Singh', 'title': 'Receptionist'},
            {'email': 'pharmacist@hospital.com', 'first_name': 'Manoj', 'last_name': 'Pandey', 'title': 'Pharmacist'},
            {'email': 'labtech@hospital.com', 'first_name': 'Sanjay', 'last_name': 'Tiwari', 'title': 'Lab Technician'},
            {'email': 'billing@hospital.com', 'first_name': 'Neha', 'last_name': 'Agarwal', 'title': 'Billing Officer'},
        ]

        for i, data in enumerate(staff_accounts):
            user, created = User.objects.get_or_create(
                email=data['email'],
                defaults={
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'phone_number': f'+9190000300{i}',
                    'role': 'staff',
                },
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(f'  Created staff: {data["email"]} ({data.get("title", "Staff")})')
            else:
                self.stdout.write(f'  Exists: {data["email"]}')

        # ──────────────────────────────────────────────
        # SUMMARY
        # ──────────────────────────────────────────────
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write('  ALL LOGIN CREDENTIALS')
        self.stdout.write('=' * 60)

        self.stdout.write('\n  ADMIN ACCOUNTS:')
        for u in User.objects.filter(role='admin').order_by('email'):
            self.stdout.write(f'    {u.email:<40} {u.first_name} {u.last_name}')

        self.stdout.write('\n  DOCTOR ACCOUNTS:')
        for u in User.objects.filter(role='doctor', email__contains='@hospital.com').order_by('email'):
            dp = u.doctor_profile
            spec = dp.get_specialization_display() if dp else 'Not linked'
            self.stdout.write(f'    {u.email:<40} Dr. {u.first_name} {u.last_name} ({spec})')

        self.stdout.write('\n  PATIENT ACCOUNTS:')
        for u in User.objects.filter(role='patient', email__contains='@hospital.com').order_by('email'):
            pp = u.patient_profile
            info = f'Patient #{pp.id} - {pp.first_name} {pp.last_name}' if pp else 'Not linked'
            self.stdout.write(f'    {u.email:<40} {u.first_name} {u.last_name} ({info})')

        self.stdout.write('\n  STAFF ACCOUNTS:')
        for u in User.objects.filter(role='staff', email__contains='@hospital.com').exclude(email__contains='staff.').order_by('email'):
            self.stdout.write(f'    {u.email:<40} {u.first_name} {u.last_name}')

        total = User.objects.filter(email__contains='@hospital.com').count()
        self.stdout.write(f'\n  Total accounts: {total}')
        self.stdout.write(f'  Password for all: (the password you provided via --password)\n')
