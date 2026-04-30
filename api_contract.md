# Webtrak Backend - Full API Contract (Code-Inferred)

This document is inferred from route handlers, Pydantic schemas, and service-layer validations/exceptions.  
Where behavior is not deterministically inferable from code path, it is marked as `Not स्पष्ट from code`.

## Global Conventions

### Base
- Base URL: `http://localhost:8080`
- API Prefix: `/api/v1`
- Health: `GET /health` -> `{"status":"ok"}`

### Authentication
- Cookie mode: `accessToken`, `refreshToken`, `tokenId` (HttpOnly)
- Bearer mode: `Authorization: Bearer <JWT>`
- Role checks via `require_any_role()`, bypassable if `ENABLE_ROLE_CHECKS=false`

### Standard Response Wrapper
Most endpoints return:
```json
{
  "message": "string",
  "data": {}
}
```

### Standard Error Format
```json
{
  "detail": "string or object"
}
```

Validation errors (`422`) follow FastAPI default:
```json
{
  "detail": [
    {
      "loc": ["body", "field"],
      "msg": "error",
      "type": "value_error"
    }
  ]
}
```

---

## Endpoint: GET /api/v1/google-signin

### Description
Initiates Google OAuth and redirects to Google auth URL.

### Request
Headers: None required  
Path params: None  
Query params: None  
Body: None

### Response
- `302 Found`: Redirect to Google URL

### Special Cases
- Sets `oauthState` cookie for CSRF state tracking.

### Authentication & Authorization
- Public endpoint.

### Error Handling
- `500`: `Missing Google client id.`

---

## Endpoint: GET /api/v1/auth/google/callback

### Description
Google OAuth callback; validates state/code and establishes session.

### Request
Headers: cookie `oauthState` (if flow started from same backend)
Query:
- `code?: string`
- `state?: string`
- `error?: string`
Body: None

### Response
- `302 Found` success redirect to frontend root
- `302 Found` failure redirect with query error:
  - `oauth_failed`
  - `invalid_oauth_state`
  - `missing_oauth_code`
  - `unregistered_user`
  - `oauth_login_failed`

### Authentication & Authorization
- Public callback endpoint.

---

## Endpoint: POST /api/v1/auth/refresh

### Description
Refreshes session using refresh cookies and rotates tokens.

### Request
Headers:
- `Content-Type: application/json` (empty body accepted)
- Cookies: `tokenId`, `refreshToken`
Body: none

### Response
`200 OK`
```json
{
  "message": "success",
  "data": {
    "message": "Session refreshed",
    "email": "user@webknot.in",
    "name": "User Name",
    "roles": ["ROLE_EMPLOYEE"],
    "status": "ACTIVE",
    "user_type": "FULLTIME"
  }
}
```

### Error Handling
- `401`: `Invalid refresh session.`

---

## Endpoint: POST /api/v1/auth/logout

### Description
Revokes current refresh token and clears auth cookies.

### Request
Headers: cookie `tokenId` (if available)
Body: none

### Response
`200 OK`
```json
{
  "message": "LoggedOut Successfully",
  "data": null
}
```

---

## Endpoint: GET /api/v1/oauth/bypass/{email}

### Description
Dev/staging login bypass for testing without Google OAuth.

### Request
Path params:
- `email: string` (required)
Body: none

### Response
`200 OK`
```json
{
  "message": "success",
  "data": {
    "message": "Login successful",
    "email": "user@webknot.in",
    "name": "User",
    "roles": ["ROLE_EMPLOYEE"],
    "status": "ACTIVE",
    "user_type": "FULLTIME"
  }
}
```

### Error Handling
- `403`: `Bypass is blocked in production.`

---

## Endpoint: POST /api/v1/user/onboard

### Description
Creates invited user for onboarding.

### Request
Headers:
- `Authorization: Bearer <accessToken>` or auth cookies
- `Content-Type: application/json`

Body schema:
```json
{
  "email": "string(email) [required]",
  "name": "string [required]",
  "user_type": "FULLTIME | INTERN | CONSULTANT [required]",
  "department": "string [required]",
  "phone_number": "string [required]",
  "work_mode": "string [required]",
  "work_location_type": "OFFSHORE | ONSITE | HYBRID | REMOTE [required]",
  "role": "string [required]",
  "band_id": "integer [required]",
  "doj": "date(YYYY-MM-DD) [required for FULLTIME/CONSULTANT]",
  "doi": "date(YYYY-MM-DD) [required for INTERN]",
  "internship_duration": "integer [required for INTERN]"
}
```

