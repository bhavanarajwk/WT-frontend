"use client";

import { useEffect, useMemo, useState } from "react";
import { SelectField } from "@/components/dashboard/ui/forms";
import { useAllocationProjectEmployees } from "@/hooks/useAllocationProjectEmployees";
import { hrmsService } from "@/services/hrms.service";
import { normalizePickerEmail } from "@/utils/learning/onboardOptions";
import { isHrCreatedProjectCode } from "@/utils/projectPicker";

type Props = {
  projects: Array<{ code: string; name: string; id?: number }>;
  actionLoading: boolean;
  runAction: (label: string, fn: () => Promise<void>) => void;
  /** Pre-fill after a successful allocation (optional). */
  prefill?: { projectCode?: string; userEmail?: string };
};

export function AssignProjectManagerPanel({
  projects,
  actionLoading,
  runAction,
  prefill,
}: Props) {
  const [projectKey, setProjectKey] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [resolvedProjectCode, setResolvedProjectCode] = useState("");

  useEffect(() => {
    if (!prefill) return;
    if (prefill.projectCode) {
      setProjectKey(prefill.projectCode.trim());
      setResolvedProjectCode(prefill.projectCode.trim());
    }
    if (prefill.userEmail) setUserEmail(prefill.userEmail.trim().toLowerCase());
  }, [prefill?.projectCode, prefill?.userEmail]);

  const benchOrGlobal = ["BENCH", "GLOBAL"].includes(
    (resolvedProjectCode || projectKey).trim().toUpperCase()
  );
  const {
    data: projectEmployeesResult,
    isLoading: employeesLoading,
    isError: employeesError,
    isFetching: employeesFetching,
  } = useAllocationProjectEmployees(projectKey, !benchOrGlobal);

  const projectEmployees = projectEmployeesResult?.employees ?? [];

  useEffect(() => {
    const code = projectEmployeesResult?.meta.projectCode?.trim();
    if (code) setResolvedProjectCode(code);
  }, [projectEmployeesResult?.meta.projectCode]);

  const employeeOptions = useMemo(
    () =>
      projectEmployees.map((emp) => ({
        value: emp.employeeEmail,
        label: `${emp.employeeName} (${emp.employeeEmail})`,
      })),
    [projectEmployees]
  );

  useEffect(() => {
    if (!userEmail) return;
    if (!employeeOptions.some((o) => o.value === userEmail)) {
      setUserEmail("");
    }
  }, [employeeOptions, userEmail]);

  const projectOptions = useMemo(
    () =>
      projects
        .filter((p) => p.code.trim() && isHrCreatedProjectCode(p.code))
        .map((p) => ({
          value: p.code.trim(),
          label: p.name.trim() || p.code.trim(),
        })),
    [projects]
  );

  const submitProjectCode = resolvedProjectCode.trim() || projectKey.trim();

  const employeePlaceholder = (() => {
    if (!projectKey.trim()) return "Select a project first";
    if (employeesLoading || employeesFetching) return "Loading allocated employees…";
    if (employeesError) return "Could not load employees";
    if (!employeeOptions.length) return "No allocations on this project";
    return "Select allocated employee";
  })();

  return (
    <div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-5 space-y-4">
      <h3 className="font-semibold">Assign project manager</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <SelectField
          label="Project"
          required
          value={projectKey}
          placeholder="Select project"
          options={projectOptions}
          onChange={(v) => {
            const next = v.trim();
            setProjectKey(next);
            setResolvedProjectCode(next);
            setUserEmail("");
          }}
        />
        <SelectField
          label="Employee"
          required
          value={userEmail}
          placeholder={employeePlaceholder}
          options={
            employeesLoading || employeesFetching
              ? [{ value: "", label: employeePlaceholder }]
              : employeesError
                ? [{ value: "", label: employeePlaceholder }]
                : employeeOptions.length
                  ? employeeOptions
                  : [{ value: "", label: employeePlaceholder }]
          }
          disabled={
            !projectKey.trim() ||
            benchOrGlobal ||
            employeesLoading ||
            employeesFetching ||
            employeesError ||
            !employeeOptions.length
          }
          onChange={(v) => setUserEmail(v.trim().toLowerCase())}
        />
      </div>
      {employeesError ? (
        <p className="text-sm text-rose-700">
          Could not load employees for this project. Check network for{" "}
          <span className="font-mono text-xs">GET /allocation/project-employees</span>.
        </p>
      ) : null}
      {benchOrGlobal ? (
        <p className="text-sm text-amber-700">
          Project manager cannot be assigned on BENCH or GLOBAL projects.
        </p>
      ) : null}
      <button
        type="button"
        className="btn-primary px-3 py-2 text-sm"
        disabled={
          actionLoading ||
          !projectKey.trim() ||
          !submitProjectCode ||
          !userEmail ||
          benchOrGlobal ||
          employeesLoading ||
          !employeeOptions.length
        }
        onClick={() =>
          runAction("Assign project manager", async () => {
            const email = normalizePickerEmail(userEmail);
            const code = submitProjectCode;
            if (!email) throw new Error("Select a valid employee email.");
            if (!code) throw new Error("Select a project.");
            await hrmsService.assignProjectManager({
              userEmail: email,
              projectCode: code,
            });
          })
        }
      >
        Assign project manager
      </button>
    </div>
  );
}
