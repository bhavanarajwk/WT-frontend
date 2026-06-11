"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { fetchSelfProfile } from "@/utils/selfProfile";
import { hasDmRole } from "@/utils/roles";
import {
  isActiveUserStatus,
  isOffboardedUserStatus,
  normalizeUserStatus,
  resolveProfileStatus,
} from "@/utils/userStatus";

export function useDashboardAccess() {
  const queryClient = useQueryClient();
  const { user, refresh: refreshSession } = useAuth();
  const userRoles = user?.roles ?? [];
  const hasHrAccess = userRoles.includes("ROLE_HR") || userRoles.includes("ROLE_ADMIN");
  const hasManagerAccess = userRoles.includes("ROLE_MANAGER");
  const hasDmAccess = hasDmRole(userRoles);
  const hasAccountManagerAccess = userRoles.includes("ROLE_AM");
  const isEmployee = userRoles.includes("ROLE_EMPLOYEE");
  const isAccountManagerOnly =
    hasAccountManagerAccess && !hasHrAccess && !hasManagerAccess;
  const restrictForPendingOnboarding =
    isEmployee && !hasHrAccess && !hasManagerAccess;
  const initialStatus = normalizeUserStatus(user?.status);
  const [profileStatus, setProfileStatus] = useState(initialStatus);
  const [isSelfOnboarded, setIsSelfOnboarded] = useState(() => isActiveUserStatus(initialStatus));
  /** Employment ended — applies regardless of manager/AM roles on the account. */
  const isOffboarded = isOffboardedUserStatus(profileStatus);
  const requiresSelfOnboarding =
    restrictForPendingOnboarding && !isSelfOnboarded && !isOffboarded;
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
    const applySessionStatus = () => {
      const status = normalizeUserStatus(user?.status);
      setProfileStatus(status);
      setIsSelfOnboarded(isActiveUserStatus(status));
      return null;
    };

    const profile = await fetchSelfProfile(userRoles);
    if (!profile) {
      return applySessionStatus();
    }
    const status = resolveProfileStatus(profile, user);
    setProfileStatus(status);
    setIsSelfOnboarded(isActiveUserStatus(status));
    if (user && normalizeUserStatus(user.status) !== status) {
      void refreshSession();
    }
    void queryClient.invalidateQueries({ queryKey: ["profile", "exit-interview"] });
    return profile;
  }, [user, userRoles, refreshSession, queryClient]);

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
    hasDmAccess,
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
    profileStatus,
    isOffboarded,
  };
}
