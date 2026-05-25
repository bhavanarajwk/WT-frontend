"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * Route guard for all protected routes under (protected)/.
 * - While loading: shows a full-screen shimmer.
 * - Unauthenticated: redirects to /login.
 * - Authenticated: renders children.
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wt-bg">
        <div className="flex flex-col items-center gap-5">
          {/* Animated logo placeholder */}
          <div
            className="relative w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #4f46e5, #8b5cf6)",
              boxShadow: "0 0 40px rgba(99,102,241,0.4)",
            }}
          >
            <svg width="26" height="18" viewBox="0 0 22 16" fill="none">
              <path
                d="M1 1L5.5 14L11 5L16.5 14L21 1"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="pulse-dot w-1.5 h-1.5 rounded-full"
                  style={{
                    background: "var(--wt-indigo-400)",
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
            <p className="text-xs" style={{ color: "var(--wt-text-faint)" }}>
              Loading your workspace…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    // The useEffect will redirect; render nothing in the meantime
    return null;
  }

  return <>{children}</>;
}
