"use client";

import { useAuth } from "@/context/AuthContext";
import { canEditEmployeeDirectory, canViewEmployeeDirectory } from "@/utils/roles";

/** Role gates for Employee Directory (HR / admin). */
export function useEmployeeDirectoryAccess() {
  const { user, status: authStatus } = useAuth();
  const roles = user?.roles ?? [];
  const canView = canViewEmployeeDirectory(roles);
  const canEdit = canEditEmployeeDirectory(roles);
  const queriesEnabled = authStatus === "authenticated" && canView;

  return {
    authStatus,
    canView,
    canEdit,
    queriesEnabled,
    roles,
  };
}
