"use client";

import { Button } from "@/components/ui/button";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { hrmsService } from "@/services/hrms.service";
import { ApiError } from "@/api/error";
import { toPagedRows } from "@/utils/apiRows";
import {
  formatActionErrorMessage,
  formatActionSuccessMessage,
} from "@/utils/actionToast";
import {
  defaultInvitedEmployeesDateRange,
  filterInvitedRowsByCreatedAtRange,
  formatInvitedEmployeeTableRows,
} from "@/utils/dashboard/invitedEmployees";
import { compareApiDates, formatApiDateDisplay } from "@/utils/apiDate";
import { createEmptyOnboardForm } from "@/utils/onboardFormState";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { HrOnboardForm } from "@/components/employee-onboarding/HrOnboardForm";
import { InvitedEmployeesTable } from "@/components/employee-onboarding/InvitedEmployeesTable";
import { OnboardingGate } from "@/components/dashboard/shared/OnboardingGate";
import { ApiDateField } from "@/components/dashboard/ui/forms";
import {
  ManagementListCard,
  ManagementListContent,
} from "@/components/dashboard/ui/ManagementListCard";
import { defaultDashboardPathForRoles } from "@/constants/routes";
import { useOnboardOptions } from "@/hooks/useOnboardOptions";
import { parseBandsList } from "@/utils/masters";
import { FALLBACK_ONBOARD_OPTIONS } from "@/utils/onboardFormOptions";

