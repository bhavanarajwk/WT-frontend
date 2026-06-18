# WebTrak Data Migration CSV Templates

CSV columns match WebTrak API field names (`/api/v1`). Fill only what you have; leave optional cells empty.

## Files

| File | Purpose |
|------|---------|
| `migration_employee_staging.csv` | Sample employees (10 rows) |
| `templates/migration_employee_staging_template.csv` | Empty employee template |
| `templates/migration_*_staging_template.csv` | Other entity templates |
| `sample/migration_*_staging.csv` | Small examples |

## Load order

1. Masters (bands, departments, designations) — configure in WebTrak first
2. Employees → `POST /user/onboard`
3. Employee documents (if any) → `PUT /user/onboard` multipart
4. Projects → `/project`, `/projects`
5. Allocations → `/allocation`
6. Timelogs → `/timelog`
7. Leave / WFH / comp-off → `/userRequest`
8. Offboarding → `/user/offboard`

## Employee CSV — required fields

| Column | Required when | Notes |
|--------|---------------|-------|
| `emp_id` | Always | Max 50 characters |
| `email` | Always | Work email (unique) |
| `name` | Always | Full legal name |
| `user_type` | Always | `FULLTIME`, `INTERN`, `CONSULTANT` |
| `department` | Always | Must exist in masters |
| `category` | Always | `DELIVERY` or `NON_DELIVERY` |
| `work_mode` | Always | `WFO`, `WFH`, `HYBRID` |
| `work_location_type` | Always | `OFFSHORE`, `ONSITE`, `HYBRID`, `REMOTE` |
| `role` | Always | Designation (must match band + department) |
| `band_id` | Always | From `GET /masters/bands` |
| `doj` | `FULLTIME` or `CONSULTANT` | Date `YYYY-MM-DD` |
| `doi` | `INTERN` | Date `YYYY-MM-DD` |
| `internship_duration` | `INTERN` | Months (integer) |

## Employee CSV — optional fields

Personal (HR onboard or employee survey): `personal_email`, `phone_number`, `date_of_birth`, `local_address`, `permanent_address`, `gender`, `marital_status`, `blood_group`, `emergency_contact_name`, `emergency_contact_number`

Skills / survey: `yoe`, `experience`, `primary_skills`, `secondary_skills`, `resume_share_link`

Account: `status` (`INVITED`, `ACTIVE`, `OFFBOARDED`), `roles` (comma-separated, e.g. `ROLE_EMPLOYEE,ROLE_MANAGER`)

## Field formats

- **Dates:** `YYYY-MM-DD`
- **primary_skills:** pipe-separated → `Python|FastAPI|PostgreSQL`
- **secondary_skills:** JSON → `[{"skill":"React","rating":3}]` (rating 1–5)
- **personal_email:** must differ from work `email`
- **phone_number:** Indian mobile, 10 digits (optional `+91`)

## Validation enums

| Field | Values |
|-------|--------|
| user_type | FULLTIME, INTERN, CONSULTANT |
| category | DELIVERY, NON_DELIVERY |
| work_mode | WFO, WFH, HYBRID |
| work_location_type | OFFSHORE, ONSITE, HYBRID, REMOTE |
| gender | MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY |
| marital_status | SINGLE, MARRIED |
| blood_group | A+, A-, B+, B-, AB+, AB-, O+, O- |
| request_type (leave) | LEAVE, WFH, COMP_OFF |
| exit_type (offboard) | VOLUNTARY, INVOLUNTARY, CONTRACTUAL (consultants: CONTRACTUAL; excluded from attrition) |
