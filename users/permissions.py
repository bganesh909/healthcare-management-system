from rest_framework.permissions import BasePermission


class IsAdminOrStaff(BasePermission):
    """Allows access to users with admin or staff role."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ('admin', 'staff')


class IsAdminOrDoctor(BasePermission):
    """Allows access to users with admin or doctor role."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ('admin', 'doctor')


class IsClinicalStaff(BasePermission):
    """Allows access to users with admin, doctor, or staff role."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ('admin', 'doctor', 'staff')


class IsOwnerOrClinicalStaff(BasePermission):
    """
    For patient data: allows the patient themselves or clinical staff
    (admin, doctor, staff).
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Clinical staff always have access
        if request.user.role in ('admin', 'doctor', 'staff'):
            return True
        # Patients can access (object-level check enforces ownership)
        return request.user.role == 'patient'

    def has_object_permission(self, request, view, obj):
        # Clinical staff always have access
        if request.user.role in ('admin', 'doctor', 'staff'):
            return True
        # Patient can only access their own data
        if hasattr(obj, 'patient'):
            if hasattr(request.user, 'patient_profile') and request.user.patient_profile:
                return obj.patient_id == request.user.patient_profile.id
        return False