Example:
```json
{
  "email": "jane@webknot.in",
  "name": "Jane",
  "user_type": "FULLTIME",
  "department": "Developer",
  "phone_number": "9999999999",
  "work_mode": "WFO",
  "work_location_type": "OFFSHORE",
  "role": "Software Engineer",
  "band_id": 2,
  "doj": "2026-01-10"
}
```

### Response
- `200 OK`:
```json
{
  "message": "success",
  "data": {
    "emp_id": "EMP001",
    "email": "jane@webknot.in",
    "name": "Jane",
    "status": "INVITED",
    "user_type": "FULLTIME",
    "work_location_type": "OFFSHORE"
  }
}
```
- `400`: duplicate/invalid designation
- `404`: band not found
- `403`: insufficient role

### Validation Rules
- `work_location_type` normalized and enum checked.
- `INTERN` requires `doi` + `internship_duration`.
- `FULLTIME/CONSULTANT` requires `doj`.

### Authentication & Authorization
- Required roles: `ROLE_HR`, `ROLE_ADMIN`.

---

## Endpoint: PUT /api/v1/user/onboard

### Description
Completes onboarding with profile and documents.

### Request
Headers:
- Authorization required
- `Content-Type: multipart/form-data`

Form fields:
- `user_data` (stringified JSON, required):
```json
{
  "email": "string(email) [required]",
  "yoe": "integer | null",
  "experience": "string | null",
  "primary_skills": ["string", "..."] ,
  "secondary_skills": [
    { "skill": "string", "rating": "integer(1..5)" }
  ],
  "work_location_type": "OFFSHORE | ONSITE | HYBRID | REMOTE | null"
}
```
- Optional files:
  - `resume`
  - `reliving_letter`
  - `salary_slips[]`
  - `certifications[]`
  - `profile_photo`
  - `aadhaar`
  - `pan_card`

### Response
- `200 OK` success wrapper with onboard summary.
- `400` possible messages:
  - `At least one Primary Skill is required`
  - `Please provide Experience details if you are experienced`
  - `Please upload your updated Resume`
  - `Please upload profile photo`
  - `Please upload Aadhaar`
  - `Please upload PAN card`
- `403`:
  - `Insufficient role`
  - `Cannot update onboarding for another user`
- `404`: `User not found`

### Validation Rules
- Owner check: payload email must match actor email.
- `secondary_skills.rating`: `1..5`
- `secondary_skills.skill`: non-empty
- FULLTIME/INTERN resume required if absent in profile.

### Authentication & Authorization
- Roles: `ROLE_EMPLOYEE`, `ROLE_ADMIN`, `ROLE_HR`

---

## Endpoint: GET /api/v1/user/onboard

### Description
Paginated listing of onboard users.

### Request
Headers: Authorization required  
Query:
- `page: int = 0`
- `size: int = 10`
- `search?: string`
- `type?: string`
- `onboardingStatus?: string`

### Response
`200 OK`
```json
{
  "message": "all onboarded users fetched successfully",
  "data": {
    "items": [
      {
        "emp_id": "string|null",
        "email": "string",
        "name": "string",
        "status": "string",
        "user_type": "string",
        "department": "string|null"
      }
    ],
    "total": 0,
    "page": 0,
    "size": 10
  }
}
```

### Authentication & Authorization
- Roles: `ROLE_HR`, `ROLE_ADMIN`

---

## Endpoint: GET /api/v1/profile

### Description
Fetches profile of authenticated user.

### Request
Headers: Authorization required

### Response
`200 OK` with `EmployeeProfileResponse`.
Possible `404`: `User not found`

### Authentication & Authorization
- Roles: `ROLE_HR`, `ROLE_MANAGER`, `ROLE_EMPLOYEE`, `ROLE_ADMIN`

---

## Endpoint: PUT /api/v1/profile

### Description
Updates own profile.

### Request
Headers:
- Authorization required
- `Content-Type: multipart/form-data`

Form:
- `body` required JSON string:
```json
{
  "phone_number": "string|null",
  "work_mode": "string|null",
  "primary_skills": ["string"] ,
  "secondary_skills": [{"skill":"string","rating":"integer(1..5)"}],
  "experience": "string|null",
  "work_location_type": "OFFSHORE|ONSITE|HYBRID|REMOTE|null"
}
```
- `profilePic` optional file

### Response
`200 OK` with updated profile.

### Validation Rules
- If `primary_skills` provided, must contain at least one non-empty value.

---

## Endpoint: GET /api/v1/employee-profile/{empId}

### Description
HR view of specific employee profile.

### Request
Path params:
- `empId: string`

### Response
- `200 OK` profile
- `404` user not found

### Authentication & Authorization
- `ROLE_HR`

---

## Endpoint: PUT /api/v1/employee-profile/{empId}

### Description
HR updates employee profile/admin fields.

