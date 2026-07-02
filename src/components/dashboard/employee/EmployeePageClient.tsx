"use client";

import { Button } from "@/components/ui/button";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { hrmsService } from "@/services/hrms.service";
import { toPagedRows } from "@/utils/apiRows";
import {
  formatActionErrorMessage,
  formatActionSuccessMessage,
} from "@/utils/actionToast";
import {
  defaultInvitedEmployeesDateRange,
  filterInvitedRowsByCreatedAtRange,
  filterInvitedRowsByName,
  formatInvitedEmployeeTableRows,
} from "@/utils/dashboard/invitedEmployees";
import { compareApiDates, formatApiDateDisplay } from "@/utils/apiDate";
import { createEmptyOnboardForm } from "@/utils/onboardFormState";
import { toUserFriendlyApiErrorMessage } from "@/utils/userFriendlyApiError";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { CARD_STACK_CLASS } from "@/components/dashboard/ui/uiLayout";
import { HrOnboardForm } from "@/components/employee-onboarding/HrOnboardForm";
import { InvitedEmployeesTable } from "@/components/employee-onboarding/InvitedEmployeesTable";
import { OnboardingGate } from "@/components/dashboard/shared/OnboardingGate";
import { ApiDateField } from "@/components/dashboard/ui/forms";
import {
  ManagementListCard,
  ManagementListContent,
} from "@/components/dashboard/ui/ManagementListCard";
import { SearchInput } from "@/components/dashboard/ui/SearchInput";
import { defaultDashboardPathForRoles } from "@/constants/routes";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useOnboardOptions } from "@/hooks/useOnboardOptions";
import { parseBandsList } from "@/utils/masters";
import { FALLBACK_ONBOARD_OPTIONS } from "@/utils/onboardFormOptions";

function invitedDateRangeError(from: string, to: string): string | null {
  const fromTrimmed = from.trim();
  const toTrimmed = to.trim();
  if (!fromTrimmed || !toTrimmed) {
    return "From date and To date are required.";
  }
  if (compareApiDates(fromTrimmed, toTrimmed) > 0) {
    return "From date must be on or before To date.";
  }
  return null;
}

