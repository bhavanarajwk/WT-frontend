"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getGoogleSignInUrl,
  oauthErrorMessages,
} from "@/app/lib/auth";
import { useAuth } from "@/app/context/AuthContext";

/* ------------------------------------------------------------------ */
/* Google G SVG icon                                                     */
/* ------------------------------------------------------------------ */
function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Animated mesh gradient background                                     */
/* ------------------------------------------------------------------ */
function MeshBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Base dark */}
      <div className="absolute inset-0 bg-[#0a0918]" />

      {/* Glow orbs */}
      <div
        className="absolute -top-40 -left-32 w-[600px] h-[600px] rounded-full opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgba(79,70,229,0.7) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute top-1/3 -right-24 w-[500px] h-[500px] rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.8) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full opacity-15"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.6) 0%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* WebTrak logo mark                                                     */
/* ------------------------------------------------------------------ */
function LogoMark() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative flex items-center justify-center w-10 h-10 rounded-xl"
        style={{
          background: "linear-gradient(135deg, #4f46e5, #8b5cf6)",
          boxShadow: "0 4px 20px rgba(99,102,241,0.45)",
        }}
      >
        {/* W letterform */}
        <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
          <path
            d="M1 1L5.5 14L11 5L16.5 14L21 1"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span
        className="text-xl font-bold tracking-tight"
        style={{
          background: "linear-gradient(135deg, #e0e7ff, #a78bfa)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        WebTrak
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Error banner                                                          */
/* ------------------------------------------------------------------ */
function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm fade-up"
      style={{
        background: "rgba(239,68,68,0.1)",
        borderColor: "rgba(239,68,68,0.3)",
        color: "#fca5a5",
      }}
    >
      <svg
        className="mt-0.5 shrink-0"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-3a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 5Zm0 6.5a.875.875 0 1 0 0-1.75.875.875 0 0 0 0 1.75Z"
          clipRule="evenodd"
        />
      </svg>
      <span>{message}</span>
    </div>
  );
}



/* ------------------------------------------------------------------ */
/* Main page                                                             */
/* ------------------------------------------------------------------ */


export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const didRedirect = useRef(false);

  /* Pick up OAuth callback errors */
  useEffect(() => {
    const rawError = searchParams.get("error");
    if (rawError) {
      setError(oauthErrorMessages[rawError] ?? "An unknown error occurred.");
    }
  }, [searchParams]);

  /* If already authenticated, go to dashboard */
  useEffect(() => {
    if (status === "authenticated" && !didRedirect.current) {
      didRedirect.current = true;
      router.replace("/dashboard");
    }
  }, [status, router]);

  function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    window.location.href = getGoogleSignInUrl();
  }



  /* While checking session, show a subtle loader */
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <MeshBackground />
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent"
            style={{
              borderColor: "var(--wt-indigo-400)",
              borderTopColor: "transparent",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p className="text-sm" style={{ color: "var(--wt-text-muted)" }}>
            Checking session…
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 py-16">
      <MeshBackground />

      <div className="relative w-full max-w-md fade-up">
        {/* Card */}
        <div
          className="glass noise relative flex flex-col gap-8 px-8 py-10"
          style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.55)" }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center gap-6 text-center">
            <LogoMark />
            <div className="flex flex-col gap-1.5">
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{ color: "var(--wt-text)" }}
              >
                Welcome back
              </h1>
              <p className="text-sm" style={{ color: "var(--wt-text-muted)" }}>
                Sign in with your company Google account to continue.
              </p>
            </div>
          </div>

          {/* Error */}
          {error && <ErrorBanner message={error} />}

          {/* Google Sign-in */}
          <div className="flex flex-col gap-4">
            <button
              id="google-signin-btn"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="btn-primary w-full py-3.5"
              style={{ fontSize: "0.9375rem" }}
            >
              {googleLoading ? (
                <>
                  <span className="spinner" />
                  Redirecting to Google…
                </>
              ) : (
                <>
                  <GoogleIcon size={20} />
                  Continue with Google
                </>
              )}
            </button>

            <p
              className="text-center text-xs leading-relaxed"
              style={{ color: "var(--wt-text-faint)" }}
            >
              Only registered company accounts can sign in.
              <br />
              Contact your administrator if you need access.
            </p>
          </div>


        </div>

        {/* Footer */}
        <p
          className="mt-6 text-center text-xs"
          style={{ color: "var(--wt-text-faint)" }}
        >
          © {new Date().getFullYear()} WebTrak. All rights reserved.
        </p>
      </div>
    </main>
  );
}