### Request
Headers: JSON + Authorization  
Path params: `empId: string`  
Body:
```json
{
  "name": "string|null",
  "department": "string|null",
  "user_status": "string|null",
  "work_mode": "string|null",
  "band_id": "int|null",
  "primary_skills": ["string"] ,
  "secondary_skills": [{"skill":"string","rating":"integer(1..5)"}],
  "experience": "string|null",
  "yoe": "int|null",
  "work_location_type": "OFFSHORE|ONSITE|HYBRID|REMOTE|null"
}
```

### Response
- `200 OK`
- `404`: user/band not found
- `400`: invalid primary skill constraints

### Authentication & Authorization
- `ROLE_HR`

---

## Endpoint: GET /api/v1/user

### Description
Fetch user by `email` or `empId`.

### Request
Query:
- `email?: string`
- `empId?: string`

### Response
- `200 OK` profile
- `400`: `Provide email or empId`
- `404`: user not found

### Authentication & Authorization
- No explicit `require_any_role()` in route.

---

## Endpoint: POST /api/v1/upload

### Description
Imports leave balances from Excel.

### Request
Headers: Authorization, `multipart/form-data`  
Form:
- `file` required (`.xlsx`)

Excel structure (inferred):
- Column A: email
- Column C: primary_leave
- Column D: secondary_leave
- Column E: carry_forward
- Header row skipped.

### Response
`200 OK`
```json
{
  "message": "Leave data imported successfully",
  "data": {
    "processed": 10,
    "skipped": 2
  }
}
```

### Authentication & Authorization
- `ROLE_HR`, `ROLE_ADMIN`

---

## Endpoint: POST /api/v1/upload-allocation

### Description
Imports allocation rows from Excel (legacy layout).

### Request
Headers: Authorization, `multipart/form-data`  
Form: `file` required

Excel columns (inferred):
- B email
- D role
- E allocation fraction (converted to hours)
- F start_date
- G end_date
- H locked_date
- I allocation_type
- J project_code

### Response
`200 OK`
```json
{
  "message": "Allocation data imported successfully",
  "data": {
    "completed": 25,
    "errors": []
  }
}
```

### Authentication & Authorization
- `ROLE_HR`, `ROLE_ADMIN`

---

## Endpoint: POST /api/v1/upload/user-data

### Description
Bulk updates existing users from Excel.

### Request
Headers: Authorization, `multipart/form-data`  
Form: `file` required

Supported columns: named headers or legacy positional; includes email, user_type, status, band_id, doj, phone, department.

### Response
`200 OK` with processed/skipped/errors summary.

### Authentication & Authorization
- `ROLE_HR`, `ROLE_ADMIN`

---

## Endpoint: POST /api/v1/user/batch

### Description
Bulk create/update users from Excel.

### Request
Headers: Authorization, `multipart/form-data`  
Form: `file` required

Legacy positional columns:
- A emp_id
- B name
- C email

### Response
`200 OK` summary with processed/skipped/errors.

### Authentication & Authorization
- `ROLE_ADMIN`

---

## Endpoint: POST /api/v1/allocation

### Description
Creates allocation for user/project.

### Request
Headers: Authorization + JSON  
Body:
```json
{
  "employee_email": "string(email) [required]",
  "project_code": "string [required]",
  "role": "string|null",
  "allocated_hours": "integer [required, 1..8]",
  "start_date": "date [required]",
  "end_date": "date|null",
  "allocation_type": "STAFFING|DEPLOYABLE|NONDEPLOYABLE|LOCKED|NONBILLABLE (default DEPLOYABLE)",
  "locked_in_date": "date|null",
  "is_manager": "boolean (default false)",
  "billing_status": "string|null",
  "work_location_type": "OFFSHORE|ONSITE|HYBRID|REMOTE|null"
}
```

### Response
- `200 OK` allocation object
- `400` (examples):
  - invalid role
  - project missing
  - duplicate allocation
  - allocation rule violations
- `403`: only HR/Admin
- `404`: user not found

### Validation Rules
- `allocated_hours` min `1`, max `8`
- date window validation
- `LOCKED` requires valid `locked_in_date`
- project/allocation-type compatibility validation

### Authentication & Authorization
- `ROLE_HR`, `ROLE_ADMIN`

---

## Endpoint: GET /api/v1/allocation

### Description
List allocations with filtering and pagination.

### Request
Query:
- `projectCode?: string`
- `userEmail?: string`
- `search?: string`
- `page: int>=0 = 0`
- `size: int 1..200 = 10`
- `view?: string`

### Response
`200 OK` paginated allocation list.

### Authentication & Authorization
- `ROLE_HR`

---

## Endpoint: GET /api/v1/allocation/roles

