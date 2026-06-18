import type {
  ExitInterviewFormDefinition,
  ExitInterviewProfileFlags,
  ExitInterviewResponseField,
  ExitInterviewSubmitBody,
  FormField,
} from "@/types/exit-interview";

const READONLY_WIDGETS = new Set(["readonly_text", "readonly_date"]);

/** Profile-backed keys — never sent on POST (server merges from profile + attrition). */
export const EXIT_INTERVIEW_READONLY_KEYS = new Set([
  "full_name",
  "department",
  "current_role",
  "start_date",
  "resignation_date",
  "last_working_day",
]);

/** Show Exit survey in nav only during notice (can fill or already submitted while applicable). */
export function shouldShowExitSurveyInNav(flags: ExitInterviewProfileFlags): boolean {
  if (!flags.exit_interview_applicable) return false;
  return flags.can_fill_exit_interview || flags.exit_interview_submitted;
}

export function parseExitInterviewProfileFlags(
  profile: Record<string, unknown> | null | undefined
): ExitInterviewProfileFlags {
  const p = profile ?? {};
  return {
    exit_interview_applicable: Boolean(p.exit_interview_applicable),
    can_fill_exit_interview: Boolean(p.can_fill_exit_interview),
    exit_interview_submitted: Boolean(p.exit_interview_submitted),
    exit_interview_resignation_date: stringOrNull(p.exit_interview_resignation_date),
    exit_interview_last_working_day: stringOrNull(p.exit_interview_last_working_day),
    exit_interview_days_until_last_working_day: numberOrNull(p.exit_interview_days_until_last_working_day),
    portal_locked: Boolean(p.portal_locked ?? p.portalLocked),
  };
}

