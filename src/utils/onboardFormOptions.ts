import type { OnboardOptionItem, OnboardOptionsResponse } from "@/types/onboard-options";

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
    parsed.delivery_statuses.length &&
      parsed.work_modes.length &&
      parsed.work_location_types.length &&
      parsed.user_types.length &&
      parsed.departments.length
  );
}

/** GET /masters/onboard-options — bare object (no wrapper). */
export function parseOnboardOptions(raw: unknown): OnboardOptionsResponse {
  const row =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const defaultsRaw =
    row.defaults && typeof row.defaults === "object" && !Array.isArray(row.defaults)
      ? (row.defaults as Record<string, unknown>)
      : {};

  const parsed: OnboardOptionsResponse = {
    delivery_statuses: parseOptionItems(row.delivery_statuses),
    work_modes: parseOptionItems(row.work_modes),
    work_location_types: parseOptionItems(row.work_location_types),
    user_types: parseOptionItems(row.user_types),
    departments: parseOptionItems(row.departments),
    defaults: {
      delivery_status: String(defaultsRaw.delivery_status ?? "").trim(),
      work_mode: String(defaultsRaw.work_mode ?? "").trim(),
      work_location_type: String(defaultsRaw.work_location_type ?? "").trim(),
      user_type: String(defaultsRaw.user_type ?? "").trim(),
    },
  };

  if (!isCompleteOptions(parsed)) {
    return FALLBACK_ONBOARD_OPTIONS;
  }

  const fallback = FALLBACK_ONBOARD_OPTIONS.defaults;
  return {
    ...parsed,
    defaults: {
      delivery_status:
        parsed.defaults.delivery_status ||
        parsed.delivery_statuses[0]?.value ||
        fallback.delivery_status,
      work_mode:
        parsed.defaults.work_mode || parsed.work_modes[0]?.value || fallback.work_mode,
      work_location_type:
        parsed.defaults.work_location_type ||
        parsed.work_location_types[0]?.value ||
        fallback.work_location_type,
      user_type:
        parsed.defaults.user_type || parsed.user_types[0]?.value || fallback.user_type,
    },
  };
}

/** Used when GET /masters/onboard-options fails or returns invalid data. */
export const FALLBACK_ONBOARD_OPTIONS: OnboardOptionsResponse = {
  delivery_statuses: [
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
  defaults: {
    delivery_status: "DELIVERY",
    work_mode: "WFO",
    work_location_type: "OFFSHORE",
    user_type: "FULLTIME",
  },
};