### Description
Returns allocation role master values.

### Request
Query: `search?: string`

### Response
`200 OK` list: `[{ "id": 1, "name": "PM" }]`

### Authentication & Authorization
- `ROLE_HR`, `ROLE_ADMIN`

---

## Endpoint: GET /api/v1/allocation/user

### Description
Returns allocations of authenticated actor.

### Request
No query/body.

### Response
`200 OK` list of user allocations.

### Authentication & Authorization
- `ROLE_HR`, `ROLE_MANAGER`, `ROLE_EMPLOYEE`, `ROLE_ADMIN`

---

## Endpoint: GET /api/v1/allocation/forecasting

### Description
Forecast allocation utilization.

### Request
Query:
- `days: int [required, 1..3650]`
- `projectCode?: string`
- `search?: string`
- `page: int>=0 = 0`
- `size: int 1..200 = 10`

### Response
- `200 OK` paginated forecast allocations
- `400`: `days must be at least 1`

### Authentication & Authorization
- `ROLE_HR`

---

## Endpoint: PUT /api/v1/allocation/{allocation_id}

### Description
Updates allocation by id.

### Request
Path:
- `allocation_id: int`
Body: same fields as create, with `start_date/end_date/allocation_type` nullable in schema.

### Response
- `200 OK`
- `400` allocation missing/invalid changes
- `403` role

### Authentication & Authorization
- `ROLE_HR`, `ROLE_ADMIN`

---

## Endpoint: DELETE /api/v1/allocation/{allocation_id}

### Description
Deletes allocation by id.

### Request
Path: `allocation_id: int`

### Response
- `200 OK`
- `400`: not found or locked allocation before locked-in date
- `403`: insufficient role

---

## Endpoint: POST /api/v1/allocation/batch

### Description
Admin-only batch allocation import.

### Request
Headers: Authorization + `multipart/form-data`  
Form: `file` required

### Response
- `200 OK` import summary
- `403`: only admin
- `500`: openpyxl missing dependency

---

## Endpoint: POST /api/v1/allocation/update

### Description
Legacy Java-compatible update/delete allocation endpoint.

### Request
Query:
- `allocationId: int [required]`
Body:
- nullable
- if present:
```json
{
  "employeeEmail": "string(email)",
  "projectCode": "string",
  "role": "string|null",
  "allocatedHours": "integer 1..8",
  "startDate": "date|null",
  "endDate": "date|null",
  "allocationType": "enum|null",
  "lockedInDate": "date|null",
  "isManager": "boolean default false"
}
```

### Response
- `200 OK`
- If body omitted, endpoint performs delete.

---

## Endpoint: POST /api/v1/allocation-extension-request

### Description
Create allocation extension request.

### Request
Body:
```json
{
  "user_email": "string(email) [required]",
  "project_code": "string [required]",
  "requested_end_date": "date [required]",
  "reason": "string|null"
}
```

### Response
- `200 OK` with created request id
- `400` active allocation issues/date rule violations
- `404` actor/user not found

### Authentication & Authorization
- `ROLE_MANAGER`, `ROLE_HR`, `ROLE_ADMIN`

---

## Endpoint: GET /api/v1/allocation-extension-request

### Description
HR/admin list of extension requests.

### Request
Query:
- `page: int>=0 = 0`
- `size: int 1..200 = 10`
- `search?: string`
- `status?: string`

### Response
`200 OK` paginated extension requests.

### Authentication & Authorization
- `ROLE_HR`, `ROLE_ADMIN`

---

## Endpoint: PUT /api/v1/allocation-extension-request/status

### Description
Approves/rejects extension request.

### Request
Body:
```json
{
  "request_id": "integer [required]",
  "status": "string [required]"
}
```

### Response
`200 OK` request id

### Authentication & Authorization
- `ROLE_HR`, `ROLE_ADMIN`

### Notes
- Exact accepted status values: `Not स्पष्ट from code` (in route/schema; likely validated deeper in service/domain).

---

## Endpoint: GET /api/v1/manager/allocation-extension-status

### Description
Manager view of own extension request status.

### Request
Query:
- `page: int>=0 = 0`
- `size: int 1..200 = 10`
- `search?: string`
- `projectCode?: string`

### Response
`200 OK` paginated list.

### Authentication & Authorization
- `ROLE_MANAGER`, `ROLE_HR`, `ROLE_ADMIN`

---

## Endpoint: POST /api/v1/project

### Description
Create single project.

### Request
Body:
```json
{
  "project_code": "string [required, min length 1]",
  "project_name": "string [required, min length 1]",
  "project_type": "IN_HOUSE | STAFFING | PRODUCT [required]"
}
```

### Response
- `200 OK`
- `400`: code/name required or duplicate

