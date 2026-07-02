import { ApiError } from "@/api/error";

function isHtmlErrorBody(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("<html") ||
    lower.includes("<!doctype") ||
    lower.includes("bad gateway") ||
    lower.includes("nginx")
  );
}

function fieldLabelFromLoc(loc: unknown): string {
  if (!Array.isArray(loc)) return "";
  const last = loc[loc.length - 1];
  return String(last ?? "").trim().toLowerCase();
}

function messageFromPydanticItem(item: unknown): string | null {
  if (!item || typeof item !== "object") return null;
  const record = item as { loc?: unknown; msg?: unknown; type?: unknown };
  const field = fieldLabelFromLoc(record.loc);
  const msg = String(record.msg ?? "").trim();

  if (field === "doi") {
    return "Please enter a valid internship date in DD/MM/YYYY format.";
  }
  if (field === "internship_duration") {
    return "Internship Duration must be a whole number. Only numeric values are allowed.";
  }
  if (field === "emp_id") {
    return "Employee ID must contain only letters and numbers.";
  }
  if (field === "doj") {
    return "Please enter a valid date of joining in DD/MM/YYYY format.";
  }

  if (msg && !msg.startsWith("[")) {
    return msg;
  }
  return null;
}

export function parsePydanticValidationPayload(payload: unknown): string | null {
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (!trimmed.startsWith("[")) return null;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return parsePydanticValidationPayload(parsed);
    } catch {
      return null;
    }
  }

  if (!Array.isArray(payload)) return null;
  for (const item of payload) {
    const message = messageFromPydanticItem(item);
    if (message) return message;
  }
  return null;
}

export function toUserFriendlyApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return error.message;
    }
    if (error.status === 502 || error.status === 503 || error.status === 504) {
      return "Unable to reach the server. Please try again later.";
    }

    const payload = error.payload;
    if (typeof payload === "string" && isHtmlErrorBody(payload)) {
      return "Unable to reach the server. Please try again later.";
    }

    const pydanticFromPayload =
      typeof payload === "string"
        ? parsePydanticValidationPayload(payload)
        : parsePydanticValidationPayload(
            payload && typeof payload === "object" && "detail" in payload
              ? (payload as { detail: unknown }).detail
              : payload
          );
    if (pydanticFromPayload) return pydanticFromPayload;

    const message = error.message.trim();
    if (message && !isHtmlErrorBody(message)) {
      if (message.startsWith("[") && message.includes("value_error")) {
        return parsePydanticValidationPayload(message) ?? fallback;
      }
      return message;
    }

    return fallback;
  }

  if (error instanceof TypeError) {
    const message = error.message.toLowerCase();
    if (message.includes("fetch") || message.includes("network")) {
      return "No internet connection. Please check your network and try again.";
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}
