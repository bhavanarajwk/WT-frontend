import { formatSecondarySkillsForProfile } from "@/components/dashboard/ui/profile";
import type { OnboardListItem } from "@/types/onboard";
import { pickResumeShareLink } from "@/utils/employeeResume";
import { formatApiDateDisplay } from "@/utils/apiDate";
import { formatUserTypeLabel } from "@/utils/offboardingFormState";
import { formatRoleDisplayValue } from "@/utils/roles";
import {
  defaultPhoneCountryIso,
  formatPhoneNumberForApi,
  splitPhoneNumber,
} from "@/utils/phoneCountries";

function formatWorkModeLabel(value: unknown): string {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!normalized) return "—";
  if (normalized === "HYBRID") return "Hybrid";
  if (normalized === "REMOTE") return "Remote";
  if (normalized === "ONSITE" || normalized === "ON_SITE") return "Onsite";
  return String(value ?? "").trim() || "—";
}

function formatWorkLocationLabel(value: unknown): string {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!normalized) return "—";
  if (normalized === "REMOTE") return "Remote";
  if (normalized === "ONSITE" || normalized === "ON_SITE") return "Onsite";
  return String(value ?? "").trim() || "—";
}

function formatCategoryLabel(value: unknown): string {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!normalized) return "—";
  if (normalized === "DELIVERY") return "Delivery";
  if (normalized === "NON_DELIVERY" || normalized === "NONDELIVERY") return "Non-Delivery";
  return String(value ?? "").trim() || "—";
}

function formatBandForProfile(profile: Record<string, unknown>): string {
  const label = pickProfileField(profile, ["band_name", "bandName", "band"]);
  if (label != null) {
    const text = String(label).trim();
    if (text && !/^\d+$/.test(text)) return text;
  }
  const bandId = pickProfileField(profile, ["band_id", "bandId"]);
  return bandId != null ? `Band ${String(bandId).trim()}` : "—";
}

function formatReportingManagerForProfile(profile: Record<string, unknown>): string {
  const manager = pickProfileField(profile, [
    "reporting_manager",
    "reportingManager",
    "manager_name",
    "managerName",
    "manager",
  ]);
  return manager != null ? String(manager).trim() || "—" : "—";
}

function isInternProfile(profile: Record<string, unknown>): boolean {
  return String(pickProfileField(profile, ["user_type", "userType"]) ?? "")
    .trim()
    .toUpperCase() === "INTERN";
}

function formatDirectoryDate(value: unknown): string {
  const s = String(value ?? "").trim();
  if (!s) return "—";
  return formatApiDateDisplay(s);
}

type OnboardRowInput = OnboardListItem | Record<string, unknown>;

function asOnboardRecord(row: OnboardRowInput): Record<string, unknown> {
  return row as Record<string, unknown>;
}

export function rowEmpId(row: Record<string, unknown>): string {
  return String(
    row.emp_id ?? row.empId ?? row.employee_id ?? row.employeeId ?? ""
  ).trim();
}

export function rowEmail(row: Record<string, unknown>): string {
  const direct = String(
    row.email ?? row.user_email ?? row.userEmail ?? row.employee_email ?? ""
  ).trim();
  if (direct) {
    return direct.toLowerCase().startsWith("email:") ? direct.slice(6).trim() : direct;
  }
  const name = String(row.name ?? "").trim();
  const fromName = name.match(/\(([^()@\s]+@[^()@\s]+\.[^()@\s]+)\)\s*$/)?.[1];
  return fromName?.trim() ?? "";
}

export function cleanEmployeeName(row: Record<string, unknown>): string {
  const raw = String(row.name ?? "Employee").trim();
  return raw.replace(/\s*\([^()@\s]+@[^()@\s]+\.[^()@\s]+\)\s*$/, "").trim() || raw || "Employee";
}

/** Employee role from profile API (`role` field, e.g. HR Manager). */
export function pickEmployeeRole(profile: Record<string, unknown>): string {
  return formatRoleDisplayValue(pickProfileField(profile, ["role"]));
}

/** @deprecated Use pickEmployeeRole — kept for existing imports. */
export function pickDesignation(profile: Record<string, unknown>): string {
  return pickEmployeeRole(profile);
}

export function pickProfileField(profile: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = profile[key];
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && !value.trim()) continue;
    return value;
  }
  return undefined;
}

function normalizeStatusLabel(value: unknown): string {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!normalized) return "—";
  return normalized;
}

export function formatYoeDisplay(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const text = String(value).trim();
  if (!text) return "—";
  if (/year/i.test(text)) return text;
  const num = Number(text);
  if (!Number.isNaN(num) && Number.isFinite(num)) {
    return `${num} year${num === 1 ? "" : "s"}`;
  }
  return text;
}

