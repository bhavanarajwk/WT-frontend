"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { dashboardNavIdFromPathname } from "@/constants/routes";

type DashboardNavContextValue = {
  /** Derived from current pathname (no ?tab=). */
  activeSection: string;
  reportsExpanded: boolean;
  setReportsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  learningExpanded: boolean;
  setLearningExpanded: React.Dispatch<React.SetStateAction<boolean>>;
};

const DashboardNavContext = createContext<DashboardNavContextValue | null>(null);

export function DashboardNavProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activeSection = useMemo(() => dashboardNavIdFromPathname(pathname), [pathname]);
  const [reportsExpanded, setReportsExpanded] = useState(() =>
    activeSection.startsWith("reports-")
  );
  const [learningExpanded, setLearningExpanded] = useState(true);

  const value = useMemo(
    () => ({
      activeSection,
      reportsExpanded,
      setReportsExpanded,
      learningExpanded,
      setLearningExpanded,
    }),
    [activeSection, reportsExpanded, learningExpanded]
  );

  return <DashboardNavContext.Provider value={value}>{children}</DashboardNavContext.Provider>;
}

export function useDashboardNav() {
  const ctx = useContext(DashboardNavContext);
  if (!ctx) throw new Error("useDashboardNav must be used within DashboardNavProvider");
  return ctx;
}
