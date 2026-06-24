from django.shortcuts import render
from django.db.models import Count, Sum, Case, When, F, IntegerField, Avg, Q, DecimalField
from django.db.models.functions import Trunc, ExtractMonth
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.views import APIView
from datetime import datetime, timedelta
from users.permissions import IsAdminOrStaff, IsClinicalStaff
from .models import DailyMetrics, DoctorPerformance, PatientActivity
from appointments.models import Appointment
from doctors.models import Doctor
from patients.models import Patient
from departments.models import Department, Ward, Bed
from emergency.models import EmergencyVisit, Ambulance
from billing.models import Invoice, Payment
from blood_bank.models import BloodUnit, BloodRequest
from operation_theater.models import OperationTheater, Surgery
from opd_queue.models import QueueEntry
from discharge.models import DischargeSummary
from .serializers import (
    DailyMetricsSerializer, DoctorPerformanceSerializer, PatientActivitySerializer,
    AppointmentsByStatusSerializer, AppointmentsByDoctorSerializer, PatientStatisticsSerializer,
    RevenueStatisticsSerializer
)
class AnalyticsPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_staff or
            request.user.is_admin or
            request.user.is_doctor
        )
class DashboardView(APIView):
    permission_classes = [IsClinicalStaff]
    def get(self, request, format=None):
        today = timezone.now().date()
        start_of_month = today.replace(day=1)
        last_month = (start_of_month - timedelta(days=1)).replace(day=1)
        total_patients = Patient.objects.count()
        total_doctors = Doctor.objects.count()
        total_appointments = Appointment.objects.count()
        appointment_stats = self._get_appointment_stats()
        recent_appointments = Appointment.objects.filter(
            appointment_date__gte=today - timedelta(days=7)
        ).order_by('-appointment_date')[:5]
        top_doctors = self._get_top_doctors(5)
        patient_stats = self._get_patient_stats(start_of_month)
        return Response({
            'total_patients': total_patients,
            'total_doctors': total_doctors,
            'total_appointments': total_appointments,
            'appointment_stats': appointment_stats,
            'top_doctors': top_doctors,
            'patient_stats': patient_stats,
        })
    def _get_appointment_stats(self):
        appointment_counts = Appointment.objects.aggregate(
            scheduled=Count(Case(When(status='SCHEDULED', then=1), output_field=IntegerField())),
            completed=Count(Case(When(status='COMPLETED', then=1), output_field=IntegerField())),
            cancelled=Count(Case(When(status='CANCELLED', then=1), output_field=IntegerField())),
            no_show=Count(Case(When(status='NO_SHOW', then=1), output_field=IntegerField())),
            total=Count('id')
        )
        return AppointmentsByStatusSerializer(appointment_counts).data
    def _get_top_doctors(self, limit=5):
        doctors = Doctor.objects.annotate(
            appointment_count=Count('appointments'),
            completed_count=Count(Case(When(appointments__status='COMPLETED', then=1), output_field=IntegerField()))
        ).order_by('-appointment_count')[:limit]
        result = []
        for doctor in doctors:
            completion_rate = 0
            if doctor.appointment_count > 0:
                completion_rate = (doctor.completed_count / doctor.appointment_count) * 100
            result.append({
                'doctor_id': doctor.id,
                'doctor_name': f"Dr. {doctor.first_name} {doctor.last_name}",
                'specialization': doctor.get_specialization_display(),
                'appointment_count': doctor.appointment_count,
                'completed_count': doctor.completed_count,
                'completion_rate': round(completion_rate, 1)
            })
        return result
    def _get_patient_stats(self, start_of_month):
        today = timezone.now().date()
        total_patients = Patient.objects.count()
        new_patients_this_month = Patient.objects.filter(created_at__gte=start_of_month).count()
        patients_with_appointments = Patient.objects.filter(appointments__isnull=False).distinct().count()
        gender_distribution = {
            gender[0]: Patient.objects.filter(gender=gender[0]).count()
            for gender in Patient.GENDER_CHOICES
        }
        blood_groups = Patient.objects.exclude(blood_group__isnull=True).exclude(blood_group='').values('blood_group').annotate(
            count=Count('id')
        )
        blood_group_distribution = {item['blood_group']: item['count'] for item in blood_groups}
        return {
            'total_patients': total_patients,
            'new_patients_this_month': new_patients_this_month,
            'patients_with_appointments': patients_with_appointments,
            'gender_distribution': gender_distribution,
            'blood_group_distribution': blood_group_distribution,
        }
