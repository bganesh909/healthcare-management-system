from django.contrib.auth import get_user_model, authenticate
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
User = get_user_model()
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        data.update({
            'user_id': user.id,
            'email': user.email,
            'full_name': user.get_full_name(),
            'role': user.role,
            'is_staff': user.is_staff,
        })
        return data
class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    confirm_password = serializers.CharField(write_only=True, required=False)
    class Meta:
        model = User
        fields = ('id', 'email', 'password', 'confirm_password', 'first_name', 'last_name', 
                  'phone_number', 'role', 'profile_picture', 'doctor_profile', 'patient_profile')
        read_only_fields = ('id', 'role')
    def validate(self, data):
        if 'password' in data:
            if 'confirm_password' not in data:
                raise serializers.ValidationError({"confirm_password": _("This field is required when setting a password.")})
            if data['password'] != data['confirm_password']:
                raise serializers.ValidationError({"confirm_password": _("Passwords do not match.")})
        return data
    def create(self, validated_data):
        validated_data.pop('confirm_password', None)
        password = validated_data.pop('password', None)
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user
    def update(self, instance, validated_data):
        validated_data.pop('confirm_password', None)
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
class UserDetailSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'phone_number', 'role',
                  'role_display', 'profile_picture', 'email_verified', 'date_joined',
                  'patient_profile', 'doctor_profile')
        read_only_fields = fields
class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'phone_number', 'profile_picture')
class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError(_("No account found with this email address."))
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    uid = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, write_only=True)
    confirm_new_password = serializers.CharField(required=True, write_only=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_new_password']:
            raise serializers.ValidationError({'confirm_new_password': _("Passwords do not match.")})
        return data


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)
    confirm_new_password = serializers.CharField(required=True, write_only=True)
    def validate(self, data):
        if data['new_password'] != data['confirm_new_password']:
            raise serializers.ValidationError({'confirm_new_password': _("New passwords do not match.")})
        return data
    def validate_current_password(self, value):
        user = self.context['request'].user
        if not authenticate(username=user.email, password=value):
            raise serializers.ValidationError(_("Current password is incorrect."))
        return value

