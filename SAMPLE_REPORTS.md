# Sample Field Reports for Testing

Copy and paste these into the **Run Agents** tab to test the pipeline.

---

## Step 1: Add Sample Volunteers First

Go to **Volunteers** page and add these volunteers with their skills:

### For Sample 1 (Water Crisis):
1. **Rajesh Kumar** - Skill: water | Hours: 15/week
2. **Priya Singh** - Skill: healthcare | Hours: 10/week  
3. **Amit Patel** - Skill: sanitation | Hours: 12/week
4. **Backup: Deepak** - Skill: water | Hours: 8/week

### For Sample 2 (Healthcare & Education):
1. **Dr. Anil Sharma** - Skill: healthcare | Hours: 20/week
2. **Neha Gupta** - Skill: healthcare | Hours: 15/week
3. **Vikram Singh** - Skill: education | Hours: 12/week
4. **Sneha Dey** - Skill: education | Hours: 10/week
5. **Backup: Dr. Meera** - Skill: healthcare | Hours: 8/week

### For Sample 3 (Disaster Relief):
1. **Rohan Kumar** - Skill: shelter | Hours: 25/week
2. **Ananya Mishra** - Skill: logistics | Hours: 20/week
3. **Sanjay Verma** - Skill: healthcare | Hours: 15/week
4. **Hari Singh** - Skill: water | Hours: 12/week
5. **Backup: Priya Nair** - Skill: logistics | Hours: 10/week

---

## Sample 1: Water Crisis in Rural Village

```
FIELD REPORT - Village of Rampur
Date: April 2, 2026
Reporter: NGO Coordinator - Field Team Alpha

SITUATION OVERVIEW:
Village of Rampur with approximately 200 families has experienced severe water crisis for the past 6 days. The main water supply from the community well has been contaminated due to overflow from nearby sewage system. This has left around 850 people without access to clean drinking water.

CRITICAL ISSUES:
1. No clean water supply affecting 200 families
2. Health clinic is currently out of oral rehydration salts (ORS) and basic antibiotics
3. 5 cases of diarrhea already reported in children under 5 years

AFFECTED AREAS:
- North settlement: 120 families
- South settlement: 80 families

IMMEDIATE NEEDS:
- Water tanker to supply clean water urgently
- Medical volunteer with healthcare background
- ORS packets and basic medicines
- Temporary sanitation arrangements

RESOURCES AVAILABLE:
- Local gram panchayat can provide 2 workers
- Community leaders willing to coordinate distribution
```

**Expected Action Plan:**
- Primary: Rajesh Kumar (water engineer) - Fix contaminated well
- Primary: Priya Singh (healthcare) - Manage ORS distribution & diarrhea cases
- Primary: Amit Patel (sanitation) - Set temporary sanitation arrangements
- Backup: Deepak (water) - Support well repair if Rajesh overloaded

---

## Sample 2: Healthcare and Education Crisis

```
FIELD REPORT - District Healthcare Assessment
Date: April 1, 2026
Reporter: NGO Health Coordinator

SITUATION:
Assessment of 3 remote blocks in the district shows critical healthcare and education gaps. The nearest hospital is 40km away.

CRITICAL ISSUES:
1. Primary Health Center (PHC) in Block A has only 1 doctor covering 15,000 population
2. No medicines in stock - clinic has been closed for 2 weeks
3. 150 children are out of school due to teacher shortage
4. No midwife available - pregnant women have to travel 50km for delivery
5. Malnutrition reported in 45% of children under 3 years in Block C

AFFECTED POPULATION:
- Block A: 15,000 people
- Block B: 12,000 people
- Block C: 10,000 people

IMMEDIATE REQUIREMENTS:
- Doctor or senior health volunteer
- Nursing assistant with maternal health background
- School teacher volunteers (min 2)
- Nutritionist for awareness programs
- Medicine stock replenishment

EXISTING RESOURCES:
- 3 ASHA workers willing to assist
- School buildings available but needs teacher
```

**Expected Action Plan:**
- Primary: Dr. Anil Sharma (healthcare) - Clinic operation & emergency cases
- Primary: Neha Gupta (healthcare) - Maternal health & midwife duties
- Primary: Vikram Singh (education) - School operations Block A
- Primary: Sneha Dey (education) - School operations Block B
- Backup: Dr. Meera (healthcare) - Support if Anil/Neha overloaded
- Note: Malnutrition issue may need nutritionist (specialist not in volunteer list)

---

## Sample 3: Disaster Relief - Flooding

```
FIELD REPORT - Emergency Response: Flash Flooding
Date: April 2, 2026
Reporter: Disaster Management Team

INCIDENT:
Heavy rainfall in the past 48 hours has caused flash flooding in 5 villages, affecting approximately 1,500 people.

CRITICAL SITUATION:
1. 300 families displaced from homes - need immediate shelter
2. Food supplies running out - 500 people need emergency food rations
3. Electrical grid damaged - entire area without power for 2 days
4. Water contamination - all ground water sources polluted
5. 2 injured people requiring medical attention

AFFECTED VILLAGES:
- Village A: 500 people displaced
- Village B: 400 people affected
- Village C: 600 people in risk zone

IMMEDIATE ACTIONS NEEDED:
1. Shelter arrangement for 300 families (tents/temporary housing)
2. Emergency food distribution - 500 people for next 5 days
3. Water tankers - minimum 3 required daily
4. Medical team for first aid and health assessment
5. Cleanup and waste management volunteers
6. Logistics coordinator for supply distribution

AVAILABLE SUPPORT:
- Government relief officer on ground
- Local schools available as temporary shelters
- Community members willing to help
- 10 volunteers already mobilized

ESTIMATED DURATION:
5-7 days for immediate relief, 3-4 weeks for recovery phase
```

**Expected Action Plan:**
- Primary: Rohan Kumar (shelter) - Coordinate emergency shelter setup
- Primary: Ananya Mishra (logistics) - Manage supply chain & food distribution
- Primary: Sanjay Verma (healthcare) - First aid & medical assessment
- Primary: Hari Singh (water) - Arrange water tankers & purification
- Backup: Priya Nair (logistics) - Support Ananya if overloaded with distribution
- Note: Cleanup/waste management & food rations may need additional volunteers

---

## How to Use:

### Step 1: Add Volunteers
1. Go to **Volunteers** tab
2. Click "Add Volunteer"
3. Add each volunteer from the lists above with their name, skill, and availability hours
4. Make sure to add ALL volunteers for comprehensive assignments

### Step 2: Run Agents with Sample Report
1. Go to **Run Agents** tab
2. Paste one of the sample reports above
3. Click **"Run All Agents"**
4. Watch the pipeline assign issues to volunteers

### Step 3: Review Action Plan
The system will generate:
- ✅ All extracted issues with priority scores
- ✅ Issue assignments to primary volunteers
- ✅ Backup volunteer suggestions if primary is overloaded
- ✅ Skill gap alerts (if no volunteer matches a sector)
- ✅ Workload balancing recommendations
- ✅ Final action plan summary

## What the Agents Will Do:

1. **Extraction Agent** - Parse report and find all issues
2. **Scoring Agent** - Calculate priority (1-10) based on sector criticality & affected population
3. **Gap Detection Agent** - Alert if missing volunteers for critical sectors
4. **Matching Agent** - Assign issues to best-fit volunteers
5. **Reallocation Agent** - Move work if someone gets overloaded
6. **Report Agent** - Generate final action plan with recommendations

