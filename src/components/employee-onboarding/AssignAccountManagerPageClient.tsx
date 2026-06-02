"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { DASHBOARD_ROUTES } from "@/constants/routes";
import { useEmployeeDirectoryList } from "@/hooks/employee-directory/useEmployeeDirectoryList";
import { hrmsService } from "@/services/hrms.service";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { SelectField } from "@/components/dashboard/ui/forms";
import { DashboardToast } from "@/components/dashboard/shared/DashboardToast";
import { useDashboardAction } from "@/components/dashboard/shared/useDashboardAction";
import { EmployeeOnboardingSubNav } from "@/components/employee-onboarding/EmployeeOnboardingSubNav";
import {
  cleanEmployeeName,
  rowEmail,
  rowEmpId,
} from "@/utils/employeeDirectory";
import { isAccountManagerOnboardRow } from "@/utils/learning/onboardOptions";

export function AssignAccountManagerPageClient() {
  const { user, status: authStatus } = useAuth();
  const { toast, actionLoading, runAction } = useDashboardAction();
  const userRoles = user?.roles ?? [];
  const hasHrAccess = userRoles.includes("ROLE_HR") || userRoles.includes("ROLE_ADMIN");
  const { data: rows = [], isLoading, isError, error, refetch } = useEmployeeDirectoryList({
    enabled: authStatus === "authenticated" && hasHrAccess,
  });
  const [selectedEmpId, setSelectedEmpId] = useState("");

  const options = useMemo(() => {
    return rows
      .map((row) => {
        const record = row as unknown as Record<string, unknown>;
        const empId = rowEmpId(record);
        const email = rowEmail(record);
        if (!empId || !email) return null;
        const name = cleanEmployeeName(record);
        const isAm = isAccountManagerOnboardRow(record);
        return { empId, email, name, isAm, record };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const selected = options.find((o) => o.empId === selectedEmpId);

  const assignAccountManager = () => {
    if (!selected?.email) return;
    void runAction("Assign account manager role", async () => {
      await hrmsService.assignRole({
        target_email: selected.email,
        role: "ROLE_AM",
      });
      setSelectedEmpId("");
      await refetch();
    });
  };

  if (authStatus === "loading") {
    return (
      <DashboardPageShell>
        <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-8 text-sm text-wt-text-muted shadow-sm">
          Loading…
        </div>
      </DashboardPageShell>
    );
  }

  if (!hasHrAccess) {
    return (
      <DashboardPageShell>
        <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-8 shadow-sm">
          <h3 className="text-lg font-semibold">Access restricted</h3>
          <p className="mt-2 text-sm text-wt-text-muted">Only HR users can assign account managers.</p>
          <Link href={DASHBOARD_ROUTES.overview} className="mt-4 inline-block text-sm text-blue-600 hover:underline">
            Back to overview
          </Link>
        </div>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell>
      <DashboardToast toast={toast} />
      <div className="rounded-2xl border border-wt-border bg-wt-surface-1 shadow-sm">
        <div className="p-5 md:p-7">
          <EmployeeOnboardingSubNav />
          <h3 className="text-lg font-semibold">Assign account manager</h3>

          {isLoading ? <p className="mt-6 text-sm text-wt-text-muted">Loading employees…</p> : null}

          {isError ? (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              Could not load employees.{error instanceof Error ? ` ${error.message}` : ""}
              <button type="button" className="btn-ghost mt-3 px-3 py-1.5 text-xs" onClick={() => void refetch()}>
                Retry
              </button>
            </div>
          ) : null}

          {!isLoading && !isError ? (
            <div className="mt-6 max-w-xl space-y-4">
              <SelectField
                label="Employee"
                required
                value={selectedEmpId}
                onChange={setSelectedEmpId}
                placeholder="Select an employee…"
                options={options.map((opt) => ({
                  value: opt.empId,
                  label: `${opt.name} (${opt.email})${opt.isAm ? " — already AM" : ""}`,
                }))}
              />

              {selected ? (
                <div className="rounded-lg border border-wt-border bg-wt-surface-2/50 p-4 text-sm">
                  <p>
                    <span className="text-wt-text-muted">Employee ID:</span> {selected.empId}
                  </p>
                  <p className="mt-1">
                    <span className="text-wt-text-muted">Email:</span> {selected.email}
                  </p>
                  {selected.isAm ? (
                    <p className="mt-2 text-amber-700">
                      This employee is already tagged as an account manager.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <button
                type="button"
                className="btn-primary px-4 py-2.5 text-sm"
                disabled={!selected?.email || actionLoading}
                onClick={assignAccountManager}
              >
                Assign
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </DashboardPageShell>
  );
}
