from rest_framework import serializers
from .models import DailyMetrics, DoctorPerformance, PatientActivity
from doctors.serializers import DoctorListSerializer
from patients.serializers import PatientListSerializer
class DailyMetricsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyMetrics
        fields = '__all__'
class DoctorPerformanceSerializer(serializers.ModelSerializer):
    doctor = DoctorListSerializer(read_only=True)
    completion_rate = serializers.FloatField(read_only=True)
    class Meta:
        model = DoctorPerformance
        fields = ('id', 'doctor', 'date', 'appointments_count', 'completed_count',
                 'cancelled_count', 'no_show_count', 'revenue', 'completion_rate')
class PatientActivitySerializer(serializers.ModelSerializer):
    patient = PatientListSerializer(read_only=True)
    attendance_rate = serializers.FloatField(read_only=True)
    class Meta:
        model = PatientActivity
        fields = ('id', 'patient', 'date', 'appointments_count', 'completed_count',
                 'cancelled_count', 'no_show_count', 'attendance_rate')
class AppointmentsByStatusSerializer(serializers.Serializer):
    scheduled = serializers.IntegerField()
    completed = serializers.IntegerField()
    cancelled = serializers.IntegerField()
    no_show = serializers.IntegerField()
    total = serializers.IntegerField()
class AppointmentsByDoctorSerializer(serializers.Serializer):
    doctor_id = serializers.IntegerField()
    doctor_name = serializers.CharField()
    specialization = serializers.CharField()
    appointment_count = serializers.IntegerField()
    completed_count = serializers.IntegerField()
    completion_rate = serializers.FloatField()
class PatientStatisticsSerializer(serializers.Serializer):
    total_patients = serializers.IntegerField()
    new_patients_this_month = serializers.IntegerField()
    patients_with_appointments = serializers.IntegerField()
    gender_distribution = serializers.DictField(child=serializers.IntegerField())
    blood_group_distribution = serializers.DictField(child=serializers.IntegerField())
class RevenueStatisticsSerializer(serializers.Serializer):
    total_revenue = serializers.DecimalField(max_digits=10, decimal_places=2)
    monthly_revenue = serializers.DictField(child=serializers.DecimalField(max_digits=10, decimal_places=2))
    avg_appointment_value = serializers.DecimalField(max_digits=10, decimal_places=2)

