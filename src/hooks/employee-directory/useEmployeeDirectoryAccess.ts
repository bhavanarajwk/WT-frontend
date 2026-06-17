"use client";

import { useAuth } from "@/context/AuthContext";
import {
  canEditEmployeeDirectory,
  canEditEmployeeProfile,
  canEditEmployeeProfileStatusOnly,
  canOpenEmployeeProfileEditor,
  canViewEmployeeDirectory,
} from "@/utils/roles";

/** Role gates for Employee Directory (HR / admin). */
export function useEmployeeDirectoryAccess() {
  const { user, status: authStatus } = useAuth();
  const roles = user?.roles ?? [];
  const canView = canViewEmployeeDirectory(roles);
  const canEdit = canEditEmployeeDirectory(roles);
  const canEditProfile = canEditEmployeeProfile(roles);
  const canEditProfileStatusOnly = canEditEmployeeProfileStatusOnly(roles);
  const canOpenProfileEditor = canOpenEmployeeProfileEditor(roles);
  const queriesEnabled = authStatus === "authenticated" && canView;

  return {
    authStatus,
    canView,
    canEdit,
    canEditProfile,
    canEditProfileStatusOnly,
    canOpenProfileEditor,
    queriesEnabled,
    roles,
  };
}
