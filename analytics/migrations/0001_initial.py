import django.db.models.deletion
from django.db import migrations, models
class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ('doctors', '0001_initial'),
        ('patients', '0001_initial'),
    ]
    operations = [
        migrations.CreateModel(
            name='DailyMetrics',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(unique=True)),
                ('new_patients', models.IntegerField(default=0)),
                ('new_appointments', models.IntegerField(default=0)),
                ('completed_appointments', models.IntegerField(default=0)),
                ('cancelled_appointments', models.IntegerField(default=0)),
                ('no_show_appointments', models.IntegerField(default=0)),
                ('total_revenue', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('avg_appointment_value', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Daily Metric',
                'verbose_name_plural': 'Daily Metrics',
                'ordering': ['-date'],
            },
        ),
        migrations.CreateModel(
            name='DoctorPerformance',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('appointments_count', models.IntegerField(default=0)),
                ('completed_count', models.IntegerField(default=0)),
                ('cancelled_count', models.IntegerField(default=0)),
                ('no_show_count', models.IntegerField(default=0)),
                ('revenue', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('doctor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='performance_metrics', to='doctors.doctor')),
            ],
            options={
                'ordering': ['-date'],
                'unique_together': {('doctor', 'date')},
            },
        ),
        migrations.CreateModel(
            name='PatientActivity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('appointments_count', models.IntegerField(default=0)),
                ('completed_count', models.IntegerField(default=0)),
                ('cancelled_count', models.IntegerField(default=0)),
                ('no_show_count', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='activity_metrics', to='patients.patient')),
            ],
            options={
                'ordering': ['-date'],
                'unique_together': {('patient', 'date')},
            },
        ),
    ]