export function formatProfileDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => {
        if (item && typeof item === "object") {
          const rec = item as Record<string, unknown>;
          const skill = String(rec.skill ?? rec.name ?? "").trim();
          const rating = rec.rating ?? rec.level;
          if (!skill) return "";
          return rating !== undefined && String(rating).trim() !== ""
            ? `${skill} (${String(rating)}/5)`
            : skill;
        }
        const text = String(item ?? "").trim();
        return text ? formatRoleDisplayValue(text) : "";
      })
      .filter(Boolean);
    return parts.length ? parts.join(", ") : "—";
  }
  const text = String(value).trim();
  if (!text) return "—";
  return formatRoleDisplayValue(text);
}

export function formatPrimarySkills(profile: Record<string, unknown>): string {
  const raw = pickProfileField(profile, ["primary_skills", "primarySkills"]);
  if (Array.isArray(raw)) return formatProfileDisplayValue(raw);
  return formatProfileDisplayValue(raw);
}

export function formatSecondarySkills(profile: Record<string, unknown>): string {
  return formatSecondarySkillsForProfile(profile);
}

export function onboardRowToListRow(row: OnboardRowInput): Record<string, string> {
  const record = asOnboardRecord(row);
  return {
    emp_id: rowEmpId(record) || "—",
    name: cleanEmployeeName(record),
    email: rowEmail(record) || "—",
    department: String(record.department ?? "").trim() || "—",
    role: formatRoleDisplayValue(record.role),
    band: String(record.band ?? record.band_name ?? record.bandName ?? "").trim() || "—",
    date_of_joining: formatDirectoryDate(
      record.date_of_joining ?? record.doj ?? record.joining_date ?? record.joiningDate
    ),
    date_of_birth: formatDirectoryDate(record.date_of_birth ?? record.dob),
    status: normalizeStatusLabel(record.user_status ?? record.userStatus ?? record.status),
    user_type: formatUserTypeLabel(String(record.user_type ?? record.userType ?? "")),
    work_mode: String(record.work_mode ?? record.workMode ?? "").trim() || "—",
    work_location: String(
      record.work_location ?? record.work_location_type ?? record.workLocationType ?? ""
    ).trim() || "—",
    phone_number: String(record.phone_number ?? record.phoneNumber ?? "").trim() || "—",
    yoe: formatYoeDisplay(record.yoe ?? record.years_of_experience ?? record.experience),
    primary_skills: formatPrimarySkills(record),
  };
}

export type EmployeeProfileEditForm = {
  name: string;
  email: string;
  personal_email: string;
  phone_country?: string;
  phone_number: string;
  department: string;
  user_status: string;
  work_mode: string;
  work_location_type: string;
  band_id: string;
  primary_skills: string;
  secondary_skill: string;
  secondary_rating: string;
  holiday_calendar_id: string;
};

export function profileToEditForm(profile: Record<string, unknown>): EmployeeProfileEditForm {
  const primarySkillsRaw = pickProfileField(profile, ["primary_skills", "primarySkills"]);
  const primarySkills = Array.isArray(primarySkillsRaw)
    ? primarySkillsRaw.map((item) => String(item).trim()).filter(Boolean).join(", ")
    : String(primarySkillsRaw ?? "").trim();

  const secondarySkillsRaw =
    (profile.secondary_skills as Array<Record<string, unknown>> | undefined) ??
    (profile.secondarySkills as Array<Record<string, unknown>> | undefined) ??
    [];
  const firstSecondary = Array.isArray(secondarySkillsRaw) ? secondarySkillsRaw[0] : undefined;
  const phoneParts = splitPhoneNumber(
    String(pickProfileField(profile, ["phone_number", "phoneNumber"]) ?? "").trim()
  );

  return {
    name: String(pickProfileField(profile, ["name"]) ?? "").trim(),
    email: String(pickProfileField(profile, ["email"]) ?? "").trim(),
    personal_email: String(pickProfileField(profile, ["personal_email"]) ?? "").trim(),
    phone_country: phoneParts.countryIso,
    phone_number: phoneParts.nationalNumber,
    department: String(pickProfileField(profile, ["department"]) ?? "").trim(),
    user_status: String(
      pickProfileField(profile, ["user_status", "status", "userStatus"]) ?? ""
    ).trim(),
    work_mode: String(pickProfileField(profile, ["work_mode", "workMode"]) ?? "").trim(),
    work_location_type: String(
      pickProfileField(profile, ["work_location_type", "workLocationType", "work_location"]) ?? ""
    ).trim(),
    band_id: String(
      pickProfileField(profile, ["band_id", "bandId", "band"]) ?? ""
    ).trim(),
    primary_skills: primarySkills,
    secondary_skill: String(firstSecondary?.skill ?? "").trim(),
    secondary_rating: String(firstSecondary?.rating ?? "3").trim() || "3",
    holiday_calendar_id: String(
      pickProfileField(profile, ["holiday_calendar_id", "holidayCalendarId"]) ?? ""
    ).trim(),
  };
}