class AppointmentAnalyticsView(APIView):
    permission_classes = [IsClinicalStaff]
    def get(self, request, format=None):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        queryset = Appointment.objects.all()
        if start_date:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                queryset = queryset.filter(appointment_date__gte=start_date)
            except ValueError:
                pass
        if end_date:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                queryset = queryset.filter(appointment_date__lte=end_date)
            except ValueError:
                pass
        appointments_by_status = self._get_appointments_by_status(queryset)
        appointments_by_doctor = self._get_appointments_by_doctor(queryset)
        appointments_by_month = self._get_appointments_by_month(queryset)
        appointments_by_day = self._get_appointments_by_day(queryset)
        return Response({
            'appointments_by_status': appointments_by_status,
            'appointments_by_doctor': appointments_by_doctor,
            'appointments_by_month': appointments_by_month,
            'appointments_by_day': appointments_by_day,
        })
    def _get_appointments_by_status(self, queryset):
        status_counts = queryset.values('status').annotate(count=Count('id'))
        result = {item['status'].lower(): item['count'] for item in status_counts}
        result['total'] = sum(result.values())
        return result
    def _get_appointments_by_doctor(self, queryset):
        doctor_stats = queryset.values(
            'doctor__id', 'doctor__first_name', 'doctor__last_name', 'doctor__specialization'
        ).annotate(
            count=Count('id'),
            completed=Count(Case(When(status='COMPLETED', then=1), output_field=IntegerField()))
        ).order_by('-count')
        result = []
        for stat in doctor_stats:
            completion_rate = 0
            if stat['count'] > 0:
                completion_rate = (stat['completed'] / stat['count']) * 100
            doctor_name = f"Dr. {stat['doctor__first_name']} {stat['doctor__last_name']}"
            specialization = stat['doctor__specialization']
            try:
                doctor = Doctor.objects.get(id=stat['doctor__id'])
                specialization = doctor.get_specialization_display()
            except Doctor.DoesNotExist:
                pass
            result.append({
                'doctor_id': stat['doctor__id'],
                'doctor_name': doctor_name,
                'specialization': specialization,
                'appointment_count': stat['count'],
                'completed_count': stat['completed'],
                'completion_rate': round(completion_rate, 1)
            })
        return result
    def _get_appointments_by_month(self, queryset):
        months = queryset.annotate(
            month=ExtractMonth('appointment_date')
        ).values('month').annotate(count=Count('id')).order_by('month')
        month_names = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ]
        result = {}
        for item in months:
            month_idx = item['month'] - 1  # Convert 1-based to 0-based index
            month_name = month_names[month_idx]
            result[month_name] = item['count']
        return result
    def _get_appointments_by_day(self, queryset):
        days = queryset.annotate(
            day=Trunc('appointment_date', 'day')
        ).values('day').annotate(count=Count('id')).order_by('day')
        result = {}
        for item in days:
            day_str = item['day'].strftime('%Y-%m-%d')
            result[day_str] = item['count']
        return result
