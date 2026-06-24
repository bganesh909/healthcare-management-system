from django.core.management.base import BaseCommand
from prescriptions.models import PrescriptionTemplate


TEMPLATES = [
    {
        "name": "Fever - Adult",
        "diagnosis": "Acute febrile illness",
        "is_global": True,
        "items": [
            {"medicine_name": "Paracetamol 500mg", "dosage": "500mg", "frequency": "Every 6 hours", "duration": "5 days", "instructions": "Take after meals. Do not exceed 4 doses in 24 hours."},
            {"medicine_name": "Cetirizine 10mg", "dosage": "10mg", "frequency": "Once daily at night", "duration": "5 days", "instructions": "Take at bedtime."},
        ],
    },
    {
        "name": "Common Cold",
        "diagnosis": "Upper respiratory tract infection",
        "is_global": True,
        "items": [
            {"medicine_name": "Paracetamol 500mg", "dosage": "500mg", "frequency": "Three times daily", "duration": "5 days", "instructions": "Take after meals."},
            {"medicine_name": "Cetirizine 10mg", "dosage": "10mg", "frequency": "Once daily", "duration": "5 days", "instructions": "Take at bedtime."},
            {"medicine_name": "Ambroxol 30mg", "dosage": "30mg", "frequency": "Three times daily", "duration": "5 days", "instructions": "Take after meals."},
            {"medicine_name": "Steam Inhalation", "dosage": "N/A", "frequency": "Twice daily", "duration": "7 days", "instructions": "Inhale steam for 10 minutes."},
        ],
    },
    {
        "name": "Urinary Tract Infection",
        "diagnosis": "Uncomplicated urinary tract infection",
        "is_global": True,
        "items": [
            {"medicine_name": "Nitrofurantoin 100mg", "dosage": "100mg", "frequency": "Twice daily", "duration": "5 days", "instructions": "Take with food. Complete the full course."},
            {"medicine_name": "Paracetamol 500mg", "dosage": "500mg", "frequency": "As needed", "duration": "3 days", "instructions": "For pain or fever."},
        ],
    },
    {
        "name": "Diabetes Followup - Type 2",
        "diagnosis": "Type 2 Diabetes Mellitus - followup",
        "is_global": True,
        "items": [
            {"medicine_name": "Metformin 500mg", "dosage": "500mg", "frequency": "Twice daily", "duration": "30 days", "instructions": "Take with meals to reduce GI side effects."},
            {"medicine_name": "Glimepiride 1mg", "dosage": "1mg", "frequency": "Once daily before breakfast", "duration": "30 days", "instructions": "Take 15 minutes before breakfast."},
        ],
    },
    {
        "name": "Hypertension - Initial",
        "diagnosis": "Essential hypertension",
        "is_global": True,
        "items": [
            {"medicine_name": "Amlodipine 5mg", "dosage": "5mg", "frequency": "Once daily", "duration": "30 days", "instructions": "Take in the morning. Monitor blood pressure daily."},
        ],
    },
    {
        "name": "Acid Reflux / GERD",
        "diagnosis": "Gastroesophageal reflux disease",
        "is_global": True,
        "items": [
            {"medicine_name": "Pantoprazole 40mg", "dosage": "40mg", "frequency": "Once daily before breakfast", "duration": "14 days", "instructions": "Take 30 minutes before the first meal."},
            {"medicine_name": "Domperidone 10mg", "dosage": "10mg", "frequency": "Three times daily", "duration": "14 days", "instructions": "Take 15 minutes before meals."},
        ],
    },
    {
        "name": "Allergic Rhinitis",
        "diagnosis": "Allergic rhinitis",
        "is_global": True,
        "items": [
            {"medicine_name": "Levocetirizine 5mg", "dosage": "5mg", "frequency": "Once daily at night", "duration": "14 days", "instructions": "Take at bedtime."},
            {"medicine_name": "Fluticasone Nasal Spray", "dosage": "2 sprays each nostril", "frequency": "Once daily", "duration": "14 days", "instructions": "Spray into each nostril in the morning."},
            {"medicine_name": "Normal Saline Nasal Drops", "dosage": "2 drops each nostril", "frequency": "Three times daily", "duration": "14 days", "instructions": "Use before nasal spray."},
        ],
    },
    {
        "name": "Acute Gastroenteritis",
        "diagnosis": "Acute gastroenteritis with dehydration",
        "is_global": True,
        "items": [
            {"medicine_name": "ORS Sachets", "dosage": "1 sachet in 1L water", "frequency": "Sip frequently", "duration": "3 days", "instructions": "Drink small amounts frequently."},
            {"medicine_name": "Ondansetron 4mg", "dosage": "4mg", "frequency": "Every 8 hours as needed", "duration": "3 days", "instructions": "Take for nausea/vomiting."},
            {"medicine_name": "Racecadotril 100mg", "dosage": "100mg", "frequency": "Three times daily", "duration": "3 days", "instructions": "Take before meals."},
        ],
    },
    {
        "name": "Migraine - Acute",
        "diagnosis": "Migraine headache - acute episode",
        "is_global": True,
        "items": [
            {"medicine_name": "Sumatriptan 50mg", "dosage": "50mg", "frequency": "Once at onset", "duration": "As needed", "instructions": "Take at first sign of migraine. May repeat after 2 hours if needed (max 200mg/day)."},
            {"medicine_name": "Domperidone 10mg", "dosage": "10mg", "frequency": "As needed", "duration": "As needed", "instructions": "Take for nausea. Can be taken with sumatriptan."},
        ],
    },
    {
        "name": "Lower Back Pain",
        "diagnosis": "Acute lower back pain - musculoskeletal",
        "is_global": True,
        "items": [
            {"medicine_name": "Diclofenac 50mg", "dosage": "50mg", "frequency": "Twice daily", "duration": "7 days", "instructions": "Take after meals. Avoid on empty stomach."},
            {"medicine_name": "Pantoprazole 40mg", "dosage": "40mg", "frequency": "Once daily", "duration": "7 days", "instructions": "Gastroprotection. Take before breakfast."},
            {"medicine_name": "Thiocolchicoside 4mg", "dosage": "4mg", "frequency": "Twice daily", "duration": "7 days", "instructions": "Muscle relaxant. Take after meals."},
        ],
    },
]


class Command(BaseCommand):
    help = "Load common prescription templates into the database"

    def handle(self, *args, **options):
        created_count = 0
        skipped_count = 0

        for data in TEMPLATES:
            obj, created = PrescriptionTemplate.objects.get_or_create(
                name=data["name"],
                defaults={
                    "diagnosis": data["diagnosis"],
                    "is_global": data["is_global"],
                    "items": data["items"],
                },
            )
            if created:
                created_count += 1
            else:
                skipped_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done: {created_count} created, {skipped_count} already existed "
                f"(total {len(TEMPLATES)} templates)."
            )
        )
