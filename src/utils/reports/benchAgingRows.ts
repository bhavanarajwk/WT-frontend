/** Headcount for the bench report (API total + investment-only rows not in bench-aging). */
export function countPeopleOnBench(
  benchAgingRows: Array<Record<string, unknown>>,
  mergedRows: Array<Record<string, unknown>>,
  totalElements: number | null
): number {
  const investmentOnlyCount = Math.max(0, mergedRows.length - benchAgingRows.length);
  if (totalElements != null) return totalElements + investmentOnlyCount;
  return mergedRows.length;
}

/** Merge GET bench-aging rows with INVESTMENT allocations for the bench report table. */
export function mergeBenchAgingWithInvestment(
  benchAgingRows: Array<Record<string, unknown>>,
  allocations: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  const seen = new Set(
    benchAgingRows.map((r) => String(r.email ?? "").trim().toLowerCase()).filter(Boolean)
  );
  const extras: Array<Record<string, unknown>> = [];
  for (const row of allocations) {
    if (String(row.billing_status ?? row.billingStatus ?? "").toUpperCase() !== "INVESTMENT") {
      continue;
    }
    const email = String(
      row.employee_email ?? row.email ?? row.user_email ?? row.userEmail ?? ""
    )
      .trim()
      .toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    extras.push({
      emp_id: String(row.emp_id ?? row.employee_id ?? row.employeeId ?? row.id ?? "—"),
      email,
      name: String(row.employee_name ?? row.name ?? "—"),
      department: String(row.department ?? row.role ?? row.designation ?? "—"),
      bench_days: "Investment allocation",
    });
  }
  return [...benchAgingRows, ...extras];
}