class DoctorAnalyticsView(APIView):
    permission_classes = [IsClinicalStaff]
    def get(self, request, format=None):
        doctor_id = request.query_params.get('doctor_id')
        if doctor_id:
            return self._get_single_doctor_analytics(doctor_id)
        else:
            return self._get_all_doctors_analytics()
    def _get_single_doctor_analytics(self, doctor_id):
        try:
            doctor = Doctor.objects.get(id=doctor_id)
        except Doctor.DoesNotExist:
            return Response({"error": "Doctor not found"}, status=status.HTTP_404_NOT_FOUND)
        appointments = Appointment.objects.filter(doctor=doctor)
        total_appointments = appointments.count()
        completed_appointments = appointments.filter(status='COMPLETED').count()
        cancelled_appointments = appointments.filter(status='CANCELLED').count()
        no_show_appointments = appointments.filter(status='NO_SHOW').count()
        completion_rate = 0
        if total_appointments > 0:
            completion_rate = (completed_appointments / total_appointments) * 100
        monthly_appointments = self._get_monthly_appointments(appointments)
        total_revenue = doctor.consultation_fee * completed_appointments
        return Response({
            'doctor_id': doctor.id,
            'doctor_name': f"Dr. {doctor.first_name} {doctor.last_name}",
            'specialization': doctor.get_specialization_display(),
            'total_appointments': total_appointments,
            'completed_appointments': completed_appointments,
            'cancelled_appointments': cancelled_appointments,
            'no_show_appointments': no_show_appointments,
            'completion_rate': round(completion_rate, 1),
            'monthly_appointments': monthly_appointments,
            'total_revenue': total_revenue,
            'consultation_fee': doctor.consultation_fee
        })
    def _get_all_doctors_analytics(self):
        doctors = Doctor.objects.annotate(
            total_appointments=Count('appointments'),
            completed_appointments=Count(Case(When(appointments__status='COMPLETED', then=1), output_field=IntegerField())),
            cancelled_appointments=Count(Case(When(appointments__status='CANCELLED', then=1), output_field=IntegerField())),
            no_show_appointments=Count(Case(When(appointments__status='NO_SHOW', then=1), output_field=IntegerField())),
            estimated_revenue=F('consultation_fee') * Count(Case(When(appointments__status='COMPLETED', then=1), output_field=IntegerField()))
        ).order_by('-total_appointments')
        result = []
        for doctor in doctors:
            completion_rate = 0
            if doctor.total_appointments > 0:
                completion_rate = (doctor.completed_appointments / doctor.total_appointments) * 100
            result.append({
                'doctor_id': doctor.id,
                'doctor_name': f"Dr. {doctor.first_name} {doctor.last_name}",
                'specialization': doctor.get_specialization_display(),
                'total_appointments': doctor.total_appointments,
                'completed_appointments': doctor.completed_appointments,
                'cancelled_appointments': doctor.cancelled_appointments,
                'no_show_appointments': doctor.no_show_appointments,
                'completion_rate': round(completion_rate, 1),
                'estimated_revenue': doctor.estimated_revenue
            })
        return Response(result)
    def _get_monthly_appointments(self, appointments):
        months = appointments.annotate(
            month=ExtractMonth('appointment_date')
        ).values('month').annotate(
            total=Count('id'),
            completed=Count(Case(When(status='COMPLETED', then=1), output_field=IntegerField())),
            cancelled=Count(Case(When(status='CANCELLED', then=1), output_field=IntegerField())),
            no_show=Count(Case(When(status='NO_SHOW', then=1), output_field=IntegerField()))
        ).order_by('month')
        month_names = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ]
        result = {}
        for item in months:
            month_idx = item['month'] - 1  # Convert 1-based to 0-based index
            month_name = month_names[month_idx]
            result[month_name] = {
                'total': item['total'],
                'completed': item['completed'],
                'cancelled': item['cancelled'],
                'no_show': item['no_show']
            }
        return result