export function EmployeePageClient() {
  const { user } = useAuth();
  const router = useRouter();
  const userRoles = user?.roles ?? [];
  const hasHrAccess = userRoles.includes("ROLE_HR") || userRoles.includes("ROLE_ADMIN");

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [onboardForm, setOnboardForm] = useState(createEmptyOnboardForm);
  const [onboardFormKey, setOnboardFormKey] = useState(0);
  const [inviteOnboardingRows, setInviteOnboardingRows] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [invitedListLoading, setInvitedListLoading] = useState(false);
  const [resendingInviteEmail, setResendingInviteEmail] = useState<string | null>(null);
  const [bulkResendingInvites, setBulkResendingInvites] = useState(false);
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
  const [invitedNameSearch, setInvitedNameSearch] = useState("");

  const debouncedInvitedNameSearch = useDebouncedValue(invitedNameSearch, 300);

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
        toUserFriendlyApiErrorMessage(
          bandsQ.error,
          bandsQ.error instanceof Error ? bandsQ.error.message : "Could not load bands."
        )
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

  async function runFormAction(label: string, fn: () => Promise<void>) {
    setFormSubmitting(true);
    try {
      await fn();
      showSuccessToast(formatActionSuccessMessage(label));
    } catch (error) {
      showErrorToast(
        toUserFriendlyApiErrorMessage(error, formatActionErrorMessage(label))
      );
    } finally {
      setFormSubmitting(false);
    }
  }

  const loadInviteOnboardingPreview = useCallback(
    async (range?: { from?: string; to?: string }) => {
      const from = (range?.from ?? invitedListFromDateRef.current).trim();
      const to = (range?.to ?? invitedListToDateRef.current).trim();
      const rangeError = invitedDateRangeError(from, to);
      if (rangeError) {
        throw new Error(rangeError);
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

  const refreshInvitedList = useCallback(
    async (range?: { from?: string; to?: string }) => {
      try {
        await loadInviteOnboardingPreview(range);
      } catch (error) {
        showErrorToast(toUserFriendlyApiErrorMessage(error));
      }
    },
    [loadInviteOnboardingPreview]
  );

  const resetOnboardForm = useCallback(() => {
    setOnboardForm(createEmptyOnboardForm());
    setOnboardFormKey((key) => key + 1);
  }, []);

  const handleOnboardFormError = useCallback((message: string) => {
    showErrorToast(message);
  }, []);

  const resendOnboardInvite = useCallback((email: string) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;

    void (async () => {
      setResendingInviteEmail(normalized);
      try {
        await hrmsService.resendOnboardInvite({ email: normalized });
        showSuccessToast(`Onboarding invite resent to ${normalized}.`);
      } catch (error) {
        showErrorToast(
          toUserFriendlyApiErrorMessage(error, "Failed to resend onboarding invite.")
        );
      } finally {
        setResendingInviteEmail(null);
      }
    })();
  }, []);

  const resendOnboardInvitesBulk = useCallback(async (emails: string[]) => {
    const unique = [
      ...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)),
    ];
    if (!unique.length || bulkResendingInvites) return;

    setBulkResendingInvites(true);
    let sent = 0;
    let failed = 0;

    try {
      for (const email of unique) {
        setResendingInviteEmail(email);
        try {
          await hrmsService.resendOnboardInvite({ email });
          sent += 1;
        } catch {
          failed += 1;
        }
      }
    } finally {
      setResendingInviteEmail(null);
      setBulkResendingInvites(false);
    }

    if (failed === 0) {
      showSuccessToast(
        `Onboarding invites resent to ${sent} employee${sent === 1 ? "" : "s"}.`
      );
      return;
    }
    if (sent === 0) {
      showErrorToast(
        `Failed to resend invites to ${failed} employee${failed === 1 ? "" : "s"}.`
      );
      return;
    }
    showErrorToast(
      `${sent} invite${sent === 1 ? "" : "s"} sent, ${failed} failed.`
    );
  }, [bulkResendingInvites]);

  useEffect(() => {
    if (!hasHrAccess) return;
    if (inviteOnboardingRows.length) return;
    void loadInviteOnboardingPreview().catch(() => {
      setInviteOnboardingRows([]);
    });
  }, [hasHrAccess, inviteOnboardingRows.length, loadInviteOnboardingPreview]);

  const filteredInviteRows = useMemo(
    () => filterInvitedRowsByName(inviteOnboardingRows, debouncedInvitedNameSearch),
    [inviteOnboardingRows, debouncedInvitedNameSearch]
  );

  const hasActiveNameSearch = Boolean(debouncedInvitedNameSearch.trim());
  const hasInvitedSourceRows = inviteOnboardingRows.length > 0;

  return (
    <DashboardPageShell>
      <OnboardingGate>
        <section className={CARD_STACK_CLASS}>
          {hasHrAccess ? (
            <div className={CARD_STACK_CLASS}>
              <HrOnboardForm
                formKey={onboardFormKey}
                form={onboardForm}
                setForm={setOnboardForm}
                options={onboardOptions}
                bands={onboardBands}
                hasHrAccess={hasHrAccess}
                actionLoading={formSubmitting}
                optionsLoading={optionsLoading}
                runAction={runFormAction}
                onError={handleOnboardFormError}
                onSubmitSuccess={async () => {
                  resetOnboardForm();
                  try {
                    await loadInviteOnboardingPreview();
                  } catch {
                    // Employee was created; list refresh failures should not hide success.
                  }
                }}
              />

              <ManagementListCard
                title="Invited Employees"
                description="Invited employees within the selected date range."
                headerAction={
                  <Button
                    variant="ghost"
                    type="button"
                    className="px-3 py-2"
                    onClick={() => void refreshInvitedList()}
                    disabled={invitedListLoading}
                  >
                    Refresh Employees
                  </Button>
                }
                search={
                  <SearchInput
                    id="invited-employees-search"
                    value={invitedNameSearch}
                    onChange={setInvitedNameSearch}
                    placeholder="Search by employee name"
                    aria-label="Search invited employees by name"
                    disabled={invitedListLoading}
                  />
                }
                filters={
                  <>
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
                        void refreshInvitedList({
                          from: invitedListFromDateRef.current,
                          to: invitedListToDateRef.current,
                        })
                      }
                      disabled={invitedListLoading}
                    >
                      Apply Dates
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      className="h-10 shrink-0 border border-wt-border bg-wt-surface-2 px-3 text-sm text-wt-text hover:bg-wt-surface-3"
                      onClick={() => {
                        const { from, to } = defaultInvitedEmployeesDateRange();
                        setInvitedListFromDate(from);
                        setInvitedListToDate(to);
                        void refreshInvitedList({ from, to });
                      }}
                      disabled={invitedListLoading}
                    >
                      Last 7 Days
                    </Button>
                  </>
                }
              >
                {invitedApiServerRange ? (
                  <p
                    className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
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
                  isEmpty={!invitedListLoading && !filteredInviteRows.length}
                  emptyTitle={
                    hasActiveNameSearch && hasInvitedSourceRows
                      ? "No invited employees match your search."
                      : "No invited employees in this date range."
                  }
                  emptyDescription={
                    hasActiveNameSearch && hasInvitedSourceRows
                      ? "Try a different name or clear the search."
                      : "Try adjusting your date range or refresh the list."
                  }
                  skeletonRows={8}
                  skeletonColumns={8}
                >
                  <InvitedEmployeesTable
                    rows={filteredInviteRows}
                    searchResetKey={debouncedInvitedNameSearch}
                    resendingEmail={resendingInviteEmail}
                    bulkResending={bulkResendingInvites}
                    onResendInvite={resendOnboardInvite}
                    onBulkResendInvite={resendOnboardInvitesBulk}
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
