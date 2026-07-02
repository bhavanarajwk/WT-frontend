import type { ReactNode } from "react";
import { PAGE_STACK_CLASS } from "@/components/dashboard/ui/uiLayout";
import { cn } from "@/lib/utils";

export function DashboardPageShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "min-h-0 w-full min-w-0 flex-1 bg-wt-page-bg p-3 sm:p-4 md:p-6",
        PAGE_STACK_CLASS,
        className
      )}
    >
      {children}
    </main>
  );
}