### Authentication & Authorization
- `ROLE_HR`, `ROLE_ADMIN`

---

## Endpoint: POST /api/v1/projects

### Description
Bulk create projects.

### Request
Body: array of `CreateProjectRequest`.

### Response
`200 OK` created project list.

### Authentication & Authorization
- `ROLE_ADMIN`

---

## Endpoint: GET /api/v1/projects

### Description
Paginated project list.

### Request
Query:
- `page: int = 0`
- `size: int = 10`
- `search?: string`

### Response
`200 OK` with `{items,total,page,size}`.

### Authentication & Authorization
- `ROLE_HR`

---

## Endpoint: GET /api/v1/projects/all

### Description
Project list without pagination.

### Request
Query: `search?: string`

### Response
`200 OK` with `{items,total}`.

### Authentication & Authorization
- `ROLE_HR`

---

## Endpoint: GET /api/v1/project

### Description
Get project by code.

### Request
Query:
- `projectCode: string [required]`

### Response
- `200 OK`
- `404`: `Project not found`

### Authentication & Authorization
- `ROLE_HR`

---

## Endpoint: GET /api/v1/manager-projects

### Description
Manager-specific project view.

### Response
- `200 OK`
- `404`: manager not found

### Authentication & Authorization
- `ROLE_MANAGER`

---

## Endpoint: GET /api/v1/manager-projects-with-roles

### Description
Manager projects including role-level details.

### Response
`200 OK`

### Authentication & Authorization
- `ROLE_MANAGER`

---

## Endpoint: GET /api/v1/project-assigned-to-user

### Description
Projects assigned to current actor.

### Response
- `200 OK`
- `404`: user not found

### Authentication & Authorization
- `ROLE_HR`, `ROLE_MANAGER`, `ROLE_EMPLOYEE`, `ROLE_ADMIN`

---

## Endpoint: POST /api/v1/timelog

### Description
Submit timelog entry.

### Request
Body:
```json
{
  "project_code": "string [required, min length 1]",
  "log_date": "date [required]",
  "hours": "integer [required, 1..24]",
  "description": "string|null"
}
```

### Response
- `200 OK`
- `400/403/404` possible based on service validation and ownership/access
- error `detail` may be object in timelog service:
```json
{
  "detail": {
    "code": "ERROR_CODE",
    "message": "message",
    "details": {}
  }
}
```

### Authentication & Authorization
- `ROLE_HR`, `ROLE_MANAGER`, `ROLE_EMPLOYEE`, `ROLE_ADMIN`

---

## Endpoint: GET /api/v1/timelog

### Description
List own timelogs.

### Request
Query: `page>=0`, `size 1..200`

### Response
`200 OK` paginated timelog list.

---

## Endpoint: GET /api/v1/timelog/get/{empEmail}/{logDate}

### Description
Legacy endpoint to fetch timelogs by employee/date.

### Request
Path:
- `empEmail: string`
- `logDate: string` (supports `dd-mm-yyyy` or ISO)
Query: `page`, `size`

### Response
- `200 OK`
- `403`: `Unauthorized user`

---

## Endpoint: PUT /api/v1/timelog/{timelog_id}

### Description
Edit timelog entry.

### Request
Path: `timelog_id: int`  
Body:
```json
{
  "project_code": "string [required]",
  "log_date": "date [required]",
  "hours": "int [required, 1..24]",
  "description": "string|null"
}
```

### Response
`200 OK`

---

## Endpoint: DELETE /api/v1/timelog/{timelog_id}

### Description
Delete timelog entry.

### Response
`200 OK`
```json
{
  "message": "success",
  "data": null
}
```

---

## Endpoint: PUT /api/v1/timelog/entry

### Description
Legacy Java endpoint to update timelog description/hours.

### Request
Body:
```json
{
  "timeLogId": "integer [required]",
  "description": "string|null",
  "loggedHours": "integer [required, 1..24]"
}
```

### Response
`200 OK`

---

## Endpoint: PUT /api/v1/timelog/status

### Description
Single timelog approval/rejection.

### Request
Body:
```json
{
  "timelog_id": "integer [required]",
  "status": "APPROVED | REJECTED [required]",
  "manager_comment": "string|null"
}
```

### Response
`200 OK`

### Authentication & Authorization
- `ROLE_MANAGER`, `ROLE_HR`, `ROLE_ADMIN`

---

## Endpoint: PUT /api/v1/timelog/status/batch

### Description
Batch status update by employee/project/date.

### Request
Body:
```json
{
  "employee_email": "string(email) [required]",
  "project_code": "string [required]",
  "log_date": "date [required]",
  "status": "APPROVED | REJECTED [required]",
  "manager_comment": "string|null"
}
```

