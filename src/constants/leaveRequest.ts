/** HR CC recipients automatically included on every leave request submission. */
export const LEAVE_HR_CC_EMAILS = [
  "hr@webknot.in",
  "applyleave@webknot.in",
] as const;

/** @deprecated Use LEAVE_HR_CC_EMAILS */
export const LEAVE_SECONDARY_MANAGER_CC_EMAILS = LEAVE_HR_CC_EMAILS;
