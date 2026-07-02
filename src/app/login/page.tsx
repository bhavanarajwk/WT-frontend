"use client";

import { Button } from "@/components/ui/button";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getGoogleSignInUrl,
  oauthErrorMessages,
} from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { WebTrakBrand } from "@/components/shared/WebTrakBrand";
import { WtLoaderCentered } from "@/components/dashboard/ui/WtLoader";
import { applyResolvedTheme } from "@/utils/dashboard/theme";

const TAGLINE =
  "Workforce visibility and project allocation—aligned in one secure workspace.";

const HIGHLIGHTS = [
  "Employee directory & profiles",
  "Leave, allocation & time logs",
  "Role-based HR & manager workflows",
] as const;

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

function LoginBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 bg-black" aria-hidden="true">
      <div className="absolute -left-24 top-0 h-[420px] w-[420px] rounded-full bg-[#355095]/20 blur-[100px]" />
      <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-[#4a6fa5]/10 blur-[90px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04),transparent_55%)]" />
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-relaxed text-red-100"
    >
      {message}
    </div>
  );
}

function LoginShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-black text-wt-text">
      <LoginBackdrop />
      <div className="relative z-10 mx-auto grid min-h-dvh w-full max-w-6xl grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-between border-r border-white/[0.06] px-10 py-12 lg:flex xl:px-14">
          <WebTrakBrand variant="login" className="!justify-start" />
          <div className="max-w-md space-y-8">
            <div className="space-y-4">
              <p className="text-sm font-medium text-[var(--wt-brand)]">Workforce Tracker</p>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white xl:text-4xl">
                One workspace for your entire workforce.
              </h1>
              <p className="text-base leading-relaxed text-wt-text-muted">{TAGLINE}</p>
            </div>
            <ul className="space-y-3">
              {HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-wt-text-muted">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--wt-brand)]/20 text-[10px] text-[var(--wt-brand)]">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-wt-text-faint">
            © {new Date().getFullYear()} WebTrak. All rights reserved.
          </p>
        </section>

        <section className="flex flex-col justify-center px-5 py-10 sm:px-8 lg:px-10 xl:px-14">
          <div className="mx-auto w-full max-w-[400px]">{children}</div>
          <p className="mx-auto mt-10 w-full max-w-[400px] text-center text-xs text-wt-text-faint lg:hidden">
            © {new Date().getFullYear()} WebTrak. All rights reserved.
          </p>
        </section>
      </div>
    </div>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const { status, refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const didRedirect = useRef(false);
  const didPostLoginRefresh = useRef(false);

  useEffect(() => {
    applyResolvedTheme("dark");
  }, []);

  useEffect(() => {
    const rawError = searchParams.get("error");
    if (rawError) {
      setError(oauthErrorMessages[rawError] ?? "An unknown error occurred.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (status === "authenticated" && !didRedirect.current) {
      didRedirect.current = true;
      window.location.replace("/dashboard");
    }
  }, [status]);

  useEffect(() => {
    if (status !== "unauthenticated" || didPostLoginRefresh.current) return;
    didPostLoginRefresh.current = true;
    void (async () => {
      const fresh = await refresh();
      if (fresh && !didRedirect.current) {
        didRedirect.current = true;
        window.location.replace("/dashboard");
      }
    })();
  }, [status, refresh]);

  function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    window.location.href = getGoogleSignInUrl();
  }

  if (status === "loading") {
    return (
      <LoginShell>
        <WtLoaderCentered label="Checking session…" />
      </LoginShell>
    );
  }

  return (
    <LoginShell>
      <div className="fade-up space-y-8">
        <div className="space-y-6 lg:hidden">
          <WebTrakBrand variant="login" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--wt-brand)]">Workforce Tracker</p>
            <p className="text-sm leading-relaxed text-wt-text-muted">{TAGLINE}</p>
          </div>
        </div>

        <div
          className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-8"
          aria-labelledby="login-heading"
        >
          <div className="space-y-2 text-center lg:text-left">
            <h2 id="login-heading" className="text-2xl font-semibold tracking-tight text-white">
              Welcome Back
            </h2>
            <p className="text-sm leading-relaxed text-wt-text-muted">
              Sign in with your company Google account to continue.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            {error ? <ErrorBanner message={error} /> : null}

            <Button
              id="google-signin-btn"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="h-12 w-full rounded-xl border border-white/[0.12] bg-white text-[15px] font-medium text-slate-900 shadow-sm transition hover:bg-slate-100 disabled:opacity-70"
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
            </Button>

            <p className="text-center text-xs leading-relaxed text-wt-text-faint lg:text-left">
              Only registered company accounts can sign in. Contact your administrator if you need
              access.
            </p>
          </div>
        </div>
      </div>
    </LoginShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <LoginShell>
          <WtLoaderCentered label="Loading" />
        </LoginShell>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
