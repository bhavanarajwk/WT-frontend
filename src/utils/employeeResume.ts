import { extractFirstObjectArray, toPagedRows } from "@/utils/apiRows";

const HIDDEN_TABLE_KEYS = new Set([
  "resume",
  "resume_data",
  "resumeData",
  "resume_share_link",
  "resumeShareLink",
  "file_content",
  "fileContent",
  "content",
  "base64",
  "bytes",
  "download_url",
  "downloadUrl",
  "resume_url",
  "resumeUrl",
  "file_url",
  "fileUrl",
]);

const PREFERRED_COLUMN_ORDER = [
  "name",
  "employee_name",
  "employeeName",
  "emp_id",
  "empId",
  "employee_id",
  "email",
  "department",
  "designation",
  "file_name",
  "fileName",
  "resume_file_name",
  "resumeFileName",
  "uploaded_at",
  "uploadedAt",
  "created_at",
  "createdAt",
  "status",
];

export type EmployeeResumePayload = {
  raw: unknown;
  rows: Array<Record<string, unknown>>;
};

/** Google Docs share link — only `resume_share_link` from GET /employee-resume. */
export function pickResumeShareLink(row: Record<string, unknown>): string | null {
  const url = String(row.resume_share_link ?? row.resumeShareLink ?? "").trim();
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return null;
}

/** Validate employee onboarding `resume_share_link` (HTTPS Google Docs / Drive). */
export function validateResumeShareLink(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return "Resume Google Docs link is required.";
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return "Enter a valid Google Docs share link (HTTPS).";
  }
  if (parsed.protocol !== "https:") {
    return "Resume link must use HTTPS.";
  }
  const host = parsed.hostname.toLowerCase();
  const isGoogleDoc =
    host === "docs.google.com" ||
    host.endsWith(".docs.google.com") ||
    host === "drive.google.com" ||
    host.endsWith(".drive.google.com");
  if (!isGoogleDoc) {
    return "Enter a Google Docs or Google Drive share link.";
  }
  return null;
}

function collectRowsWithResumeShareLink(input: unknown): Array<Record<string, unknown>> {
  const found: Array<Record<string, unknown>> = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const record = node as Record<string, unknown>;
    if (pickResumeShareLink(record)) found.push(record);
    for (const value of Object.values(record)) {
      if (value && typeof value === "object") walk(value);
    }
  };
  walk(input);
  return found;
}

export function parseEmployeeResumeResponse(res: unknown): EmployeeResumePayload {
  const envelope = res as { data?: unknown };
  const raw = envelope?.data ?? res;
  let rows = toPagedRows(raw);
  if (!rows.length) rows = extractFirstObjectArray(raw);
  if (!rows.length) rows = collectRowsWithResumeShareLink(raw);
  if (!rows.length && raw && typeof raw === "object" && !Array.isArray(raw)) {
    rows = [raw as Record<string, unknown>];
  }
  return { raw, rows };
}

export function resumeRowEmpId(row: Record<string, unknown>): string {
  return String(
    row.emp_id ??
      row.empId ??
      row.employee_id ??
      row.employeeId ??
      row.user_id ??
      row.userId ??
      row.id ??
      ""
  ).trim();
}

export function resumeRowDisplayName(row: Record<string, unknown>): string {
  return String(
    row.name ?? row.employee_name ?? row.employeeName ?? row.full_name ?? row.fullName ?? ""
  ).trim();
}

export function resumeRowFileName(row: Record<string, unknown>, empId: string): string {
  const fromRow = String(
    row.file_name ??
      row.fileName ??
      row.resume_file_name ??
      row.resumeFileName ??
      row.original_filename ??
      row.originalFilename ??
      ""
  ).trim();
  if (fromRow) return fromRow;
  return empId ? `resume-${empId}.pdf` : "resume.pdf";
}

export function tableColumnsForResumeRows(rows: Array<Record<string, unknown>>): string[] {
  const keys = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!HIDDEN_TABLE_KEYS.has(key)) keys.add(key);
    }
  }
  const ordered = PREFERRED_COLUMN_ORDER.filter((k) => keys.has(k));
  const rest = [...keys].filter((k) => !ordered.includes(k)).sort();
  return [...ordered, ...rest].slice(0, 14);
}

/** Lookup resume share links by emp id, user id, or email. */
export function buildResumeShareLinkIndex(
  rows: Array<Record<string, unknown>>
): Map<string, string> {
  const index = new Map<string, string>();
  for (const row of rows) {
    const link = pickResumeShareLink(row);
    if (!link) continue;
    const keys = new Set<string>();
    for (const id of [
      resumeRowEmpId(row),
      String(row.user_id ?? row.userId ?? "").trim(),
      String(row.emp_id ?? row.empId ?? "").trim(),
      String(row.employee_id ?? row.employeeId ?? "").trim(),
    ]) {
      if (id) keys.add(id);
    }
    const email = String(row.email ?? row.user_email ?? row.userEmail ?? "")
      .trim()
      .toLowerCase();
    if (email) keys.add(email);
    for (const key of keys) {
      index.set(key, link);
    }
  }
  return index;
}

export function lookupResumeShareLink(
  index: Map<string, string>,
  keys: { empId?: string; userId?: string; email?: string }
): string | null {
  const candidates = [
    keys.empId?.trim(),
    keys.userId?.trim(),
    keys.email?.trim().toLowerCase(),
  ].filter(Boolean) as string[];
  for (const key of candidates) {
    const link = index.get(key);
    if (link) return link;
  }
  return null;
}

export function formatResumeCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  const text = String(value).trim();
  return text || "—";
}

