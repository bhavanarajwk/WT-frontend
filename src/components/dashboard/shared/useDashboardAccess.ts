"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { hrmsService } from "@/services/hrms.service";

export function useDashboardAccess() {
  const { user, refresh: refreshSession } = useAuth();
  const userRoles = user?.roles ?? [];
  const hasHrAccess = userRoles.includes("ROLE_HR") || userRoles.includes("ROLE_ADMIN");
  const hasManagerAccess = userRoles.includes("ROLE_MANAGER");
  const hasAccountManagerAccess = userRoles.includes("ROLE_AM");
  const isEmployee = userRoles.includes("ROLE_EMPLOYEE");
  const isAccountManagerOnly =
    hasAccountManagerAccess && !hasHrAccess && !hasManagerAccess;
  const restrictForPendingOnboarding =
    isEmployee && !hasHrAccess && !hasManagerAccess;
  const [isSelfOnboarded, setIsSelfOnboarded] = useState<boolean>(user?.status === "ACTIVE");
  const requiresSelfOnboarding = restrictForPendingOnboarding && !isSelfOnboarded;
  const employeeSelfServeProfile = isEmployee && !hasHrAccess;
  const canAccessProfile = Boolean(user);
  const canAccessOverview = useMemo(
    () =>
      userRoles.includes("ROLE_HR") ||
      userRoles.includes("ROLE_ADMIN") ||
      userRoles.includes("ROLE_FINANCE"),
    [userRoles]
  );

  const loadMyProfile = useCallback(async () => {
    const res = await hrmsService.getMyProfile();
    const profile = (res.data ?? null) as Record<string, unknown> | null;
    if (!profile) return profile;
    const status = String(profile.status ?? user?.status ?? "").toUpperCase();
    setIsSelfOnboarded(status === "ACTIVE");
    return profile;
  }, [user?.status]);

  useEffect(() => {
    if (!user) return;
    const id = window.setTimeout(() => {
      void loadMyProfile();
    }, 0);
    return () => window.clearTimeout(id);
  }, [user, loadMyProfile]);

  return {
    user,
    refreshSession,
    userRoles,
    hasHrAccess,
    hasManagerAccess,
    hasAccountManagerAccess,
    isAccountManagerOnly,
    isEmployee,
    requiresSelfOnboarding,
    employeeSelfServeProfile,
    canAccessProfile,
    canAccessOverview,
    isSelfOnboarded,
    setIsSelfOnboarded,
    loadMyProfile,
  };
}
