"use client";

import { useCallback, useState } from "react";
import { hrmsService } from "@/services/hrms.service";
import { toPagedRows } from "@/utils/apiRows";
import { listScopedUserRequests } from "@/utils/userRequest";

function buildEmailToNameMap(users: Array<Record<string, unknown>>) {
  const map: Record<string, string> = {};
  for (const u of users) {
    const email = String(u.email ?? u.user_email ?? u.userEmail ?? "").trim().toLowerCase();
    const name = String(u.name ?? u.employee_name ?? u.employeeName ?? "").trim();
    if (email && name) map[email] = name;
  }
  return map;
}

function requestRowEmail(row: Record<string, unknown>): string {
  return String(
    row.emp_email ??
      row.empEmail ??
      row.email ??
      row.user_email ??
      row.userEmail ??
      row.employee_email ??
      row.employeeEmail ??
      row.requested_by ??
      row.requestedBy ??
      ""
  )
    .trim()
    .toLowerCase();
}

async function enrichWfhRowsWithEmployeeNames(
  rows: Array<Record<string, unknown>>
): Promise<Array<Record<string, unknown>>> {
  const onboardRes = await hrmsService.getOnboardList({ page: "0", size: "200" });
  const onboardRows = toPagedRows(onboardRes.data ?? onboardRes);
  const emailToName = buildEmailToNameMap(onboardRows);

  const unresolvedEmails = [
    ...new Set(
      rows
        .map((row) => requestRowEmail(row))
        .filter((email) => Boolean(email) && !emailToName[email])
    ),
  ];

  await Promise.all(
    unresolvedEmails.map(async (email) => {
      try {
        const userRes = await hrmsService.getUser({ email });
        const payload = ((userRes as { data?: unknown }).data ?? userRes) as
          | Record<string, unknown>
          | null;
        if (!payload || typeof payload !== "object") return;
        const nested =
          (payload.user as Record<string, unknown> | undefined)?.name ??
          (payload.profile as Record<string, unknown> | undefined)?.name;
        const name = String(payload.name ?? nested ?? "").trim();
        if (name) emailToName[email] = name;
      } catch {
        /* ignore lookup misses */
      }
    })
  );

  return rows.map((row) => {
    const email = requestRowEmail(row);
    const nameFromRow = String(
      row.name ?? row.employee_name ?? row.employeeName ?? row.employee_display ?? ""
    ).trim();
    const employee_display =
      nameFromRow || (email && emailToName[email]) || email || "—";
    return { ...row, employee_display };
  });
}

export type HrWfhRequestFilters = {
  fromDate: string;
  toDate: string;
};

export function defaultHrWfhRequestFilters(): HrWfhRequestFilters {
  const today = new Date();
  const future = new Date(today);
  future.setFullYear(future.getFullYear() + 2);
  return {
    fromDate: `${today.getFullYear()}-01-01`,
    toDate: future.toISOString().slice(0, 10),
  };
}

export function useHrWfhRequests() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<HrWfhRequestFilters>(() => defaultHrWfhRequestFilters());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fetched = await listScopedUserRequests({
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        requestType: "WFH",
        size: 500,
      });
      const wfhOnly = fetched.filter(
        (row) => String(row.request_type ?? row.requestType ?? "").trim().toUpperCase() === "WFH"
      );
      const enriched = await enrichWfhRowsWithEmployeeNames(wfhOnly);
      setRows(enriched);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filters.fromDate, filters.toDate]);

  return { rows, loading, filters, setFilters, load };
}
