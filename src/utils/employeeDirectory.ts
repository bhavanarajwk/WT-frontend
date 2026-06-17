import { formatSecondarySkillsForProfile } from "@/components/dashboard/ui/profile";
import type { OnboardListItem } from "@/types/onboard";
import { pickResumeShareLink } from "@/utils/employeeResume";
import { formatApiDateDisplay } from "@/utils/apiDate";

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
  return String(pickProfileField(profile, ["role"]) ?? "").trim();
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
        return String(item ?? "").trim();
      })
      .filter(Boolean);
    return parts.length ? parts.join(", ") : "—";
  }
  const text = String(value).trim();
  return text || "—";
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
    role: String(record.role ?? "").trim() || "—",
    band: String(record.band ?? record.band_name ?? record.bandName ?? "").trim() || "—",
    date_of_joining: formatDirectoryDate(
      record.date_of_joining ?? record.doj ?? record.joining_date ?? record.joiningDate
    ),
    date_of_birth: formatDirectoryDate(record.date_of_birth ?? record.dob),
    status: normalizeStatusLabel(record.status),
    user_type: String(record.user_type ?? record.userType ?? "").trim() || "—",
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

  return {
    name: String(pickProfileField(profile, ["name"]) ?? "").trim(),
    email: String(pickProfileField(profile, ["email"]) ?? "").trim(),
    personal_email: String(pickProfileField(profile, ["personal_email"]) ?? "").trim(),
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

export function editFormToUpdatePayload(form: EmployeeProfileEditForm): Record<string, unknown> {
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
};

/** Fields hidden from the HR employee profile view. */
const PROFILE_HIDDEN_LABELS = new Set([
  "Status",
  "Resume",
  "Aadhaar",
  "PAN Card",
  "PAN card",
  "Relieving Letter",
  "Relieving letter",
  "Manager",
  "Stream",
  "Leave remaining",
  "Leave Remaining",
  "Comp-off remaining",
  "Comp-off Remaining",
  "Comp Off Balance",
  "Primary",
  "Secondary",
  "Carry Forward",
  "Total Leave",
  "Exit Survey Applicable",
  "Can Fill Exit Survey",
  "Exit Survey Submitted",
  "Exit Survey Resignation Date",
  "Exit Survey Last Working Day",
  "Exit Survey Days Until Last Working Day",
]);

const PROFILE_EXCLUDED_KEYS = new Set([
  "status",
  "user_status",
  "userStatus",
  "resume",
  "resume_url",
  "resumeUrl",
  "resume_share_link",
  "resumeShareLink",
  "personal_resume",
  "personalResume",
  "aadhaar",
  "aadhaar_url",
  "aadhaarUrl",
  "pan_card",
  "panCard",
  "pan_url",
  "panUrl",
  "reliving_letter",
  "relieving_letter",
  "relievingLetter",
  "manager",
  "manager_name",
  "managerName",
  "reporting_manager",
  "stream",
  "leave_remaining",
  "leaveRemaining",
  "comp_off_remaining",
  "compOffRemaining",
  "comp_off_balance",
  "compOffBalance",
  "leave",
  "exit_interview_applicable",
  "can_fill_exit_interview",
  "exit_interview_submitted",
  "exit_interview_resignation_date",
  "exit_interview_last_working_day",
  "exit_interview_days_until_last_working_day",
]);

const PROFILE_SKIP_KEYS = new Set([
  "profile_photo_url",
  "profilePhotoUrl",
  "profile_pic_url",
  "profilePicUrl",
  "photo_url",
  "photoUrl",
  "avatar_url",
  "avatarUrl",
  "image_url",
  "imageUrl",
  "profile_photo",
  "profilePhoto",
]);

function humanizeFieldKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Ordered profile fields for a single-page HR employee profile view. */
export function buildProfileDisplayEntries(
  profile: Record<string, unknown>,
  resumeShareHref?: string | null
): ProfileDisplayEntry[] {
  const entries: ProfileDisplayEntry[] = [
    {
      label: "Name",
      value: cleanEmployeeName(profile) || pickProfileField(profile, ["name"]),
    },
    { label: "Employee ID", value: pickProfileField(profile, ["emp_id", "empId", "employee_id"]) },
    { label: "Work email", value: pickProfileField(profile, ["email"]) },
    {
      label: "Status",
      value: normalizeStatusLabel(pickProfileField(profile, ["status", "user_status", "userStatus"])),
    },
    { label: "Personal mail ID", value: pickProfileField(profile, ["personal_email"]) },
    { label: "User type", value: pickProfileField(profile, ["user_type", "userType"]) },
    { label: "Phone number", value: pickProfileField(profile, ["phone_number", "phoneNumber"]) },
    { label: "Department", value: pickProfileField(profile, ["department"]) },
    { label: "Role", value: pickEmployeeRole(profile) || null },
    { label: "Band", value: pickProfileField(profile, ["band", "band_name", "bandName", "band_id", "bandId"]) },
    {
      label: "Date of joining",
      value: formatDirectoryDate(
        pickProfileField(profile, ["date_of_joining", "doj", "joining_date", "joiningDate"])
      ),
    },
    {
      label: "Date of birth",
      value: formatDirectoryDate(pickProfileField(profile, ["date_of_birth", "dob"])),
    },
    { label: "Work location", value: pickProfileField(profile, ["work_location", "work_location_type", "workLocationType"]) },
    { label: "Work mode", value: pickProfileField(profile, ["work_mode", "workMode"]) },
    { label: "Primary skills", value: formatPrimarySkills(profile) },
    { label: "Secondary skills", value: formatSecondarySkills(profile) },
    {
      label: "Webknot experience",
      value: pickProfileField(profile, ["webknot_experience", "webknotExperience"]),
    },
    {
      label: "Total experience",
      value: pickProfileField(profile, ["total_experience", "totalExperience"]),
    },
    ...((): ProfileDisplayEntry[] => {
      const href =
        resumeShareHref !== undefined ? resumeShareHref : pickResumeShareLink(profile);
      return [
        {
          label: "Resume",
          value: href ? "resume" : null,
          resumeShareHref: href,
        },
      ];
    })(),
  ];

  const coveredKeys = new Set<string>([...PROFILE_EXCLUDED_KEYS, ...PROFILE_SKIP_KEYS]);
  for (const def of [
    "name",
    "emp_id",
    "empId",
    "employee_id",
    "email",
    "user_type",
    "userType",
    "phone_number",
    "phoneNumber",
    "department",
    "designation",
    "job_title",
    "title",
    "band",
    "band_name",
    "bandName",
    "band_id",
    "bandId",
    "date_of_joining",
    "doj",
    "joining_date",
    "joiningDate",
    "date_of_birth",
    "dob",
    "work_location",
    "work_location_type",
    "workLocationType",
    "work_mode",
    "workMode",
    "primary_skills",
    "primarySkills",
    "secondary_skills",
    "secondarySkills",
    "webknot_experience",
    "webknotExperience",
    "total_experience",
    "totalExperience",
    "yoe",
    "years_of_experience",
    "experience",
    "leave_remaining",
    "leaveRemaining",
    "comp_off_remaining",
    "compOffRemaining",
    "role",
  ]) {
    coveredKeys.add(def);
  }

  for (const [key, raw] of Object.entries(profile)) {
    if (coveredKeys.has(key)) continue;
    if (raw === null || raw === undefined) continue;
    if (typeof raw === "object" && !Array.isArray(raw)) continue;
    entries.push({
      label: humanizeFieldKey(key),
      value: Array.isArray(raw) ? formatProfileDisplayValue(raw) : raw,
    });
    coveredKeys.add(key);
  }

  return entries.filter((entry) => !PROFILE_HIDDEN_LABELS.has(entry.label));
}
