"use client";

import { useCallback, useState } from "react";
import { ApiError } from "@/api/error";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  formatActionErrorMessage,
  formatActionSuccessMessage,
} from "@/utils/actionToast";

export function useDashboardAction() {
  const [actionLoading, setActionLoading] = useState(false);

  const runAction = useCallback(async (label: string, fn: () => Promise<unknown>) => {
    setActionLoading(true);
    try {
      await fn();
      showSuccessToast(formatActionSuccessMessage(label));
    } catch (error) {
      const backendMessage =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "";
      showErrorToast(formatActionErrorMessage(label, backendMessage));
    } finally {
      setActionLoading(false);
    }
  }, []);

  return { actionLoading, runAction };
}
