import type { OnboardOptionItem, OnboardOptionsResponse } from "@/types/onboard-options";
import { parseBandsList } from "@/utils/masters";

function parseOptionItems(raw: unknown): OnboardOptionItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const value = String(row.value ?? "").trim();
      const label = String(row.label ?? value).trim();
      if (!value) return null;
      return { value, label: label || value };
    })
    .filter((item): item is OnboardOptionItem => Boolean(item));
}

function isCompleteOptions(parsed: OnboardOptionsResponse): boolean {
  return Boolean(
    parsed.categories.length &&
      parsed.work_modes.length &&
      parsed.work_location_types.length &&
      parsed.user_types.length &&
      parsed.departments.length
  );
}

function unwrapOnboardOptionsPayload(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const envelope = raw as Record<string, unknown>;
  const nested = envelope.data;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return envelope;
}

/** GET /masters/onboard-options — `{ message, data: { ... } }` or bare options object. */
export function parseOnboardOptions(raw: unknown): OnboardOptionsResponse {
  const row = unwrapOnboardOptionsPayload(raw);

  const parsed: OnboardOptionsResponse = {
    categories: parseOptionItems(row.categories ?? row.delivery_statuses),
    work_modes: parseOptionItems(row.work_modes),
    work_location_types: parseOptionItems(row.work_location_types),
    user_types: parseOptionItems(row.user_types),
    departments: parseOptionItems(row.departments),
    genders: parseOptionItems(row.genders),
    marital_statuses: parseOptionItems(row.marital_statuses),
    blood_groups: parseOptionItems(row.blood_groups),
    holiday_calendars: parseOptionItems(row.holiday_calendars),
    reporting_managers: parseOptionItems(row.reporting_managers),
  };

  if (!isCompleteOptions(parsed)) {
    return FALLBACK_ONBOARD_OPTIONS;
  }

  return parsed;
}

/** Bands bundled in GET /masters/onboard-options (`data.bands`). */
export function parseOnboardOptionsBands(raw: unknown): Array<Record<string, unknown>> {
  const row = unwrapOnboardOptionsPayload(raw);
  return parseBandsList(row.bands);
}

/** Used when GET /masters/onboard-options fails or returns invalid data. */
export const FALLBACK_ONBOARD_OPTIONS: OnboardOptionsResponse = {
  categories: [
    { value: "DELIVERY", label: "Delivery" },
    { value: "NON_DELIVERY", label: "Non delivery" },
  ],
  work_modes: [
    { value: "WFO", label: "Work from office" },
    { value: "WFH", label: "Work from home" },
    { value: "HYBRID", label: "Hybrid" },
  ],
  work_location_types: [
    { value: "OFFSHORE", label: "Offshore" },
    { value: "ONSITE", label: "Onsite" },
    { value: "HYBRID", label: "Hybrid" },
    { value: "REMOTE", label: "Remote" },
  ],
  user_types: [
    { value: "FULLTIME", label: "Full time" },
    { value: "INTERN", label: "Intern" },
    { value: "CONSULTANT", label: "Consultant" },
  ],
  departments: [
    { value: "AI/ML", label: "AI/ML" },
    { value: "Account Manager", label: "Account Manager" },
    { value: "Business Analyst", label: "Business Analyst" },
    { value: "Delivery Manager", label: "Delivery Manager" },
    { value: "DevOps", label: "DevOps" },
    { value: "Developer", label: "Developer" },
    { value: "Executive", label: "Executive" },
    { value: "Finance", label: "Finance" },
    { value: "Human Resources", label: "Human Resources" },
    { value: "Project Manager", label: "Project Manager" },
    { value: "QA", label: "QA" },
    { value: "Quality Assurance", label: "Quality Assurance" },
    { value: "UI/UX", label: "UI/UX" },
  ],
  genders: [
    { value: "MALE", label: "Male" },
    { value: "FEMALE", label: "Female" },
    { value: "OTHER", label: "Other" },
    { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
  ],
  marital_statuses: [
    { value: "SINGLE", label: "Single" },
    { value: "MARRIED", label: "Married" },
  ],
  blood_groups: [
    { value: "A+", label: "A+" },
    { value: "A-", label: "A-" },
    { value: "B+", label: "B+" },
    { value: "B-", label: "B-" },
    { value: "AB+", label: "AB+" },
    { value: "AB-", label: "AB-" },
    { value: "O+", label: "O+" },
    { value: "O-", label: "O-" },
  ],
  holiday_calendars: [],
  reporting_managers: [],
};
