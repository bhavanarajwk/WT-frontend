import { parsePydanticValidationPayload } from "@/utils/userFriendlyApiError";

export interface ApiErrorPayload {
  detail?: unknown;
  message?: unknown;
  errors?: unknown;
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function asReadableObject(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function isHtmlErrorBody(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("<html") ||
    lower.includes("<!doctype") ||
    lower.includes("bad gateway") ||
    lower.includes("nginx")
  );
}

export function parseApiErrorMessage(
  payload: unknown,
  fallback: string
): string {
  if (typeof payload === "string" && payload.trim()) {
    const trimmed = payload.trim();
    if (isHtmlErrorBody(trimmed)) {
      return "Unable to reach the server. Please try again later.";
    }
    return trimmed;
  }
  if (!payload || typeof payload !== "object") return fallback;
  const body = payload as ApiErrorPayload;

  if (Array.isArray(body.detail)) {
    const friendly = parsePydanticValidationPayload(body.detail);
    if (friendly) return friendly;
    for (const item of body.detail) {
      if (item && typeof item === "object" && "msg" in item) {
        const msg = String((item as { msg?: unknown }).msg ?? "").trim();
        if (msg) return msg;
      }
    }
  }

  if (typeof body.detail === "string" && body.detail.trim()) {
    if (isHtmlErrorBody(body.detail)) {
      return "Unable to reach the server. Please try again later.";
    }
    return body.detail;
  }
  if (typeof body.message === "string" && body.message.trim()) return body.message;

  if (body.detail && typeof body.detail === "object") {
    const detail = body.detail as Record<string, unknown>;
    if (typeof detail.message === "string" && detail.message.trim()) return detail.message.trim();
  }

  const objectDetail = asReadableObject(body.detail);
  if (objectDetail && !objectDetail.startsWith("[")) return objectDetail;

  const objectErrors = asReadableObject(body.errors);
  if (objectErrors) return objectErrors;

  return fallback;
}
