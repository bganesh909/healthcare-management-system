from rest_framework import serializers
from datetime import date
from .models import Appointment, TimeSlot, DoctorLeave, PatientFeedback, ConsentForm
from patients.serializers import PatientListSerializer
from doctors.serializers import DoctorListSerializer


class TimeSlotSerializer(serializers.ModelSerializer):
    day_of_week_display = serializers.CharField(source='get_day_of_week_display', read_only=True)

    class Meta:
        model = TimeSlot
        fields = '__all__'


class DoctorLeaveSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorLeave
        fields = '__all__'


class AppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = '__all__'

    def validate(self, data):
        # Only validate for new appointments (not updates)
        if not self.instance:
            appointment_date = data.get('appointment_date')
            doctor = data.get('doctor')
            appointment_time = data.get('appointment_time')

            # Reject past dates
            if appointment_date and appointment_date < date.today():
                raise serializers.ValidationError(
                    {'appointment_date': 'Cannot book appointments in the past.'}
                )

            # Check if doctor is on leave
            if doctor and appointment_date:
                on_leave = DoctorLeave.objects.filter(
                    doctor=doctor,
                    start_date__lte=appointment_date,
                    end_date__gte=appointment_date,
                    is_approved=True
                ).exists()
                if on_leave:
                    raise serializers.ValidationError(
                        {'doctor': 'Doctor is on leave on the selected date.'}
                    )

            # Check time slot availability
            if doctor and appointment_date and appointment_time:
                day_of_week = appointment_date.weekday()
                has_slot = TimeSlot.objects.filter(
                    doctor=doctor,
                    day_of_week=day_of_week,
                    start_time__lte=appointment_time,
                    end_time__gte=appointment_time,
                    is_active=True
                ).exists()
                if not has_slot:
                    raise serializers.ValidationError(
                        {'appointment_time': 'No available time slot for the selected time.'}
                    )

                # Check max patients for the slot
                slot = TimeSlot.objects.filter(
                    doctor=doctor,
                    day_of_week=day_of_week,
                    start_time__lte=appointment_time,
                    end_time__gte=appointment_time,
                    is_active=True
                ).first()
                if slot:
                    existing_count = Appointment.objects.filter(
                        doctor=doctor,
                        appointment_date=appointment_date,
                        appointment_time=appointment_time,
                        status__in=['SCHEDULED', 'COMPLETED']
                    ).count()
                    if existing_count >= slot.max_patients:
                        raise serializers.ValidationError(
                            {'appointment_time': 'This time slot is fully booked.'}
                        )

        return data


class AppointmentDetailSerializer(serializers.ModelSerializer):
    patient = PatientListSerializer(read_only=True)
    doctor = DoctorListSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_ready_for_consultation = serializers.BooleanField(read_only=True)

    class Meta:
        model = Appointment
        fields = ['id', 'patient', 'doctor', 'appointment_date', 'appointment_time',
                  'symptoms', 'reason', 'status', 'status_display', 'notes',
                  'check_in_time', 'check_out_time', 'token_number', 'is_walk_in',
                  'vitals_recorded', 'fees_paid', 'fee_amount', 'fee_receipt_number',
                  'prescription_uploaded', 'lab_ordered', 'lab_results_uploaded',
                  'is_ready_for_consultation',
                  'created_at', 'updated_at']


class AppointmentListSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Appointment
        fields = ['id', 'patient', 'patient_name', 'doctor', 'doctor_name', 'appointment_date',
                  'appointment_time', 'symptoms', 'reason', 'status', 'status_display',
                  'check_in_time', 'check_out_time', 'is_walk_in', 'token_number',
                  'vitals_recorded', 'fees_paid', 'prescription_uploaded']

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.first_name} {obj.doctor.last_name}"


class AppointmentCheckInSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ['check_in_time', 'token_number', 'vitals_recorded', 'fees_paid']
        read_only_fields = ['check_in_time', 'token_number']


class PatientFeedbackSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    nps_category = serializers.CharField(read_only=True)

    class Meta:
        model = PatientFeedback
        fields = '__all__'

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"

    def get_doctor_name(self, obj):
        return f"Dr. {obj.doctor.first_name} {obj.doctor.last_name}"


class ConsentFormSerializer(serializers.ModelSerializer):
    consent_type_display = serializers.CharField(source='get_consent_type_display', read_only=True)
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = ConsentForm
        fields = '__all__'
        read_only_fields = ['created_at', 'consented_at']

    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}"