export function editFormToUpdatePayload(
  form: EmployeeProfileEditForm,
  options?: { statusOnly?: boolean }
): Record<string, unknown> {
  if (options?.statusOnly) {
    return { user_status: form.user_status.trim() };
  }

  const primary = form.primary_skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const secondarySkill = form.secondary_skill.trim();
  const secondary_skills = secondarySkill
    ? [{ skill: secondarySkill, rating: Number(form.secondary_rating) || 3 }]
    : [];

  const payload: Record<string, unknown> = {
    name: form.name.trim(),
    email: form.email.trim().toLowerCase(),
    phone_number: formatPhoneNumberForApi(
      form.phone_country ?? defaultPhoneCountryIso(),
      form.phone_number
    ),
    department: form.department.trim(),
    user_status: form.user_status.trim(),
    work_mode: form.work_mode.trim(),
    work_location_type: form.work_location_type.trim(),
    primary_skills: primary,
    secondary_skills,
  };

  const bandId = form.band_id.trim();
  if (bandId) {
    const bandNum = Number(bandId);
    payload.band_id = Number.isFinite(bandNum) ? bandNum : bandId;
  }

  const personalEmail = form.personal_email.trim();
  if (personalEmail) payload.personal_email = personalEmail;

  const holidayCalendarId = form.holiday_calendar_id.trim();
  if (holidayCalendarId) {
    const parsed = Number(holidayCalendarId);
    if (Number.isFinite(parsed) && parsed > 0) {
      payload.holiday_calendar_id = parsed;
    }
  }

  return payload;
}

export type ProfileDisplayEntry = {
  label: string;
  value: unknown;
  /** When set, render a clickable “resume” link instead of plain text. */
  resumeShareHref?: string | null;
  fullWidth?: boolean;
  /** When true, render value as a color-coded employee status badge. */
  asStatusBadge?: boolean;
};

export type ProfileDisplaySection = {
  title: string;
  entries: ProfileDisplayEntry[];
};

function profileEntry(
  label: string,
  value: unknown,
  options?: { resumeShareHref?: string | null; fullWidth?: boolean; asStatusBadge?: boolean }
): ProfileDisplayEntry {
  return { label, value, ...options };
}

