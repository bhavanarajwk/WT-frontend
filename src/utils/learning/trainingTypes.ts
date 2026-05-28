export function normalizeTrainingType(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

export function isMandatoryTrainingType(value: unknown): boolean {
  return normalizeTrainingType(value) === "MANDATORY";
}

/** OPTIONAL and HYBRID trainings returned by GET /trainings/open. */
export function isOpenCatalogTrainingType(value: unknown): boolean {
  const t = normalizeTrainingType(value);
  return t === "OPTIONAL" || t === "HYBRID";
}
