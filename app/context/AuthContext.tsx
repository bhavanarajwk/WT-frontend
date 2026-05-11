"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { type AuthUser, refreshSession, logout } from "@/app/lib/auth";
import { useRouter } from "next/navigation";

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
  signOut: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Context                                                               */
/* ------------------------------------------------------------------ */

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* ------------------------------------------------------------------ */
/* Provider                                                              */
/* ------------------------------------------------------------------ */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const didInitialRefresh = useRef(false);

  const refresh = useCallback(async (): Promise<AuthUser | null> => {
    setStatus("loading");
    const freshUser = await refreshSession();
    if (freshUser) {
      setUser(freshUser);
      setStatus("authenticated");
    } else {
      setUser(null);
      setStatus("unauthenticated");
    }
    return freshUser;
  }, []);

  const signOut = useCallback(async () => {
    await logout();
    setUser(null);
    setStatus("unauthenticated");
    router.push("/login");
  }, [router]);

  /* Validate session on first mount */
  useEffect(() => {
    if (didInitialRefresh.current) return;
    didInitialRefresh.current = true;
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, status, refresh, signOut }}>
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
