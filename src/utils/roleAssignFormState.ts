export type RoleAssignFormState = {
  target_email: string;
  role: string;
};

export function createEmptyRoleAssignForm(): RoleAssignFormState {
  return {
    target_email: "",
    role: "",
  };
}
