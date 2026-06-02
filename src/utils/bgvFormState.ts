export type BgvFormState = {
  emp_id: string;
  name: string;
  role: string;
  level: string;
  consent_form_signed: string;
  identity: string;
  employment: string;
  reference: string;
  mail_id: string;
  onboarding_form: string;
  overall_status: string;
  remarks: string;
};

export function createEmptyBgvForm(): BgvFormState {
  return {
    emp_id: "",
    name: "",
    role: "",
    level: "",
    consent_form_signed: "",
    identity: "",
    employment: "",
    reference: "",
    mail_id: "",
    onboarding_form: "",
    overall_status: "",
    remarks: "",
  };
}
