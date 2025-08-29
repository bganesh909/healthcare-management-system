from django.db import migrations, models
class Migration(migrations.Migration):
    initial = True
    dependencies = [
    ]
    operations = [
        migrations.CreateModel(
            name='Doctor',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('first_name', models.CharField(max_length=100)),
                ('last_name', models.CharField(max_length=100)),
                ('specialization', models.CharField(choices=[('CARDIOLOGY', 'Cardiology'), ('DERMATOLOGY', 'Dermatology'), ('ENDOCRINOLOGY', 'Endocrinology'), ('GASTROENTEROLOGY', 'Gastroenterology'), ('NEUROLOGY', 'Neurology'), ('ONCOLOGY', 'Oncology'), ('PEDIATRICS', 'Pediatrics'), ('PSYCHIATRY', 'Psychiatry'), ('ORTHOPEDICS', 'Orthopedics'), ('GYNECOLOGY', 'Gynecology'), ('GENERAL', 'General Medicine'), ('OTHER', 'Other')], max_length=20)),
                ('license_number', models.CharField(max_length=50, unique=True)),
                ('phone_number', models.CharField(max_length=15)),
                ('email', models.EmailField(max_length=254, unique=True)),
                ('qualification', models.CharField(max_length=255)),
                ('experience_years', models.PositiveIntegerField()),
                ('bio', models.TextField(blank=True, null=True)),
                ('consultation_fee', models.DecimalField(decimal_places=2, max_digits=10)),
                ('available_days', models.CharField(help_text='Comma separated days', max_length=100)),
                ('available_hours_start', models.TimeField()),
                ('available_hours_end', models.TimeField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['last_name', 'first_name'],
            },
        ),
    ]

