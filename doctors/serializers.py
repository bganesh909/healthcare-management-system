from rest_framework import serializers
from django.db.models import Avg, Count
from .models import Doctor, DoctorReview
from appointments.models import Appointment


class DoctorReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorReview
        fields = '__all__'


class DoctorReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorReview
        fields = '__all__'

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate(self, data):
        doctor = data.get('doctor')
        patient = data.get('patient')
        has_appointment = Appointment.objects.filter(
            doctor=doctor, patient=patient
        ).exists()
        if not has_appointment:
            raise serializers.ValidationError(
                "Patient must have had an appointment with this doctor to leave a review."
            )
        return data


class DoctorSerializer(serializers.ModelSerializer):
    specialization_display = serializers.CharField(source='get_specialization_display', read_only=True)
    avg_rating = serializers.SerializerMethodField(read_only=True)
    review_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Doctor
        fields = [
            'id', 'first_name', 'last_name', 'specialization', 'specialization_display',
            'license_number', 'phone_number', 'email', 'qualification', 'experience_years',
            'bio', 'consultation_fee', 'available_days', 'available_hours_start',
            'available_hours_end', 'created_at', 'updated_at', 'avg_rating', 'review_count',
        ]

    def get_avg_rating(self, obj):
        result = obj.reviews.aggregate(avg=Avg('rating'))
        return round(result['avg'], 2) if result['avg'] else None

    def get_review_count(self, obj):
        return obj.reviews.count()


class DoctorListSerializer(serializers.ModelSerializer):
    specialization_display = serializers.CharField(source='get_specialization_display', read_only=True)
    avg_rating = serializers.SerializerMethodField(read_only=True)
    review_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Doctor
        fields = [
            'id', 'first_name', 'last_name', 'specialization', 'specialization_display',
            'consultation_fee', 'experience_years', 'qualification', 'phone_number', 'email',
            'available_days', 'available_hours_start', 'available_hours_end',
            'avg_rating', 'review_count',
        ]

    def get_avg_rating(self, obj):
        result = obj.reviews.aggregate(avg=Avg('rating'))
        return round(result['avg'], 2) if result['avg'] else None

    def get_review_count(self, obj):
        return obj.reviews.count()