class PatientAnalyticsView(APIView):
    permission_classes = [IsClinicalStaff]
    def get(self, request, format=None):
        patient_id = request.query_params.get('patient_id')
        if patient_id:
            return self._get_single_patient_analytics(patient_id)
        else:
            return self._get_all_patients_analytics()
    def _get_single_patient_analytics(self, patient_id):
        try:
            patient = Patient.objects.get(id=patient_id)
        except Patient.DoesNotExist:
            return Response({"error": "Patient not found"}, status=status.HTTP_404_NOT_FOUND)
        appointments = Appointment.objects.filter(patient=patient)
        total_appointments = appointments.count()
        completed_appointments = appointments.filter(status='COMPLETED').count()
        cancelled_appointments = appointments.filter(status='CANCELLED').count()
        no_show_appointments = appointments.filter(status='NO_SHOW').count()
        attendance_rate = 0
        if total_appointments > 0:
            attendance_rate = (completed_appointments / total_appointments) * 100
        doctors_visited = appointments.values(
            'doctor__id', 'doctor__first_name', 'doctor__last_name', 'doctor__specialization'
        ).distinct()
        doctor_visits = []
        for doctor in doctors_visited:
            specialization = doctor['doctor__specialization']
            try:
                doctor_obj = Doctor.objects.get(id=doctor['doctor__id'])
                specialization = doctor_obj.get_specialization_display()
            except Doctor.DoesNotExist:
                pass
            doctor_visits.append({
                'doctor_id': doctor['doctor__id'],
                'doctor_name': f"Dr. {doctor['doctor__first_name']} {doctor['doctor__last_name']}",
                'specialization': specialization,
                'visit_count': appointments.filter(doctor_id=doctor['doctor__id']).count()
            })
        appointment_history = []
        for appointment in appointments.order_by('-appointment_date', '-appointment_time')[:10]:
            appointment_history.append({
                'id': appointment.id,
                'date': appointment.appointment_date,
                'time': appointment.appointment_time,
                'doctor': f"Dr. {appointment.doctor.first_name} {appointment.doctor.last_name}",
                'status': appointment.get_status_display(),
                'reason': appointment.reason
            })
        return Response({
            'patient_id': patient.id,
            'patient_name': f"{patient.first_name} {patient.last_name}",
            'total_appointments': total_appointments,
            'completed_appointments': completed_appointments,
            'cancelled_appointments': cancelled_appointments,
            'no_show_appointments': no_show_appointments,
            'attendance_rate': round(attendance_rate, 1),
            'doctor_visits': doctor_visits,
            'appointment_history': appointment_history
        })
    def _get_all_patients_analytics(self):
        total_patients = Patient.objects.count()
        gender_distribution = Patient.objects.values('gender').annotate(
            count=Count('id')
        ).order_by('gender')
        gender_counts = {}
        for item in gender_distribution:
            gender_display = next((g[1] for g in Patient.GENDER_CHOICES if g[0] == item['gender']), item['gender'])
            gender_counts[gender_display] = item['count']
        blood_group_distribution = Patient.objects.exclude(
            blood_group__isnull=True
        ).exclude(
            blood_group__exact=''
        ).values('blood_group').annotate(
            count=Count('id')
        ).order_by('blood_group')
        blood_group_counts = {item['blood_group']: item['count'] for item in blood_group_distribution}
        today = timezone.now().date()
        age_ranges = [
            ('0-18', 0, 18),
            ('19-35', 19, 35),
            ('36-50', 36, 50),
            ('51-65', 51, 65),
            ('65+', 66, 150)
        ]
        age_distribution = {}
        for label, min_age, max_age in age_ranges:
            min_date = today.replace(year=today.year - max_age)
            max_date = today.replace(year=today.year - min_age)
            count = Patient.objects.filter(
                date_of_birth__gt=min_date,
                date_of_birth__lte=max_date
            ).count()
            age_distribution[label] = count
        patients_with_appointments = Patient.objects.filter(
            appointments__isnull=False
        ).distinct().count()
        appointments_per_patient = 0
        if patients_with_appointments > 0:
            total_appointments = Appointment.objects.count()
            appointments_per_patient = total_appointments / patients_with_appointments
        return Response({
            'total_patients': total_patients,
            'patients_with_appointments': patients_with_appointments,
            'appointments_per_patient': round(appointments_per_patient, 1),
            'gender_distribution': gender_counts,
            'blood_group_distribution': blood_group_counts,
            'age_distribution': age_distribution
        })