function stringOrNull(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

function numberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Read-only values from GET /profile. `reporting_managers` is user-entered (textarea), not autofill. */
export function buildExitInterviewAutofill(profile: Record<string, unknown>): Record<string, string> {
  const flags = parseExitInterviewProfileFlags(profile);
  return {
    full_name: String(profile.name ?? "").trim(),
    department: String(profile.department ?? "").trim(),
    current_role: String(profile.role ?? "").trim(),
    start_date: stringOrNull(profile.doj) ?? "",
    resignation_date: flags.exit_interview_resignation_date ?? "",
    last_working_day: flags.exit_interview_last_working_day ?? "",
  };
}

export function isReadonlyField(field: FormField): boolean {
  return READONLY_WIDGETS.has(field.widget);
}

export function editableFields(definition: ExitInterviewFormDefinition): FormField[] {
  return definition.fields.filter((f) => !isReadonlyField(f));
}

export function initialFormAnswers(definition: ExitInterviewFormDefinition): Record<string, unknown> {
  const answers: Record<string, unknown> = {};
  for (const field of editableFields(definition)) {
    if (field.widget === "multi_select") {
      answers[field.key] = [] as string[];
    } else if (field.widget === "scale_1_10") {
      answers[field.key] = field.min ?? 5;
    } else {
      answers[field.key] = "";
    }
    if (field.other_field) answers[field.other_field] = "";
  }
  return answers;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function validateMultiSelect(
  field: FormField,
  selected: string[],
  answers: Record<string, unknown>,
  errors: Record<string, string>
) {
  const values = uniqueStrings(selected);
  if (field.required && values.length === 0) {
    errors[field.key] = "Select at least one option.";
    return;
  }
  const exclusive = field.exclusive_none_value;
  if (exclusive && values.includes(exclusive) && values.length > 1) {
    errors[field.key] = "None must be the only selection.";
    return;
  }
  if (values.includes("OTHER") && field.other_field) {
    const other = String(answers[field.other_field] ?? "").trim();
    if (!other) errors[field.other_field] = "Please specify your other response.";
  }
}

function validateScale(field: FormField, value: unknown, errors: Record<string, string>) {
  const n = Number(value);
  const min = field.min ?? 1;
  const max = field.max ?? 10;
  if (!Number.isInteger(n) || n < min || n > max) {
    errors[field.key] = `Choose a rating from ${min} to ${max}.`;
  }
}

function validateTextarea(field: FormField, value: unknown, errors: Record<string, string>) {
  const text = String(value ?? "").trim();
  if (!field.required || text) return;
  if (field.key === "reporting_managers") {
    errors[field.key] = "Enter manager name(s).";
    return;
  }
  errors[field.key] = "This field is required.";
}

export function validateExitInterviewAnswers(
  definition: ExitInterviewFormDefinition,
  answers: Record<string, unknown>
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of editableFields(definition)) {
    if (field.widget === "multi_select") {
      validateMultiSelect(field, (answers[field.key] as string[]) ?? [], answers, errors);
      continue;
    }
    if (field.widget === "single_select") {
      const value = String(answers[field.key] ?? "").trim();
      if (field.required && !value) errors[field.key] = "Select an option.";
      continue;
    }
    if (field.widget === "scale_1_10") {
      validateScale(field, answers[field.key], errors);
      continue;
    }
    if (field.widget === "textarea") {
      validateTextarea(field, answers[field.key], errors);
    }
  }

  return errors;
}

export function buildExitInterviewSubmitBody(
  definition: ExitInterviewFormDefinition,
  answers: Record<string, unknown>
): ExitInterviewSubmitBody {
  const body: Record<string, unknown> = {};

  for (const field of editableFields(definition)) {
    if (EXIT_INTERVIEW_READONLY_KEYS.has(field.key)) continue;

    if (field.widget === "multi_select") {
      body[field.key] = uniqueStrings((answers[field.key] as string[]) ?? []);
      if (field.other_field) {
        const other = String(answers[field.other_field] ?? "").trim();
        body[field.other_field] = other || null;
      }
      continue;
    }
    if (field.widget === "scale_1_10") {
      body[field.key] = Number(answers[field.key]);
      continue;
    }
    const text = String(answers[field.key] ?? "").trim();
    if (field.key === "final_feedback") {
      body[field.key] = text || null;
    } else {
      body[field.key] = text;
    }
    if (field.other_field) {
      const other = String(answers[field.other_field] ?? "").trim();
      body[field.other_field] = other || null;
    }
  }

  return body as ExitInterviewSubmitBody;
}

export function formatExitInterviewResponseValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) {
    if (!value.length) return "—";
    return value.map((v) => String(v)).join(", ");
  }
  return String(value);
}

export function labelForOption(field: FormField, code: string): string {
  const hit = field.options?.find((o) => o.value === code);
  return hit?.label ?? code;
}

export function formatResponseForDisplay(field: FormField, value: unknown): string {
  if (value == null || value === "") return "—";
  if (field.widget === "multi_select" && Array.isArray(value)) {
    if (!value.length) return "—";
    return value.map((v) => labelForOption(field, String(v))).join(", ");
  }
  if (field.widget === "single_select") {
    return labelForOption(field, String(value));
  }
  return formatExitInterviewResponseValue(value);
}

export function formFieldForResponseItem(
  item: ExitInterviewResponseField,
  fields: FormField[]
): FormField {
  const hit = fields.find((f) => f.key === item.field);
  if (hit) return hit;
  const isArray = Array.isArray(item.value);
  return {
    key: item.field,
    label: item.label,
    widget: isArray ? "multi_select" : "textarea",
    required: false,
    options: isArray
      ? (item.value as unknown[]).map((v) => {
          const token = String(v);
          return { value: token, label: token };
        })
      : undefined,
  };
}

export function exitInterviewFieldsWithResponses(
  fields: FormField[],
  responses: Record<string, unknown>
): FormField[] {
  return fields.filter((field) => {
    const value = responses[field.key];
    if (value == null || value === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  });
}

export function textareaPlaceholder(field: FormField): string | undefined {
  if (field.key === "reporting_managers") {
    return "Enter manager name(s)";
  }
  return undefined;
}
