const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parsePersonalEmailFromProfile(
  profile: Record<string, unknown> | null | undefined
): string {
  if (!profile) return "";
  return String(profile.personal_email ?? "").trim();
}

/** Client validation for `personal_email` (snake_case API field). */
export function validatePersonalEmail(
  workEmail: string,
  personalEmail: string,
  options: { required: boolean }
): string | null {
  const work = workEmail.trim().toLowerCase();
  const personal = personalEmail.trim();

  if (!personal) {
    return options.required ? "Personal mail ID is required." : null;
  }
  if (!EMAIL_RE.test(personal)) {
    return "Enter a valid personal email address.";
  }
  if (personal.toLowerCase() === work) {
    return "Personal mail ID must be different from work email.";
  }
  return null;
}
