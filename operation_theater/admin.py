from django.contrib import admin
from .models import OperationTheater, Surgery, SurgicalTeam, PreOpChecklist, PostOpNote


@admin.register(OperationTheater)
class OperationTheaterAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'theater_type', 'floor', 'status', 'is_active')
    search_fields = ('name', 'code')
    list_filter = ('theater_type', 'status', 'is_active', 'floor')


@admin.register(Surgery)
class SurgeryAdmin(admin.ModelAdmin):
    list_display = ('surgery_number', 'patient', 'primary_surgeon', 'procedure_name', 'scheduled_date', 'status')
    search_fields = ('surgery_number', 'procedure_name', 'diagnosis')
    list_filter = ('status', 'surgery_type', 'anesthesia_type')
    readonly_fields = ('surgery_number', 'created_at', 'updated_at')


@admin.register(SurgicalTeam)
class SurgicalTeamAdmin(admin.ModelAdmin):
    list_display = ('surgery', 'member_name', 'role')
    search_fields = ('member_name',)
    list_filter = ('role',)


@admin.register(PreOpChecklist)
class PreOpChecklistAdmin(admin.ModelAdmin):
    list_display = ('surgery', 'completed_by', 'completed_at')
    search_fields = ('surgery__surgery_number', 'completed_by')


@admin.register(PostOpNote)
class PostOpNoteAdmin(admin.ModelAdmin):
    list_display = ('surgery', 'recovery_status', 'pain_level', 'consciousness_level', 'created_by', 'created_at')
    search_fields = ('surgery__surgery_number', 'created_by')
    list_filter = ('recovery_status', 'consciousness_level')
    readonly_fields = ('created_at',)
