# API date format — Frontend contract

**Base URL:** `http://localhost:8080/api/v1`  
**See also:** `api_contract.md` for onboard options, designations, and full endpoint list.

---

## Standard

| Type | JSON / query format | Example |
|------|---------------------|---------|
| **Date** | `dd/mm/yyyy` | `"26/05/2026"` |
| **Date-time** | `dd/mm/yyyy HH:MM:SS` | `"01/06/2026 10:34:18"` |

- Slashes (`/`), not dashes, for the canonical format.
- Leading zeros on day and month (`05`, not `5`).

---

## Requests

Send **`dd/mm/yyyy`** in JSON bodies, query parameters, and path date segments.

**Backward-compatible input:** ISO `2026-05-26`, dash DMY `26-05-2026`.

Legacy **`DELIVERABLE`** / **`NON_DELIVERABLE`** on delivery status are accepted by backend and mapped to **`DELIVERY`** / **`NON_DELIVERY`**.

---

## Responses

- Dates → `"dd/mm/yyyy"`
- Datetimes → `"dd/mm/yyyy HH:MM:SS"`

Includes nested `GenericResponse.data`.

---

## Frontend implementation

| Module | Purpose |
|--------|---------|
| `src/utils/apiDate.ts` | `toApiDate`, `fromApiDate`, `parseApiDate`, `normalizeToApiDate`, `compareApiDates` |
| `src/components/dashboard/ui/forms.tsx` | `InputField` / `DatePickerField` store **`dd/mm/yyyy`** in form state |
| `src/services/hrms.service.ts` | Normalizes onboard + invited + attendance + timelog path dates |
| `src/services/compOff.service.ts` | Normalizes comp-off query/body dates |

**Rules**

1. Display and edit dates as **`dd/mm/yyyy`**.
2. Do not assume `YYYY-MM-DD` from API responses.
3. HTML `<input type="date">` converts via `apiDateToInputValue` / `inputValueToApiDate`.
4. Query/path encoding: `URLSearchParams` and `encodeURIComponent` handle `/` in dates.

---

## Query param endpoints

| Method | Path | Params |
|--------|------|--------|
| GET | `/user/invited` | `fromDate`, `toDate` |
| GET | `/employee-attendance-leave` | `fromDate`, `toDate` |
| GET | `/export/timelogs` | `startDate`, `endDate` |
| GET | `/reports/utilization/utilization-by-department` | `as_of` |
| GET | `/reports/utilization/bench-aging` | `as_of` |
| GET | `/manager-team-on-leave-today` | `asOfDate` |
| GET | `/comp-off/earn` | `fromDate`, `toDate` |

Example: `GET /api/v1/user/invited?fromDate=26/05/2026&toDate=02/06/2026`

---

## Path date endpoints

| Method | Path |
|--------|------|
| GET | `/timelog/get/{empEmail}/{logDate}` |
| GET | `/userRequest/get/{fromDate}/{toDate}/{requestType}` |
| GET | `/userRequest/get/{empEmails}/{fromDate}/{toDate}/{requestType}` |

---

## Body examples — `POST /user/onboard`

```json
{
  "date_of_birth": "15/05/1998",
  "doj": "01/06/2026",
  "doi": "01/06/2026"
}
```

---

## Errors

**422 — invalid date**

```json
{
  "detail": "Invalid date: expected dd/mm/yyyy (e.g. 29/05/2026), got 'bad'"
}
```
