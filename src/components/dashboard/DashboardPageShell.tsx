import type { ReactNode } from "react";

export function DashboardPageShell({ children }: { children: ReactNode }) {
  return <main className="min-h-0 flex-1 space-y-4 p-4 sm:p-6">{children}</main>;
}
