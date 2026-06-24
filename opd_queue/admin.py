from django.contrib import admin
from .models import QueueEntry, QueueDisplay


@admin.register(QueueEntry)
class QueueEntryAdmin(admin.ModelAdmin):
    list_display = (
        'token_number', 'patient', 'doctor', 'department',
        'queue_type', 'status', 'priority', 'check_in_time', 'date',
    )
    search_fields = (
        'token_number', 'patient__first_name', 'patient__last_name',
        'doctor__first_name', 'doctor__last_name',
    )
    list_filter = ('status', 'priority', 'queue_type', 'date', 'department')
    readonly_fields = ('check_in_time', 'date')
    fieldsets = (
        ('Token Information', {
            'fields': ('token_number', 'patient', 'doctor', 'department', 'appointment'),
        }),
        ('Queue Details', {
            'fields': ('queue_type', 'status', 'priority', 'position', 'notes'),
        }),
        ('Timing', {
            'fields': (
                'check_in_time', 'called_time', 'consultation_start',
                'consultation_end', 'estimated_wait_minutes', 'date',
            ),
        }),
    )


@admin.register(QueueDisplay)
class QueueDisplayAdmin(admin.ModelAdmin):
    list_display = (
        'display_name', 'department', 'doctor',
        'current_token', 'avg_wait_time_minutes', 'is_active', 'updated_at',
    )
    search_fields = ('display_name', 'department__name', 'doctor__last_name')
    list_filter = ('is_active', 'department')
    readonly_fields = ('updated_at',)
