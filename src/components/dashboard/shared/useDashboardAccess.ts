"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useSelfProfile, selfProfileQueryKey } from "@/hooks/useSelfProfile";
import { hasDmRole, hasManagerRole } from "@/utils/roles";
import {
  isActiveUserStatus,
  isInNoticeUserStatus,
  isOffboardedUserStatus,
  normalizeUserStatus,
  resolveProfileStatus,
} from "@/utils/userStatus";
import { isPortalLockedProfile } from "@/utils/portalLock";

export function useDashboardAccess() {
  const queryClient = useQueryClient();
  const { user, refresh: refreshSession } = useAuth();
  const userRoles = user?.roles ?? [];
  const hasHrAccess = userRoles.includes("ROLE_HR") || userRoles.includes("ROLE_ADMIN");
  const hasManagerAccess = hasManagerRole(userRoles);
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
  const profileQ = useSelfProfile(Boolean(user));
  /** Employment ended — applies regardless of manager/AM roles on the account. */
  const isOffboarded = isOffboardedUserStatus(profileStatus);
  const isInNotice = isInNoticeUserStatus(profileStatus);
  const isPortalLocked = isPortalLockedProfile(profileQ.data ?? null);
  const requiresSelfOnboarding =
    restrictForPendingOnboarding && !isSelfOnboarded && !isOffboarded && !isInNotice;
  const employeeSelfServeProfile = isEmployee && !hasHrAccess;
  const canAccessProfile = Boolean(user);
  const canAccessOverview = useMemo(
    () =>
      userRoles.includes("ROLE_HR") ||
      userRoles.includes("ROLE_ADMIN") ||
      userRoles.includes("ROLE_FINANCE"),
    [userRoles]
  );

  useEffect(() => {
    if (!user) return;
    if (profileQ.isLoading) return;

    const profile = profileQ.data ?? null;
    if (!profile) {
      const status = normalizeUserStatus(user?.status);
      setProfileStatus(status);
      setIsSelfOnboarded(isActiveUserStatus(status));
      return;
    }

    const status = resolveProfileStatus(profile, user);
    setProfileStatus(status);
    setIsSelfOnboarded(isActiveUserStatus(status));
    if (normalizeUserStatus(user.status) !== status) {
      void refreshSession();
    }
  }, [user, profileQ.data, profileQ.isLoading, refreshSession]);

  const loadMyProfile = useCallback(async () => {
    const result = await profileQ.refetch();
    const profile = result.data ?? null;
    if (!profile) {
      const status = normalizeUserStatus(user?.status);
      setProfileStatus(status);
      setIsSelfOnboarded(isActiveUserStatus(status));
      return null;
    }
    const status = resolveProfileStatus(profile, user);
    setProfileStatus(status);
    setIsSelfOnboarded(isActiveUserStatus(status));
    if (user && normalizeUserStatus(user.status) !== status) {
      void refreshSession();
    }
    void queryClient.invalidateQueries({ queryKey: ["profile", "exit-interview"] });
    return profile;
  }, [profileQ, queryClient, refreshSession, user]);

  const invalidateSelfProfile = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: selfProfileQueryKey(user?.email) });
  }, [queryClient, user?.email]);

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
    invalidateSelfProfile,
    profileStatus,
    isOffboarded,
    isInNotice,
    isPortalLocked,
    profile: profileQ.data ?? null,
    profileLoading: profileQ.isLoading,
  };
}