### Response
`200 OK`

### Authentication & Authorization
- `ROLE_MANAGER`, `ROLE_HR`, `ROLE_ADMIN`

---

## Endpoint: GET /api/v1/export/timelogs

### Description
Exports timelogs in CSV/XLSX.

### Request
Query:
- `startDate: date [required]`
- `endDate: date [required]`
- `projectCode?: string`
- `empEmail?: string`
- `format: string = csv` (`csv` or `xlsx`)

### Response
- `200 OK` file stream:
  - CSV -> `text/csv`, `timelogs.csv`
  - XLSX -> `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `project_time_logs.xlsx`
- `400`: `format must be csv or xlsx`

### Authentication & Authorization
- `ROLE_MANAGER`, `ROLE_HR`, `ROLE_ADMIN`

---

## Endpoint: GET /api/v1/export/timelogs/{projectCode}/{empEmail}/{startDate}/{endDate}

### Description
Legacy employee timelog XLSX export.

### Request
Path date format supports `dd-mm-yyyy` or ISO.

### Response
`200 OK` XLSX stream (`time_logs.xlsx`)

---

## Endpoint: GET /api/v1/export/timelogs/{startDate}/{endDate}
## Endpoint: GET /api/v1/export/timelogs/{projectCode}/{startDate}/{endDate}

### Description
Legacy project summary XLSX exports.

### Request
Path dates support `dd-mm-yyyy` or ISO; optional query `empEmail`.

### Response
`200 OK` XLSX stream (`project_time_logs.xlsx`)

---

## Endpoint: POST /api/v1/userRequest

### Description
Create leave/WFH/comp-off request.

### Request
Body:
```json
{
  "request_from_date": "date [required]",
  "request_to_date": "date [required]",
  "request_type": "string [required]",
  "comments": "string|null (max 200 chars by service)",
  "is_half_day": "boolean default false",
  "reference_file_url": "string|null",
  "manager_comp_off_email": "string(email)|null",
  "client_approval": "boolean|null"
}
```

### Response
- `200 OK` request id
- `400` examples:
  - date range invalid
  - half-day multi-day
  - comments too long
  - bench restrictions
  - duplicate pending/approved overlap
- `404` user not found

### Authentication & Authorization
- `ROLE_EMPLOYEE`, `ROLE_MANAGER`, `ROLE_HR`, `ROLE_ADMIN`

---

## Endpoint: GET /api/v1/userRequest/get/{fromDate}/{toDate}/{requestType}
## Endpoint: GET /api/v1/userRequest/get/{empEmails}/{fromDate}/{toDate}/{requestType}

### Description
List requests by period and type (optional employee list path variant).

### Request
Path:
- `fromDate`, `toDate`: `dd-mm-yyyy` or ISO
- `requestType: string`
- `empEmails?: comma-separated`
Query: `page>=0`, `size 1..200`

### Response
`200 OK` paginated request list.

---

## Endpoint: PUT /api/v1/userRequest/status

### Description
Approve/reject user request.

### Request
Body:
```json
{
  "user_request_id": "int [required]",
  "user_request_status": "string [required]",
  "message": "string|null"
}
```

### Response
- `200 OK`
- `400` invalid action/self-approval/rejection message required/already acted
- `403` authorization constraints
- `404` request missing

### Authentication & Authorization
- `ROLE_MANAGER`, `ROLE_HR`, `ROLE_ADMIN`

---

## Endpoint: PUT /api/v1/userRequest

### Description
Update pending request by owner.

### Request
Body: `UserRequestUpdate` (`UserRequestCreate` fields + `user_request_id`)

### Response
- `200 OK`
- `400`: only pending updatable
- `403`: unauthorized request
- `404`: request not found

---

## Endpoint: DELETE /api/v1/userRequest

### Description
Delete pending request by owner.

### Request
Body:
```json
{
  "user_request_id": "int [required]"
}
```

### Response
- `200 OK`
- `400`: only pending deletable
- `403`: unauthorized request
- `404`: request not found

---

## Endpoint: GET /api/v1/leave-summary

### Description
Paginated leave/LOP summary.

### Request
Query:
- `page: int>=0 = 0`
- `size: int 1..200 = 10`
- `search?: string`
- `type?: string`
- `band?: string`
- `year?: int`
- `month?: int`

### Response
`200 OK`
```json
{
  "message": "leave summary fetched successfully",
  "data": {
    "current_page": 0,
    "total_page": 1,
    "page_size": 10,
    "total_element": 1,
    "data": [
      {
        "name": "string",
        "email": "string",
        "emp_id": "string|null",
        "role": "string",
        "type": "string",
        "band": "string",
        "leaves": 0,
        "lop": 0,
        "leave_details": [
          {
            "from_date": "date",
            "to_date": "date",
            "is_half_day": false,
            "leave_count": 1.0
          }
        ]
      }
    ]
  }
}
```

### Validation Rules
- month must be valid and not future-month for selected year.

### Authentication & Authorization
- `ROLE_HR`, `ROLE_ADMIN`

---

## Endpoint: GET /api/v1/notifications

### Description
List notifications for actor.

### Request
Query:
- `page: int>=0 = 0`
- `size: int 1..200 = 20`

### Response
`200 OK` paginated notification page.

### Authentication & Authorization
- `ROLE_HR`, `ROLE_MANAGER`, `ROLE_EMPLOYEE`, `ROLE_ADMIN`, `ROLE_FINANCE`

---

## Endpoint: PUT /api/v1/notifications/{notification_id}/read

### Description
Mark one notification read.

### Request
Path: `notification_id: int`

### Response
- `200 OK`
- `404`: user/notification not found

---

## Endpoint: PUT /api/v1/notifications/read-all

### Description
Mark all actor notifications read.

### Response
`200 OK`
```json
{
  "message": "success",
  "data": { "updated": 5 }
}
```

---

## Endpoint: POST /api/v1/notifications/announcement

### Description
Broadcast announcement.

### Request
Body:
```json
{
  "title": "string [required]",
  "message": "string [required]"
}
```

### Response
`200 OK`

### Authentication & Authorization
- `ROLE_HR`, `ROLE_ADMIN`

---

## Endpoint: GET /api/v1/notifications/delete

### Description
Delete read notifications.

### Response
`200 OK` with deleted count.

### Authentication & Authorization
- `ROLE_HR`, `ROLE_ADMIN`

---

## Endpoint: GET /api/v1/notifications/subscribe

### Description
SSE stream for real-time notifications.

### Request
Headers:
- Authorization required
- `Accept: text/event-stream`

### Response
`200 OK` stream:
- `event: notification` with JSON payload:
```json
{
  "id": 1,
  "receiver_id": 10,
  "sender_id": 2,
  "type": "ANNOUNCEMENT",
  "title": "Title",
  "message": "Message",
  "is_read": false,
  "created_at": "datetime"
}
```
- `event: heartbeat` every timeout interval.

### Error Handling
- `404`: `User not found`

---

## Endpoint: GET /api/v1/masters/bands

### Description
Lists band master rows.

### Request
Query: `search?: string`

### Response
`200 OK`
```json
[
  {
    "id": 1,
    "name": "B1",
    "stream": "Developer",
    "designation": "Software Engineer"
  }
]
```

### Authentication & Authorization
- Read roles: `ROLE_HR`, `ROLE_MANAGER`, `ROLE_EMPLOYEE`, `ROLE_ADMIN`

---

## Endpoint: GET /api/v1/masters/kpi-definitions

### Description
List KPI definitions (paginated when `limit/offset` used).

### Request
Query: `limit?: int`, `offset?: int`

### Response
- Either list response or paginated object:
```json
{
  "data": [],
  "current_page": 0,
  "page_size": 10,
  "total_element": 0,
  "total_page": 0
}
```

---

## Endpoint: GET /api/v1/masters/kpi-definitions/{kpi_id}

### Description
Get one KPI definition.

### Response
- `200 OK`
- `404`: KPI not found

---

## Endpoint: POST /api/v1/masters/kpi-definitions

### Description
Create KPI definition.

### Request
Body:
```json
{
  "band_id": "int >0 [required]",
  "department": "Developer|AI/ML|Business Analyst|UI/UX|DevOps|Finance|Project Manager|Quality Assurance|Executive [required]",
  "designation": "string [required, 1..255]",
  "kpi_name": "string [required, 1..255]",
  "weightage": "number [required, 5..100]",
  "active": "boolean default true"
}
```

### Response
- `200 OK`
- `400`: duplicate or weightage invalid
- `404`: band not found

### Authentication & Authorization
- Write roles: `ROLE_HR`, `ROLE_ADMIN`

---

## Endpoint: PUT /api/v1/masters/kpi-definitions/{kpi_id}

### Description
Update KPI definition.

### Request
All fields optional; same constraints as create.

### Response
- `200 OK`
- `400`: duplicate/weightage invalid
- `404`: KPI or band not found

---

## Endpoint: DELETE /api/v1/masters/kpi-definitions/{kpi_id}

### Description
Delete KPI definition.

### Response
`200 OK`
```json
{ "message": "deleted" }
```

---

## Endpoint: GET /api/v1/masters/webknot-values

### Description
List webknot values.

### Request
Query: `limit?: int`, `offset?: int`, `active_only?: bool`

### Response
Paginated webknot response.

---

## Endpoint: POST /api/v1/masters/webknot-values

### Description
Create webknot value.

### Request
```json
{
  "title": "string [required, 1..500]",
  "evaluation_criteria": "string|null",
  "active": "boolean default true"
}
```

### Response
`200 OK`

### Authentication & Authorization
- Write roles: `ROLE_HR`, `ROLE_ADMIN`

---

## Endpoint: PUT /api/v1/masters/webknot-values/{row_id}

### Description
Update webknot value.

### Response
- `200 OK`
- `404`: not found

---

## Endpoint: DELETE /api/v1/masters/webknot-values/{row_id}

### Description
Delete webknot value.

### Response
`200 OK` -> `{ "message": "deleted" }`

---

## Endpoint: GET /api/v1/masters/submission-cycles

### Description
List submission cycles.

### Request
Query: `limit?: int`, `offset?: int`

### Response
List or paginated object.

---

## Endpoint: GET /api/v1/masters/submission-cycles/by-key

### Description
Get cycle by key (+ optional scope).

### Request
Query:
- `cycle_key: string [required]`
- `scope?: string`

### Response
- `200 OK`
- `404`: not found

---

## Endpoint: GET /api/v1/masters/submission-cycles/{cycle_id}

### Description
Get cycle by id.

### Response
- `200 OK`
- `404`: not found

---

## Endpoint: POST /api/v1/masters/submission-cycles

### Description
Create submission cycle.

### Request
```json
{
  "cycle_key": "string [required, 1..7]",
  "scope": "string|null (max 16)",
  "window_start_at": "datetime [required]",
  "window_end_at": "datetime|null",
  "manual_closed": "boolean default false",
  "updated_by": "string|null"
}
```

### Response
- `200 OK`
- `400`: duplicate cycle or key length > 7

### Authentication & Authorization
- Write roles: `ROLE_HR`, `ROLE_ADMIN`

---

## Endpoint: PUT /api/v1/masters/submission-cycles/{cycle_id}

### Description
Update submission cycle.

### Request
All fields optional; same constraints as create.

### Response
- `200 OK`
- `400`: duplicate or cycle_key length
- `404`: not found

---

## Endpoint: DELETE /api/v1/masters/submission-cycles/{cycle_id}

### Description
Delete submission cycle.

### Response
`200 OK` -> `{ "message": "deleted" }`

---

## Endpoint: GET /api/v1/masters/designations

### Description
List designations for band and department.

### Request
Query:
- `band_id: int [required, >0]`
- `department: string [required, min length 1]`

### Response
`200 OK` designation list.

---

## Endpoint: POST /api/v1/roles/assign

### Description
Assign role to target email (supports bootstrap header).

### Request
Headers:
- `X-Admin-Bootstrap-Key?: string`
- auth if not bootstrap

Body:
```json
{
  "target_email": "string(email) [required]",
  "role": "string [required]"
}
```

### Response
`200 OK`
```json
{
  "target_email": "user@webknot.in",
  "assigned_role": "ROLE_MANAGER",
  "assigned_by": "admin@webknot.in",
  "message": "Role assigned"
}
```

### Error Handling
- `401`: unauthorized
- `403`: insufficient role
- `400`: unsupported role
- `404`: target user not found

---

## Endpoint: POST /api/v1/assign-role

### Description
Legacy Java contract for role assignment.

### Request
Headers: same as `/roles/assign`
Body:
```json
{
  "userEmail": "string(email) [required]",
  "roleName": "string [required]"
}
```

### Response
`200 OK` generic wrapper containing assignment object.

---

## Endpoint: POST /api/v1/scheduler/run-all

### Description
Triggers all scheduled jobs manually.

### Request
Headers: Authorization required
Body: none

### Response
- `200 OK`:
```json
{
  "message": "Scheduler jobs executed",
  "data": {}
}
```
- `403`: blocked in prod or insufficient role

### Authentication & Authorization
- `ROLE_HR`, `ROLE_ADMIN`

---

## Additional Cross-Cutting Validation Notes
- `secondary_skills.rating` -> `1..5`
- `allocation.allocated_hours` -> `1..8`
- `timelog.hours/loggedHours` -> `1..24`
- `timelog.status` -> `APPROVED|REJECTED` for status update APIs
- pagination constraints appear on many APIs: `page>=0`, `size 1..200`

## Additional Cross-Cutting Error Notes
- Invalid/expired bearer with present token can produce:
```json
{ "detail": "Invalid or expired access token" }
```
- Some services (notably timelog) may return structured error object inside `detail`.
- Unexpected server exceptions map to framework default `500`; exact payload `Not स्पष्ट from code`.
