export function formatS3Error(error: unknown): string {
  if (!(error && typeof error === "object")) {
    return "Object storage request failed.";
  }

  const record = error as {
    name?: string;
    message?: string;
    Code?: string;
    $metadata?: { httpStatusCode?: number };
    cause?: unknown;
  };

  const code = record.Code ?? record.name;
  const status = record.$metadata?.httpStatusCode;
  const message = record.message?.trim();

  if (message && message !== "UnknownError") {
    return status ? `${message} (HTTP ${status})` : message;
  }

  if (code && code !== "UnknownError") {
    return status ? `${code} (HTTP ${status})` : code;
  }

  if (record.cause && typeof record.cause === "object") {
    const causeMessage =
      "message" in record.cause ? String(record.cause.message ?? "").trim() : "";
    if (causeMessage) return causeMessage;
  }

  return status
    ? `Object storage request failed (HTTP ${status}). Check bucket, credentials, and region in .env.local.`
    : "Object storage request failed. Check bucket, credentials, and region in .env.local.";
}

export function isMissingObjectError(error: unknown): boolean {
  if (!(error && typeof error === "object")) return false;

  const record = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  const code = record.Code ?? record.name ?? "";

  if (code === "NoSuchKey" || code === "NotFound" || code === "NoSuchBucket") {
    return true;
  }

  return record.$metadata?.httpStatusCode === 404;
}
