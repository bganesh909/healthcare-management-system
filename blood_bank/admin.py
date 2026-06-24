from django.contrib import admin
from .models import BloodDonor, BloodUnit, BloodRequest, CrossMatch


@admin.register(BloodDonor)
class BloodDonorAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'blood_group', 'gender', 'is_eligible', 'total_donations', 'last_donation_date')
    search_fields = ('first_name', 'last_name', 'email', 'phone_number')
    list_filter = ('blood_group', 'gender', 'is_eligible')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(BloodUnit)
class BloodUnitAdmin(admin.ModelAdmin):
    list_display = ('unit_number', 'blood_group', 'component_type', 'status', 'collection_date', 'expiry_date', 'is_tested')
    search_fields = ('unit_number', 'storage_location', 'tested_by')
    list_filter = ('blood_group', 'component_type', 'status', 'is_tested')
    readonly_fields = ('created_at',)


@admin.register(BloodRequest)
class BloodRequestAdmin(admin.ModelAdmin):
    list_display = ('request_number', 'patient', 'doctor', 'blood_group', 'component_type', 'priority', 'status', 'required_date')
    search_fields = ('request_number', 'reason', 'approved_by')
    list_filter = ('blood_group', 'component_type', 'priority', 'status')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(CrossMatch)
class CrossMatchAdmin(admin.ModelAdmin):
    list_display = ('blood_request', 'blood_unit', 'patient', 'result', 'tested_by', 'tested_at')
    search_fields = ('tested_by',)
    list_filter = ('result',)
    readonly_fields = ('tested_at',)