class RevenueAnalyticsView(APIView):
    permission_classes = [IsAdminOrStaff]
    def get(self, request, format=None):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        completed_appointments = Appointment.objects.filter(status='COMPLETED')
        if start_date:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                completed_appointments = completed_appointments.filter(appointment_date__gte=start_date)
            except ValueError:
                pass
        if end_date:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                completed_appointments = completed_appointments.filter(appointment_date__lte=end_date)
            except ValueError:
                pass
        revenue_data = self._calculate_revenue(completed_appointments)
        monthly_revenue = self._calculate_monthly_revenue(completed_appointments)
        revenue_by_specialization = self._calculate_revenue_by_specialization(completed_appointments)
        return Response({
            'total_revenue': revenue_data['total_revenue'],
            'avg_appointment_value': revenue_data['avg_appointment_value'],
            'appointment_count': revenue_data['appointment_count'],
            'monthly_revenue': monthly_revenue,
            'revenue_by_specialization': revenue_by_specialization
        })
    def _calculate_revenue(self, appointments):
        total_revenue = sum(appointment.doctor.consultation_fee for appointment in appointments)
        appointment_count = appointments.count()
        avg_appointment_value = 0
        if appointment_count > 0:
            avg_appointment_value = total_revenue / appointment_count
        return {
            'total_revenue': total_revenue,
            'avg_appointment_value': round(avg_appointment_value, 2),
            'appointment_count': appointment_count
        }
    def _calculate_monthly_revenue(self, appointments):
        months = appointments.annotate(
            month=ExtractMonth('appointment_date')
        ).values('month')
        monthly_revenue = {}
        month_names = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ]
        for i, name in enumerate(month_names, 1):
            monthly_revenue[name] = 0
        for month_idx in range(1, 13):
            month_appointments = appointments.filter(appointment_date__month=month_idx)
            revenue = sum(appointment.doctor.consultation_fee for appointment in month_appointments)
            month_name = month_names[month_idx-1]
            monthly_revenue[month_name] = revenue
        return monthly_revenue
    def _calculate_revenue_by_specialization(self, appointments):
        specializations = dict(Doctor.SPECIALIZATION_CHOICES)
        revenue_by_specialization = {spec_name: 0 for spec_code, spec_name in specializations.items()}
        for appointment in appointments:
            specialization_code = appointment.doctor.specialization
            specialization_name = specializations.get(specialization_code, specialization_code)
            revenue_by_specialization[specialization_name] += appointment.doctor.consultation_fee
        return {k: v for k, v in revenue_by_specialization.items() if v > 0}


