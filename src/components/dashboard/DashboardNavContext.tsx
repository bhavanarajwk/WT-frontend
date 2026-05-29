"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  accordionSectionForPathname,
  type AccordionSectionId,
} from "@/constants/dashboardNavigation";
import { dashboardNavIdFromPathname } from "@/constants/routes";

type DashboardNavContextValue = {
  /** Derived from current pathname (no ?tab=). */
  activeSection: string;
  expandedSection: AccordionSectionId | null;
  setExpandedSection: React.Dispatch<React.SetStateAction<AccordionSectionId | null>>;
  toggleExpandedSection: (section: AccordionSectionId) => void;
};

const DashboardNavContext = createContext<DashboardNavContextValue | null>(null);

export function DashboardNavProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activeSection = useMemo(() => dashboardNavIdFromPathname(pathname), [pathname]);
  const routeSection = useMemo(
    () => accordionSectionForPathname(pathname, activeSection),
    [pathname, activeSection]
  );
  const [expandedSection, setExpandedSection] = useState<AccordionSectionId | null>(
    () => routeSection
  );

  useEffect(() => {
    if (routeSection) setExpandedSection(routeSection);
  }, [routeSection]);

  const toggleExpandedSection = (section: AccordionSectionId) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const value = useMemo(
    () => ({
      activeSection,
      expandedSection,
      setExpandedSection,
      toggleExpandedSection,
    }),
    [activeSection, expandedSection]
  );

  return <DashboardNavContext.Provider value={value}>{children}</DashboardNavContext.Provider>;
}

export function useDashboardNav() {
  const ctx = useContext(DashboardNavContext);
  if (!ctx) throw new Error("useDashboardNav must be used within DashboardNavProvider");
  return ctx;
}