export function EmployeePageClient() {
  const { user } = useAuth();
  const router = useRouter();
  const userRoles = user?.roles ?? [];
  const hasHrAccess = userRoles.includes("ROLE_HR") || userRoles.includes("ROLE_ADMIN");

  const [actionLoading, setActionLoading] = useState(false);
  const [onboardForm, setOnboardForm] = useState(createEmptyOnboardForm);
  const [onboardFormKey, setOnboardFormKey] = useState(0);
  const [inviteOnboardingRows, setInviteOnboardingRows] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [invitedListLoading, setInvitedListLoading] = useState(false);
  const [resendingInviteEmail, setResendingInviteEmail] = useState<string | null>(null);
  const [invitedListFromDate, setInvitedListFromDate] = useState(
    () => defaultInvitedEmployeesDateRange().from
  );
  const [invitedListToDate, setInvitedListToDate] = useState(
    () => defaultInvitedEmployeesDateRange().to
  );
  const [invitedApiServerRange, setInvitedApiServerRange] = useState<{
    from: string;
    to: string;
  } | null>(null);

  const invitedListFromDateRef = useRef(invitedListFromDate);
  const invitedListToDateRef = useRef(invitedListToDate);
  invitedListFromDateRef.current = invitedListFromDate;
  invitedListToDateRef.current = invitedListToDate;

  const onboardOptionsQ = useOnboardOptions(hasHrAccess);
  const bandsQ = useQuery({
    queryKey: ["masters", "bands"],
    enabled: hasHrAccess,
    staleTime: 30 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const res = await hrmsService.getBands();
      return parseBandsList(res);
    },
  });

  const onboardOptions = onboardOptionsQ.data ?? FALLBACK_ONBOARD_OPTIONS;
  const onboardBands = bandsQ.data ?? [];
  const optionsLoading = onboardOptionsQ.isLoading || bandsQ.isLoading;

  useEffect(() => {
    if (!hasHrAccess || bandsQ.isLoading) return;
    if (bandsQ.isError) {
      showErrorToast(
        bandsQ.error instanceof Error ? bandsQ.error.message : "Could not load bands."
      );
      return;
    }
    if (bandsQ.isSuccess && !bandsQ.data.length) {
      showErrorToast(
        "No bands found. Restart the API (seeds bands on startup) or run alembic migrations."
      );
    }
  }, [hasHrAccess, bandsQ.isLoading, bandsQ.isError, bandsQ.isSuccess, bandsQ.data, bandsQ.error]);

  useEffect(() => {
    if (!user) return;
    if (!hasHrAccess) {
      router.replace(defaultDashboardPathForRoles(userRoles));
    }
  }, [user, hasHrAccess, userRoles, router]);

  async function runAction(label: string, fn: () => Promise<unknown>) {
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
  }

  const loadInviteOnboardingPreview = useCallback(
    async (range?: { from?: string; to?: string }) => {
      const from = (range?.from ?? invitedListFromDateRef.current).trim();
      const to = (range?.to ?? invitedListToDateRef.current).trim();
      if (!from || !to) {
        throw new Error("From date and To date are required.");
      }
      if (compareApiDates(from, to) > 0) {
        throw new Error("From date must be on or before To date.");
      }

      setInvitedListLoading(true);
      try {
        const res = await hrmsService.getInvitedUsers({
          fromDate: from,
          toDate: to,
          page: "0",
          size: "200",
        });
        const payload = ((res as { data?: unknown }).data ?? res) as Record<string, unknown>;
        const respFrom = formatApiDateDisplay(String(payload.from_date ?? "").trim());
        const respTo = formatApiDateDisplay(String(payload.to_date ?? "").trim());
        const rawRows = toPagedRows(payload.items ?? payload);
        const filteredRows = filterInvitedRowsByCreatedAtRange(rawRows, from, to);
        const serverRangeMismatch =
          Boolean(respFrom && respTo) && (respFrom !== from || respTo !== to);
        setInvitedApiServerRange(
          serverRangeMismatch ? { from: respFrom, to: respTo } : null
        );
        setInviteOnboardingRows(formatInvitedEmployeeTableRows(filteredRows));
      } finally {
        setInvitedListLoading(false);
      }
    },
    []
  );

  const resetOnboardForm = useCallback(() => {
    setOnboardForm(createEmptyOnboardForm());
    setOnboardFormKey((key) => key + 1);
  }, []);

  const handleOnboardFormError = useCallback((message: string) => {
    showErrorToast(message);
  }, []);

  const resendOnboardInvite = useCallback(
    (email: string) => {
      const normalized = email.trim().toLowerCase();
      if (!normalized) return;
      void runAction("Resend onboarding invite", async () => {
        setResendingInviteEmail(normalized);
        try {
          await hrmsService.resendOnboardInvite({ email: normalized });
          showSuccessToast(`Onboarding invite resent to ${normalized}.`);
        } finally {
          setResendingInviteEmail(null);
        }
      });
    },
    []
  );

  useEffect(() => {
    if (!hasHrAccess) return;
    if (inviteOnboardingRows.length) return;
    void loadInviteOnboardingPreview().catch(() => {
      setInviteOnboardingRows([]);
    });
  }, [hasHrAccess, inviteOnboardingRows.length, loadInviteOnboardingPreview]);

  const onboardingBusy = invitedListLoading || actionLoading;

  return (
    <DashboardPageShell>
      <OnboardingGate>
        <section className="space-y-4">
          {hasHrAccess ? (
            <div className="space-y-4">
              <HrOnboardForm
                formKey={onboardFormKey}
                form={onboardForm}
                setForm={setOnboardForm}
                options={onboardOptions}
                bands={onboardBands}
                hasHrAccess={hasHrAccess}
                actionLoading={actionLoading}
                optionsLoading={optionsLoading}
                runAction={runAction}
                onError={handleOnboardFormError}
                onSubmitSuccess={async () => {
                  await loadInviteOnboardingPreview();
                  resetOnboardForm();
                }}
              />

              <ManagementListCard
                title="Onboarded Employees"
                description="Invited employees within the selected date range."
                headerAction={
                  <Button
                    variant="ghost"
                    type="button"
                    className="px-3 py-2"
                    onClick={() =>
                      runAction("Refresh Employees", async () => {
                        await loadInviteOnboardingPreview();
                        resetOnboardForm();
                      })
                    }
                    disabled={actionLoading || invitedListLoading}
                  >
                    Refresh Employees
                  </Button>
                }
                toolbar={
                  <div className="flex flex-nowrap items-end gap-2 overflow-x-auto pb-0.5">
                    <ApiDateField
                      label="From Date"
                      value={invitedListFromDate}
                      onChange={setInvitedListFromDate}
                      className="w-42 shrink-0"
                    />
                    <ApiDateField
                      label="To Date"
                      value={invitedListToDate}
                      onChange={setInvitedListToDate}
                      className="w-42 shrink-0"
                    />
                    <Button
                      variant="brand"
                      type="button"
                      className="h-10 shrink-0 px-3 text-sm"
                      onClick={() =>
                        runAction("Load invited employees", async () => {
                          await loadInviteOnboardingPreview({
                            from: invitedListFromDateRef.current,
                            to: invitedListToDateRef.current,
                          });
                          resetOnboardForm();
                        })
                      }
                      disabled={actionLoading}
                    >
                      Apply Dates
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      className="h-10 shrink-0 px-3 text-sm"
                      onClick={() =>
                        runAction("Reset invited date range", async () => {
                          const { from, to } = defaultInvitedEmployeesDateRange();
                          setInvitedListFromDate(from);
                          setInvitedListToDate(to);
                          await loadInviteOnboardingPreview({ from, to });
                          resetOnboardForm();
                        })
                      }
                      disabled={actionLoading}
                    >
                      Last 7 Days
                    </Button>
                  </div>
                }
              >
                {invitedApiServerRange ? (
                  <p
                    className="mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
                    role="status"
                  >
                    The server returned data for {invitedApiServerRange.from} —{" "}
                    {invitedApiServerRange.to} (fixed window). Rows shown are filtered to your
                    selected range ({invitedListFromDate} — {invitedListToDate}). Older invites may
                    be missing until the API honors{" "}
                    <code className="text-[11px]">fromDate</code> /{" "}
                    <code className="text-[11px]">toDate</code>.
                  </p>
                ) : null}
                <ManagementListContent
                  isLoading={invitedListLoading}
                  isEmpty={!invitedListLoading && !inviteOnboardingRows.length}
                  emptyTitle="No invited employees in this date range."
                  emptyDescription="Try adjusting your date range or refresh the list."
                  skeletonRows={8}
                  skeletonColumns={8}
                >
                  <InvitedEmployeesTable
                    rows={inviteOnboardingRows}
                    actionLoading={actionLoading || onboardingBusy}
                    resendingEmail={resendingInviteEmail}
                    onResendInvite={resendOnboardInvite}
                  />
                </ManagementListContent>
              </ManagementListCard>
            </div>
          ) : null}
        </section>
      </OnboardingGate>
    </DashboardPageShell>
  );
}