class HospitalOverviewView(APIView):
    permission_classes = [IsClinicalStaff]

    def get(self, request, format=None):
        now = timezone.now()
        today = now.date()
        start_of_month = today.replace(day=1)

        hospital_stats = self._get_hospital_stats(today)
        emergency_stats = self._get_emergency_stats()
        opd_stats = self._get_opd_stats(today)
        financial_stats = self._get_financial_stats(today, start_of_month)
        blood_bank_stats = self._get_blood_bank_stats()
        ot_stats = self._get_ot_stats(today)
        department_stats = self._get_department_stats()
        recent_activity = self._get_recent_activity()

        return Response({
            'hospital_stats': hospital_stats,
            'emergency_stats': emergency_stats,
            'opd_stats': opd_stats,
            'financial_stats': financial_stats,
            'blood_bank_stats': blood_bank_stats,
            'ot_stats': ot_stats,
            'department_stats': department_stats,
            'recent_activity': recent_activity,
        })

    def _get_hospital_stats(self, today):
        total_beds = Bed.objects.count()
        occupied_beds = Bed.objects.filter(status='OCCUPIED').count()
        available_beds = Bed.objects.filter(status='AVAILABLE').count()
        occupancy_rate = round((occupied_beds / total_beds * 100), 1) if total_beds > 0 else 0.0
        total_patients_admitted = Bed.objects.filter(status='OCCUPIED', patient__isnull=False).count()
        discharged_today = DischargeSummary.objects.filter(discharge_date=today).count()
        admitted_today = Bed.objects.filter(
            status='OCCUPIED',
            admission_date__date=today,
        ).count()

        return {
            'total_beds': total_beds,
            'occupied_beds': occupied_beds,
            'available_beds': available_beds,
            'occupancy_rate': occupancy_rate,
            'total_patients_admitted': total_patients_admitted,
            'discharged_today': discharged_today,
            'admitted_today': admitted_today,
        }

    def _get_emergency_stats(self):
        active_statuses = ['WAITING', 'TRIAGED', 'IN_TREATMENT']
        active_cases = EmergencyVisit.objects.filter(status__in=active_statuses).count()
        critical_cases = EmergencyVisit.objects.filter(
            status__in=active_statuses,
            is_critical=True,
        ).count()
        waiting = EmergencyVisit.objects.filter(status='WAITING').count()
        ambulances_available = Ambulance.objects.filter(
            status='AVAILABLE', is_active=True,
        ).count()
        ambulances_total = Ambulance.objects.filter(is_active=True).count()

        return {
            'active_cases': active_cases,
            'critical_cases': critical_cases,
            'waiting': waiting,
            'ambulances_available': ambulances_available,
            'ambulances_total': ambulances_total,
        }

    def _get_opd_stats(self, today):
        today_entries = QueueEntry.objects.filter(date=today)
        todays_appointments = today_entries.count()
        completed = today_entries.filter(status='COMPLETED').count()
        in_queue = today_entries.filter(status='WAITING').count()

        avg_wait = today_entries.filter(
            status='COMPLETED',
            consultation_start__isnull=False,
        ).aggregate(
            avg_wait=Avg(F('consultation_start') - F('check_in_time'))
        )['avg_wait']

        avg_wait_minutes = 0
        if avg_wait is not None:
            avg_wait_minutes = int(avg_wait.total_seconds() / 60)

        return {
            'todays_appointments': todays_appointments,
            'completed': completed,
            'in_queue': in_queue,
            'avg_wait_time': avg_wait_minutes,
        }

    def _get_financial_stats(self, today, start_of_month):
        today_payments = Payment.objects.filter(
            payment_date__date=today,
        ).aggregate(total=Sum('amount'))['total'] or 0.0

        month_payments = Payment.objects.filter(
            payment_date__date__gte=start_of_month,
            payment_date__date__lte=today,
        ).aggregate(total=Sum('amount'))['total'] or 0.0

        pending_invoices_qs = Invoice.objects.filter(
            status__in=['PENDING', 'PARTIALLY_PAID', 'OVERDUE'],
        )
        pending_invoices = pending_invoices_qs.count()
        pending_amount = pending_invoices_qs.aggregate(
            total=Sum(F('total_amount') - F('paid_amount'), output_field=DecimalField()),
        )['total'] or 0.0

        return {
            'revenue_today': float(today_payments),
            'revenue_this_month': float(month_payments),
            'pending_invoices': pending_invoices,
            'pending_amount': float(pending_amount),
        }

    def _get_blood_bank_stats(self):
        available_units = BloodUnit.objects.filter(status='AVAILABLE')
        total_units = available_units.count()

        units_by_group_qs = available_units.values('blood_group').annotate(
            count=Count('id'),
        ).order_by('blood_group')
        units_by_group = {item['blood_group']: item['count'] for item in units_by_group_qs}

        today = timezone.now().date()
        expiring_threshold = today + timedelta(days=7)
        expiring_soon = available_units.filter(
            expiry_date__lte=expiring_threshold,
            expiry_date__gte=today,
        ).count()

        pending_requests = BloodRequest.objects.filter(status='PENDING').count()

        return {
            'total_units': total_units,
            'units_by_group': units_by_group,
            'expiring_soon': expiring_soon,
            'pending_requests': pending_requests,
        }

    def _get_ot_stats(self, today):
        today_start = timezone.make_aware(datetime.combine(today, datetime.min.time()))
        today_end = timezone.make_aware(datetime.combine(today, datetime.max.time()))

        surgeries_today = Surgery.objects.filter(
            scheduled_date__range=(today_start, today_end),
        ).count()
        surgeries_completed = Surgery.objects.filter(
            scheduled_date__range=(today_start, today_end),
            status='COMPLETED',
        ).count()
        surgeries_scheduled = Surgery.objects.filter(
            scheduled_date__range=(today_start, today_end),
            status='SCHEDULED',
        ).count()

        active_theaters = OperationTheater.objects.filter(is_active=True)
        theaters_total = active_theaters.count()
        theaters_available = active_theaters.filter(status='AVAILABLE').count()

        return {
            'surgeries_today': surgeries_today,
            'surgeries_completed': surgeries_completed,
            'surgeries_scheduled': surgeries_scheduled,
            'theaters_available': theaters_available,
            'theaters_total': theaters_total,
        }

    def _get_department_stats(self):
        departments = Department.objects.filter(is_active=True)
        result = []

        for dept in departments:
            dept_beds = Bed.objects.filter(ward__department=dept)
            beds_total = dept_beds.count()
            beds_occupied = dept_beds.filter(status='OCCUPIED').count()
            doctors_count = Doctor.objects.filter(
                department=dept,
            ).count() if hasattr(Doctor, 'department') else 0
            patients_count = dept_beds.filter(
                status='OCCUPIED', patient__isnull=False,
            ).count()

            result.append({
                'name': dept.name,
                'patients': patients_count,
                'doctors': doctors_count,
                'beds_occupied': beds_occupied,
                'beds_total': beds_total,
            })

        return result

    def _get_recent_activity(self):
        activities = []
        now = timezone.now()

        # Recent emergency visits
        recent_emergencies = EmergencyVisit.objects.order_by('-arrival_time')[:5]
        for visit in recent_emergencies:
            activities.append({
                'type': 'emergency',
                'message': f'Emergency visit {visit.visit_number}: {visit.get_status_display()}',
                'time': visit.arrival_time.isoformat(),
            })

        # Recent discharges
        recent_discharges = DischargeSummary.objects.order_by('-created_at')[:5]
        for discharge in recent_discharges:
            activities.append({
                'type': 'discharge',
                'message': f'Patient {discharge.patient} discharged ({discharge.get_discharge_type_display()})',
                'time': discharge.created_at.isoformat(),
            })

        # Recent surgeries
        recent_surgeries = Surgery.objects.order_by('-updated_at')[:5]
        for surgery in recent_surgeries:
            activities.append({
                'type': 'surgery',
                'message': f'Surgery {surgery.surgery_number}: {surgery.get_status_display()}',
                'time': surgery.updated_at.isoformat(),
            })

        # Recent payments
        recent_payments = Payment.objects.order_by('-payment_date')[:5]
        for payment in recent_payments:
            activities.append({
                'type': 'payment',
                'message': f'Payment of {payment.amount} received for {payment.invoice.invoice_number}',
                'time': payment.payment_date.isoformat(),
            })

        # Sort all activities by time descending and return the most recent 20
        activities.sort(key=lambda x: x['time'], reverse=True)
        return activities[:20]