/** Grouped profile fields for the HR employee directory profile view. */
export function buildGroupedProfileSections(
  profile: Record<string, unknown>,
  resumeShareHref?: string | null
): ProfileDisplaySection[] {
  const resumeHref =
    resumeShareHref !== undefined ? resumeShareHref : pickResumeShareLink(profile);

  const category =
    pickProfileField(profile, ["category"]) ??
    pickProfileField(profile, ["delivery_status", "deliveryStatus"]);

  const internProfile = isInternProfile(profile);
  const holidayCalendar =
    pickProfileField(profile, ["holiday_calendar_name", "holidayCalendarName"]) ??
    pickProfileField(profile, ["holiday_calendar_id", "holidayCalendarId"]);

  const information: ProfileDisplayEntry[] = [
    profileEntry("Name", cleanEmployeeName(profile) || pickProfileField(profile, ["name"])),
    profileEntry("Employee ID", pickProfileField(profile, ["emp_id", "empId", "employee_id"])),
    profileEntry(
      "Status",
      pickProfileField(profile, ["status", "user_status", "userStatus"]),
      { asStatusBadge: true }
    ),
    profileEntry("Work Email", pickProfileField(profile, ["email"])),
    profileEntry("Department", pickProfileField(profile, ["department"])),
    profileEntry("Designation / Role", pickEmployeeRole(profile) || null),
    profileEntry("Band", formatBandForProfile(profile)),
    profileEntry(
      "User Type",
      formatUserTypeLabel(String(pickProfileField(profile, ["user_type", "userType"]) ?? ""))
    ),
    profileEntry("Category", formatCategoryLabel(category)),
    profileEntry(
      "Work Mode",
      formatWorkModeLabel(pickProfileField(profile, ["work_mode", "workMode"]))
    ),
    profileEntry(
      "Work Location",
      formatWorkLocationLabel(
        pickProfileField(profile, ["work_location", "work_location_type", "workLocationType"])
      )
    ),
    ...(internProfile
      ? [
          profileEntry(
            "Date of Internship",
            formatDirectoryDate(
              pickProfileField(profile, ["doi", "date_of_internship", "dateOfInternship"])
            )
          ),
          profileEntry(
            "Internship Duration (Months)",
            pickProfileField(profile, ["internship_duration", "internshipDuration"])
          ),
        ]
      : [
          profileEntry(
            "Date of Joining",
            formatDirectoryDate(
              pickProfileField(profile, ["date_of_joining", "doj", "joining_date", "joiningDate"])
            )
          ),
        ]),
    profileEntry("Reporting Manager", formatReportingManagerForProfile(profile)),
    profileEntry("Holiday Calendar", holidayCalendar),
    profileEntry("Primary Skills", formatPrimarySkills(profile)),
    profileEntry("Secondary Skills", formatSecondarySkills(profile)),
    profileEntry(
      "Webknot Experience",
      pickProfileField(profile, ["webknot_experience", "webknotExperience"])
    ),
    profileEntry(
      "Total Experience",
      pickProfileField(profile, ["total_experience", "totalExperience", "yoe", "years_of_experience", "experience"])
    ),
  ];

  const personalInformation: ProfileDisplayEntry[] = [
    profileEntry("Personal Email", pickProfileField(profile, ["personal_email", "personalEmail"])),
    profileEntry("Phone Number", pickProfileField(profile, ["phone_number", "phoneNumber"])),
    profileEntry(
      "Date of Birth",
      formatDirectoryDate(pickProfileField(profile, ["date_of_birth", "dob", "dateOfBirth"]))
    ),
    profileEntry("Gender", pickProfileField(profile, ["gender"])),
    profileEntry("Marital Status", pickProfileField(profile, ["marital_status", "maritalStatus"])),
    profileEntry("Nationality", pickProfileField(profile, ["nationality"])),
    profileEntry("Local Address", pickProfileField(profile, ["local_address", "localAddress"]), {
      fullWidth: true,
    }),
    profileEntry(
      "Permanent Address",
      pickProfileField(profile, ["permanent_address", "permanentAddress"]),
      { fullWidth: true }
    ),
    profileEntry(
      "Emergency Contact",
      pickProfileField(profile, ["emergency_contact_name", "emergencyContactName"])
    ),
    profileEntry(
      "Emergency Number",
      pickProfileField(profile, ["emergency_contact_number", "emergencyContactNumber"])
    ),
    profileEntry("Blood Group", pickProfileField(profile, ["blood_group", "bloodGroup"])),
    profileEntry("Resume Link", resumeHref ? "resume" : null, {
      resumeShareHref: resumeHref,
      fullWidth: true,
    }),
  ];

  return [
    { title: "Work Information", entries: information },
    { title: "Personal Information", entries: personalInformation },
  ];
}

const PROFILE_VIEW_WORK_LABELS = new Set([
  "Band",
  "Date of Joining",
  "Date of Internship",
  "Internship Duration (Months)",
  "Reporting Manager",
  "Holiday Calendar",
  "User Type",
  "Work Mode",
  "Work Location",
  "Category",
  "Primary Skills",
  "Secondary Skills",
  "Total Experience",
]);

const PROFILE_VIEW_PERSONAL_LABELS = new Set([
  "Personal Email",
  "Date of Birth",
  "Gender",
  "Marital Status",
  "Local Address",
  "Permanent Address",
]);

const PROFILE_VIEW_LABEL_OVERRIDES: Record<string, string> = {
  "User Type": "Employment Type",
  "Local Address": "Current Address",
  "Total Experience": "Experience",
};

function filterProfileViewEntries(
  sectionTitle: string,
  entries: ProfileDisplayEntry[]
): ProfileDisplayEntry[] {
  const allowed =
    sectionTitle === "Work Information"
      ? PROFILE_VIEW_WORK_LABELS
      : sectionTitle === "Personal Information"
        ? PROFILE_VIEW_PERSONAL_LABELS
        : null;
  if (!allowed) return entries;

  return entries
    .filter((entry) => allowed.has(entry.label))
    .map((entry) => ({
      ...entry,
      label: PROFILE_VIEW_LABEL_OVERRIDES[entry.label] ?? entry.label,
    }));
}

/** Profile sections for the directory profile view (omits header-duplicated fields). */
export function buildProfileViewSections(
  profile: Record<string, unknown>,
  resumeShareHref?: string | null
): ProfileDisplaySection[] {
  return buildGroupedProfileSections(profile, resumeShareHref).map((section) => ({
    ...section,
    entries: filterProfileViewEntries(section.title, section.entries),
  }));
}

/** @deprecated Prefer buildGroupedProfileSections for directory profile layout. */
export function buildProfileDisplayEntries(
  profile: Record<string, unknown>,
  resumeShareHref?: string | null
): ProfileDisplayEntry[] {
  return buildGroupedProfileSections(profile, resumeShareHref).flatMap(
    (section) => section.entries
  );
}
