import dynamic from "next/dynamic";

const EmployeePageClient = dynamic(
  () =>
    import("@/components/dashboard/employee/EmployeePageClient").then(
      (mod) => mod.EmployeePageClient
    ),
  {
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-sm text-wt-text-muted">Loading employee workspace…</p>
      </div>
    ),
  }
);

export default function DashboardEmployeePage() {
  return <EmployeePageClient />;
}
