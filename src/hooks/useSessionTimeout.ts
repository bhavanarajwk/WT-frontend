"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  SESSION_ACTIVITY_PING_MS,
  SESSION_INACTIVITY_MS,
  SESSION_MAX_MS,
  SESSION_REFRESH_INTERVAL_MS,
  SESSION_STORAGE_LAST_ACTIVITY,
  SESSION_STORAGE_STARTED_AT,
  type SessionLogoutReason,
} from "@/constants/sessionPolicy";
import { recordSessionActivity, refreshSession } from "@/lib/auth";

function readSessionStartMs(): number {
  const raw = sessionStorage.getItem(SESSION_STORAGE_STARTED_AT);
  if (!raw) return Date.now();
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function touchLocalActivity() {
  const now = Date.now();
  sessionStorage.setItem(SESSION_STORAGE_LAST_ACTIVITY, String(now));
  return now;
}

export function persistSessionTiming(sessionStartedAt?: string | null) {
  const started = sessionStartedAt ? Date.parse(sessionStartedAt) : Date.now();
  sessionStorage.setItem(SESSION_STORAGE_STARTED_AT, new Date(started).toISOString());
  touchLocalActivity();
}

export function clearSessionTiming() {
  sessionStorage.removeItem(SESSION_STORAGE_STARTED_AT);
  sessionStorage.removeItem(SESSION_STORAGE_LAST_ACTIVITY);
}

/**
 * Logs the user out after 30 minutes of inactivity or 8 hours absolute session age.
 * Activity: mouse, keyboard, scroll, touch, focus, and client-side navigation.
 */
export function useSessionTimeout(
  enabled: boolean,
  onTimeout: (reason: SessionLogoutReason) => void
) {
  const pathname = usePathname();
  const onTimeoutRef = useRef(onTimeout);
  const lastActivityRef = useRef(Date.now());
  const lastPingRef = useRef(0);
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const bumpActivity = useCallback(() => {
    lastActivityRef.current = touchLocalActivity();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const events: Array<keyof WindowEventMap> = [
      "mousedown",
      "keydown",
      "click",
      "scroll",
      "touchstart",
      "focus",
    ];

    const onActivity = () => bumpActivity();
    for (const eventName of events) {
      window.addEventListener(eventName, onActivity, { passive: true });
    }

    const intervalId = window.setInterval(() => {
      const now = Date.now();
      const sessionStart = readSessionStartMs();
      const idleFor = now - lastActivityRef.current;

      if (now - sessionStart >= SESSION_MAX_MS) {
        onTimeoutRef.current("expired");
        return;
      }
      if (idleFor >= SESSION_INACTIVITY_MS) {
        onTimeoutRef.current("idle");
        return;
      }

      if (idleFor < SESSION_INACTIVITY_MS && now - lastPingRef.current >= SESSION_ACTIVITY_PING_MS) {
        lastPingRef.current = now;
        void recordSessionActivity().catch(() => {
          onTimeoutRef.current("server");
        });
      }

      if (
        idleFor < SESSION_INACTIVITY_MS &&
        now - lastRefreshRef.current >= SESSION_REFRESH_INTERVAL_MS
      ) {
        lastRefreshRef.current = now;
        void refreshSession().then((user) => {
          if (!user) onTimeoutRef.current("server");
        });
      }
    }, 30_000);

    return () => {
      for (const eventName of events) {
        window.removeEventListener(eventName, onActivity);
      }
      window.clearInterval(intervalId);
    };
  }, [enabled, bumpActivity]);

  useEffect(() => {
    if (enabled) bumpActivity();
  }, [pathname, enabled, bumpActivity]);
}
