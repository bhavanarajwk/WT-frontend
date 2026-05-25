"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/api/error";
import {
  formatActionErrorMessage,
  formatActionSuccessMessage,
} from "@/utils/actionToast";

export function useDashboardAction() {
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);

  const runAction = useCallback(async (label: string, fn: () => Promise<unknown>) => {
    setActionLoading(true);
    try {
      await fn();
      setToast({ type: "success", message: formatActionSuccessMessage(label) });
    } catch (error) {
      const backendMessage =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "";
      setToast({
        type: "error",
        message: formatActionErrorMessage(label, backendMessage),
      });
    } finally {
      setActionLoading(false);
    }
  }, []);

  return { toast, actionLoading, runAction, setToast };
}
