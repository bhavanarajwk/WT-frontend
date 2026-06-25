import type { ReactNode } from "react";

export function DashboardPageShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={`min-h-0 flex-1 space-y-4 bg-wt-page-bg p-4 sm:p-6 ${className}`.trim()}>{children}</main>
  );
}
