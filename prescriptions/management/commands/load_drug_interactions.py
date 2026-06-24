from django.core.management.base import BaseCommand
from prescriptions.models import DrugInteraction


INTERACTIONS = [
    {
        "drug_a": "Warfarin",
        "drug_b": "Aspirin",
        "severity": "SEVERE",
        "description": "Increased risk of bleeding when warfarin is combined with aspirin.",
        "recommendation": "Avoid combination unless specifically directed by a physician. Monitor INR closely.",
    },
    {
        "drug_a": "Warfarin",
        "drug_b": "Paracetamol",
        "severity": "MODERATE",
        "description": "High-dose or prolonged paracetamol use may enhance the anticoagulant effect of warfarin.",
        "recommendation": "Limit paracetamol to short-term use and monitor INR.",
    },
    {
        "drug_a": "Warfarin",
        "drug_b": "Ibuprofen",
        "severity": "SEVERE",
        "description": "NSAIDs increase bleeding risk and can displace warfarin from protein binding.",
        "recommendation": "Avoid NSAIDs with warfarin. Use paracetamol for pain if needed.",
    },
    {
        "drug_a": "Aspirin",
        "drug_b": "Ibuprofen",
        "severity": "MODERATE",
        "description": "Ibuprofen may interfere with the antiplatelet effect of aspirin and increases GI bleeding risk.",
        "recommendation": "Take aspirin at least 30 minutes before ibuprofen. Consider alternative analgesics.",
    },
    {
        "drug_a": "Metformin",
        "drug_b": "Alcohol",
        "severity": "SEVERE",
        "description": "Alcohol increases the risk of lactic acidosis when taken with metformin.",
        "recommendation": "Limit alcohol intake. Avoid binge drinking.",
    },
    {
        "drug_a": "Metformin",
        "drug_b": "Contrast Dye",
        "severity": "SEVERE",
        "description": "Iodinated contrast media can cause acute kidney injury, increasing metformin accumulation and lactic acidosis risk.",
        "recommendation": "Discontinue metformin 48 hours before and after contrast procedures.",
    },
    {
        "drug_a": "Lisinopril",
        "drug_b": "Potassium Supplements",
        "severity": "SEVERE",
        "description": "ACE inhibitors reduce potassium excretion; combined with supplements, hyperkalemia may result.",
        "recommendation": "Monitor serum potassium levels regularly. Avoid potassium supplements unless directed.",
    },
    {
        "drug_a": "Lisinopril",
        "drug_b": "Spironolactone",
        "severity": "SEVERE",
        "description": "Both agents increase potassium levels, risking dangerous hyperkalemia.",
        "recommendation": "Monitor potassium and renal function closely.",
    },
    {
        "drug_a": "Simvastatin",
        "drug_b": "Amlodipine",
        "severity": "MODERATE",
        "description": "Amlodipine increases simvastatin levels, raising the risk of myopathy and rhabdomyolysis.",
        "recommendation": "Limit simvastatin dose to 20 mg daily when combined with amlodipine.",
    },
    {
        "drug_a": "Simvastatin",
        "drug_b": "Grapefruit Juice",
        "severity": "MODERATE",
        "description": "Grapefruit juice inhibits CYP3A4, increasing statin levels and risk of muscle damage.",
        "recommendation": "Avoid large quantities of grapefruit juice while on simvastatin.",
    },
    {
        "drug_a": "Ciprofloxacin",
        "drug_b": "Antacids",
        "severity": "MODERATE",
        "description": "Antacids containing aluminium or magnesium reduce ciprofloxacin absorption.",
        "recommendation": "Take ciprofloxacin 2 hours before or 6 hours after antacids.",
    },
    {
        "drug_a": "Ciprofloxacin",
        "drug_b": "Theophylline",
        "severity": "SEVERE",
        "description": "Ciprofloxacin inhibits theophylline metabolism, potentially causing toxicity (seizures, arrhythmias).",
        "recommendation": "Monitor theophylline levels and reduce dose if necessary.",
    },
    {
        "drug_a": "Metronidazole",
        "drug_b": "Alcohol",
        "severity": "SEVERE",
        "description": "Disulfiram-like reaction: nausea, vomiting, flushing, headache, and tachycardia.",
        "recommendation": "Avoid alcohol during and for 48 hours after metronidazole treatment.",
    },
    {
        "drug_a": "Amoxicillin",
        "drug_b": "Methotrexate",
        "severity": "SEVERE",
        "description": "Amoxicillin may reduce renal excretion of methotrexate, increasing toxicity risk.",
        "recommendation": "Monitor methotrexate levels and renal function. Consider alternative antibiotics.",
    },
    {
        "drug_a": "Digoxin",
        "drug_b": "Amiodarone",
        "severity": "SEVERE",
        "description": "Amiodarone increases digoxin levels significantly, risking toxicity.",
        "recommendation": "Reduce digoxin dose by 50% when starting amiodarone. Monitor digoxin levels.",
    },
    {
        "drug_a": "Digoxin",
        "drug_b": "Verapamil",
        "severity": "SEVERE",
        "description": "Verapamil increases digoxin serum concentration and additive effects on heart rate.",
        "recommendation": "Reduce digoxin dose and monitor levels closely.",
    },
    {
        "drug_a": "Clopidogrel",
        "drug_b": "Omeprazole",
        "severity": "MODERATE",
        "description": "Omeprazole inhibits CYP2C19, reducing the activation of clopidogrel.",
        "recommendation": "Use pantoprazole instead of omeprazole if a PPI is needed.",
    },
    {
        "drug_a": "Fluoxetine",
        "drug_b": "Tramadol",
        "severity": "SEVERE",
        "description": "Risk of serotonin syndrome: agitation, tremor, hyperthermia, and potentially fatal outcomes.",
        "recommendation": "Avoid combination. Use alternative analgesics.",
    },
    {
        "drug_a": "Fluoxetine",
        "drug_b": "MAO Inhibitors",
        "severity": "CONTRAINDICATED",
        "description": "Life-threatening serotonin syndrome. Absolutely contraindicated combination.",
        "recommendation": "Do not use together. Allow at least 5-week washout after fluoxetine before starting an MAOI.",
    },
    {
        "drug_a": "Atorvastatin",
        "drug_b": "Clarithromycin",
        "severity": "SEVERE",
        "description": "Clarithromycin inhibits CYP3A4, significantly increasing statin levels and rhabdomyolysis risk.",
        "recommendation": "Temporarily suspend statin during clarithromycin course or use azithromycin instead.",
    },
    {
        "drug_a": "Amlodipine",
        "drug_b": "Atenolol",
        "severity": "MILD",
        "description": "Additive hypotensive and bradycardic effects.",
        "recommendation": "Monitor blood pressure and heart rate. Generally safe under supervision.",
    },
    {
        "drug_a": "Metformin",
        "drug_b": "Glimepiride",
        "severity": "MILD",
        "description": "Increased risk of hypoglycemia when combining two glucose-lowering agents.",
        "recommendation": "Monitor blood glucose regularly, especially when initiating combination.",
    },
    {
        "drug_a": "Losartan",
        "drug_b": "Potassium Supplements",
        "severity": "SEVERE",
        "description": "ARBs reduce potassium excretion; supplements may cause hyperkalemia.",
        "recommendation": "Monitor serum potassium. Avoid supplements unless directed.",
    },
    {
        "drug_a": "Diclofenac",
        "drug_b": "Lithium",
        "severity": "SEVERE",
        "description": "NSAIDs reduce renal lithium clearance, increasing lithium levels and toxicity risk.",
        "recommendation": "Monitor lithium levels closely if NSAID use is unavoidable.",
    },
    {
        "drug_a": "Azithromycin",
        "drug_b": "Amiodarone",
        "severity": "SEVERE",
        "description": "Both drugs can prolong the QT interval, increasing risk of fatal arrhythmias.",
        "recommendation": "Avoid combination. Use alternative antibiotic.",
    },
    {
        "drug_a": "Insulin",
        "drug_b": "Beta Blockers",
        "severity": "MODERATE",
        "description": "Beta blockers can mask hypoglycemia symptoms and impair glycogenolysis.",
        "recommendation": "Use cardioselective beta blockers. Educate patient on hypoglycemia symptoms.",
    },
    {
        "drug_a": "Prednisone",
        "drug_b": "NSAIDs",
        "severity": "MODERATE",
        "description": "Increased risk of GI ulceration and bleeding.",
        "recommendation": "Add gastroprotection (PPI) if combination is necessary.",
    },
    {
        "drug_a": "Sildenafil",
        "drug_b": "Nitrates",
        "severity": "CONTRAINDICATED",
        "description": "Severe, potentially fatal hypotension due to additive vasodilation.",
        "recommendation": "Absolutely contraindicated. Do not use together.",
    },
    {
        "drug_a": "Phenytoin",
        "drug_b": "Carbamazepine",
        "severity": "MODERATE",
        "description": "Complex interaction: each can alter the metabolism of the other.",
        "recommendation": "Monitor serum levels of both drugs and adjust doses accordingly.",
    },
    {
        "drug_a": "Erythromycin",
        "drug_b": "Simvastatin",
        "severity": "CONTRAINDICATED",
        "description": "Erythromycin strongly inhibits CYP3A4, causing dangerous statin accumulation.",
        "recommendation": "Do not combine. Temporarily discontinue statin or use azithromycin.",
    },
]


class Command(BaseCommand):
    help = "Load common drug interactions into the database"

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0

        for data in INTERACTIONS:
            obj, created = DrugInteraction.objects.update_or_create(
                drug_a=data["drug_a"],
                drug_b=data["drug_b"],
                defaults={
                    "severity": data["severity"],
                    "description": data["description"],
                    "recommendation": data["recommendation"],
                },
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done: {created_count} created, {updated_count} updated "
                f"(total {len(INTERACTIONS)} interactions)."
            )
        )
