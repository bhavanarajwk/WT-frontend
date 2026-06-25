"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { type AuthUser, refreshSession, logout as authLogout } from "@/lib/auth";
import { normalizeRoles } from "@/utils/roles";
import {
  clearSessionTiming,
  persistSessionTiming,
  useSessionTimeout,
} from "@/hooks/useSessionTimeout";
import {
  sessionLogoutMessages,
  type SessionLogoutReason,
} from "@/constants/sessionPolicy";

/* ------------------------------------------------------------------ */
/* Types                                                                 */
/* ------------------------------------------------------------------ */

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  /** Re-validates the session with the server. Returns the user or null. */
  refresh: () => Promise<AuthUser | null>;
  /** Logs out and redirects to /login. */
  logout: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Context                                                               */
/* ------------------------------------------------------------------ */

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function applyAuthenticatedUser(freshUser: AuthUser): AuthUser {
  const normalized = { ...freshUser, roles: normalizeRoles(freshUser.roles ?? []) };
  persistSessionTiming(normalized.session_started_at);
  return normalized;
}

/* ------------------------------------------------------------------ */
/* Provider                                                              */
/* ------------------------------------------------------------------ */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const didInitialRefresh = useRef(false);
  const timeoutHandled = useRef(false);
  const userRef = useRef<AuthUser | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const refresh = useCallback(async (): Promise<AuthUser | null> => {
    setStatus("loading");
    try {
      const freshUser = await refreshSession();
      if (freshUser) {
        const normalized = applyAuthenticatedUser(freshUser);
        setUser(normalized);
        setStatus("authenticated");
        return normalized;
      }
      clearSessionTiming();
      setUser(null);
      setStatus("unauthenticated");
      return null;
    } catch {
      const keptUser = userRef.current;
      if (keptUser) {
        setStatus("authenticated");
        return keptUser;
      }
      clearSessionTiming();
      setUser(null);
      setStatus("unauthenticated");
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authLogout();
    } finally {
      clearSessionTiming();
      setUser(null);
      setStatus("unauthenticated");
      router.push("/login");
    }
  }, [router]);

  const handleSessionTimeout = useCallback(
    async (reason: SessionLogoutReason) => {
      if (timeoutHandled.current) return;
      timeoutHandled.current = true;
      try {
        await authLogout();
      } catch {
        /* best-effort */
      } finally {
        clearSessionTiming();
        setUser(null);
        setStatus("unauthenticated");
        const query =
          reason === "idle"
            ? "session_idle_timeout"
            : reason === "expired"
              ? "session_expired"
              : "oauth_login_failed";
        router.replace(`/login?error=${query}`);
      }
    },
    [router]
  );

  useSessionTimeout(status === "authenticated", handleSessionTimeout);

  /* Validate session on first mount */
  useEffect(() => {
    if (didInitialRefresh.current) return;
    didInitialRefresh.current = true;
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (status === "authenticated") {
      timeoutHandled.current = false;
    }
  }, [status]);

  return (
    <AuthContext.Provider value={{ user, status, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Hook                                                                  */
/* ------------------------------------------------------------------ */

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}

export { sessionLogoutMessages };
