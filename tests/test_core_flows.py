"""
Core test suite for Healthcare Management System.
Tests critical business flows: auth, appointments, prescriptions, billing.
Run: python manage.py test tests
"""
from decimal import Decimal
from datetime import date, time, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class AuthenticationTests(TestCase):
    """Test user authentication flows"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@hospital.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            role='admin',
        )

    def test_login_success(self):
        response = self.client.post('/api/auth/login/', {
            'email': 'test@hospital.com',
            'password': 'testpass123',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['email'], 'test@hospital.com')

    def test_login_wrong_password(self):
        response = self.client.post('/api/auth/login/', {
            'email': 'test@hospital.com',
            'password': 'wrongpass',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_register(self):
        response = self.client.post('/api/auth/register/', {
            'email': 'newuser@hospital.com',
            'password': 'newpass123',
            'confirm_password': 'newpass123',
            'first_name': 'New',
            'last_name': 'User',
            'role': 'patient',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_profile_requires_auth(self):
        response = self.client.get('/api/auth/profile/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/auth/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'test@hospital.com')


class PatientTests(TestCase):
    """Test patient management"""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin@hospital.com', password='admin123',
            role='admin', is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)

    def test_create_patient(self):
        response = self.client.post('/api/patients/', {
            'first_name': 'Rahul',
            'last_name': 'Sharma',
            'date_of_birth': '1990-01-15',
            'gender': 'M',
            'phone_number': '9876543210',
            'email': 'rahul@test.com',
            'address': '123 Test Street',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['first_name'], 'Rahul')

    def test_patient_list(self):
        from patients.models import Patient
        Patient.objects.create(
            first_name='Test', last_name='Patient',
            date_of_birth='1990-01-01', gender='M',
            phone_number='1234567890', email='patient@test.com',
            address='Test Address',
        )
        response = self.client.get('/api/patients/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class DoctorTests(TestCase):
    """Test doctor management"""

    def setUp(self):
        self.client = APIClient()
        from doctors.models import Doctor
        self.doctor = Doctor.objects.create(
            first_name='Rajesh', last_name='Kumar',
            specialization='CARDIOLOGY',
            license_number='DOC001',
            phone_number='9876543210',
            email='doctor@test.com',
            qualification='MD, DM',
            experience_years=15,
            consultation_fee=Decimal('500.00'),
            available_days='Mon,Tue,Wed,Thu,Fri',
            available_hours_start=time(9, 0),
            available_hours_end=time(17, 0),
        )

    def test_doctor_list_public(self):
        response = self.client.get('/api/doctors/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_doctor_detail(self):
        response = self.client.get(f'/api/doctors/{self.doctor.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['first_name'], 'Rajesh')


class SymptomMappingTests(TestCase):
    """Test symptom-to-specialization mapping"""

    def test_chest_pain_maps_to_cardiology(self):
        from appointments.models import get_specializations_for_symptoms
        specs = get_specializations_for_symptoms('I have chest pain')
        self.assertIn('CARDIOLOGY', specs)

    def test_headache_maps_to_neurology(self):
        from appointments.models import get_specializations_for_symptoms
        specs = get_specializations_for_symptoms('severe headache and migraine')
        self.assertIn('NEUROLOGY', specs)

    def test_multiple_symptoms(self):
        from appointments.models import get_specializations_for_symptoms
        specs = get_specializations_for_symptoms('chest pain and joint pain')
        self.assertIn('CARDIOLOGY', specs)
        self.assertIn('ORTHOPEDICS', specs)

    def test_unknown_defaults_to_general(self):
        from appointments.models import get_specializations_for_symptoms
        specs = get_specializations_for_symptoms('feeling unwell')
        self.assertEqual(specs, ['GENERAL'])

    def test_empty_defaults_to_general(self):
        from appointments.models import get_specializations_for_symptoms
        specs = get_specializations_for_symptoms('')
        self.assertEqual(specs, ['GENERAL'])


class DrugInteractionTests(TestCase):
    """Test drug interaction checker"""

    def setUp(self):
        from prescriptions.models import DrugInteraction
        DrugInteraction.objects.create(
            drug_a='Warfarin', drug_b='Aspirin',
            severity='SEVERE',
            description='Increased bleeding risk',
        )

    def test_interaction_found(self):
        from prescriptions.models import DrugInteraction
        from django.db.models import Q
        found = DrugInteraction.objects.filter(
            Q(drug_a__icontains='warfarin', drug_b__icontains='aspirin') |
            Q(drug_a__icontains='aspirin', drug_b__icontains='warfarin')
        )
        self.assertEqual(found.count(), 1)
        self.assertEqual(found.first().severity, 'SEVERE')


class VitalsThresholdTests(TestCase):
    """Test vitals threshold alerting"""

    def setUp(self):
        from patients.models import Patient
        self.patient = Patient.objects.create(
            first_name='Test', last_name='Patient',
            date_of_birth='1990-01-01', gender='M',
            phone_number='1234567890', email='vtest@test.com',
            address='Test Address',
        )

    def test_high_bp_alert(self):
        from vitals.models import VitalSign
        vital = VitalSign.objects.create(
            patient=self.patient,
            blood_pressure_systolic=185,
            blood_pressure_diastolic=95,
        )
        alerts = vital.check_thresholds()
        severities = [a['severity'] for a in alerts]
        self.assertIn('CRITICAL', severities)

    def test_low_oxygen_alert(self):
        from vitals.models import VitalSign
        vital = VitalSign.objects.create(
            patient=self.patient,
            oxygen_saturation=Decimal('88.0'),
        )
        alerts = vital.check_thresholds()
        self.assertTrue(any(a['vital'] == 'SpO2' for a in alerts))

    def test_normal_vitals_no_alert(self):
        from vitals.models import VitalSign
        vital = VitalSign.objects.create(
            patient=self.patient,
            blood_pressure_systolic=120,
            blood_pressure_diastolic=80,
            pulse_rate=72,
            oxygen_saturation=Decimal('98.0'),
            temperature=Decimal('98.6'),
        )
        alerts = vital.check_thresholds()
        self.assertEqual(len(alerts), 0)


class AccountingTests(TestCase):
    """Test accounting models"""

    def test_account_group_creation(self):
        from accounting.models import AccountGroup
        group = AccountGroup.objects.create(
            name='Test Assets', code='TA',
            group_type='ASSET', nature='DEBIT',
        )
        self.assertEqual(str(group), 'TA - Test Assets')

    def test_journal_entry_balance(self):
        from accounting.models import AccountGroup, Account, JournalEntry, JournalEntryLine
        group = AccountGroup.objects.create(
            name='Test', code='T1', group_type='ASSET', nature='DEBIT',
        )
        acc1 = Account.objects.create(name='Cash', code='C1', account_group=group)
        acc2 = Account.objects.create(name='Revenue', code='R1', account_group=group)
        entry = JournalEntry.objects.create(
            date=date.today(),
            description='Test entry',
            total_debit=Decimal('1000'),
            total_credit=Decimal('1000'),
        )
        JournalEntryLine.objects.create(
            journal_entry=entry, account=acc1,
            debit=Decimal('1000'), credit=Decimal('0'),
        )
        JournalEntryLine.objects.create(
            journal_entry=entry, account=acc2,
            debit=Decimal('0'), credit=Decimal('1000'),
        )
        self.assertTrue(entry.is_balanced)


class PermissionTests(TestCase):
    """Test role-based access control"""

    def setUp(self):
        self.client = APIClient()
        self.patient_user = User.objects.create_user(
            email='patient@test.com', password='pass123', role='patient',
        )
        self.admin_user = User.objects.create_user(
            email='admin@test.com', password='pass123', role='admin', is_staff=True,
        )

    def test_patient_cannot_access_staff(self):
        self.client.force_authenticate(user=self.patient_user)
        response = self.client.get('/api/staff/staff-members/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_access_staff(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/staff/staff-members/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
