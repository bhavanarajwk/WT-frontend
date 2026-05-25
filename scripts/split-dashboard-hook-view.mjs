import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const clientPath = path.join(root, "components/dashboard/DashboardPageClient.tsx");
const src = fs.readFileSync(clientPath, "utf8");
const lines = src.split(/\r?\n/);

const importEnd = lines.findIndex((l) => l.startsWith("export function DashboardPageClient"));
const imports = lines.slice(0, importEnd).join("\n");

const fnStart = importEnd;
const renderPanelIdx = lines.findIndex((l) => l.trim().startsWith("const renderSelfOnboardingPanel"));
const logicLines = lines.slice(fnStart, renderPanelIdx);
const viewLines = lines.slice(renderPanelIdx, lines.length - 1); // drop closing brace of function

const hookFile =
  imports +
  "\nimport { createContext, useContext, type ReactNode } from \"react\";\n\n" +
  logicLines
    .join("\n")
    .replace(
      "export function DashboardPageClient() {",
      "export function useDashboardPageState() {"
    ) +
  "\n}\n\n" +
  `export type DashboardPageState = ReturnType<typeof useDashboardPageState>;

const DashboardPageContext = createContext<DashboardPageState | null>(null);

export function DashboardPageProvider({ children }: { children: ReactNode }) {
  const value = useDashboardPageState();
  return <DashboardPageContext.Provider value={value}>{children}</DashboardPageContext.Provider>;
}

export function useDashboardPage() {
  const ctx = useContext(DashboardPageContext);
  if (!ctx) throw new Error("useDashboardPage must be used within DashboardPageProvider");
  return ctx;
}
`;

const viewFile =
  `"use client";

import { useDashboardPage } from "@/components/dashboard/hooks/useDashboardPageState";
import { MetricCard } from "@/components/dashboard/ui/MetricCard";
import { InputField, SelectField, FileField, UploadTile } from "@/components/dashboard/ui/forms";
import {
  ProfilePhotoAvatar,
  ProfileField,
  formatSecondarySkillsForProfile,
} from "@/components/dashboard/ui/profile";
import { DataTable } from "@/components/dashboard/ui/DataTable";
import { IconUser, IconPencil, IconTrash, IconRefresh } from "@/components/dashboard/ui/icons";
import { AccountManagerSelect } from "@/components/allocation/AccountManagerSelect";
import { AttritionRetentionReports } from "@/components/reports/AttritionRetentionReports";
import {
  allocationAccManagerCell,
  filterInvitedRowsByCreatedAtRange,
  formatInvitedEmployeeTableRows,
} from "@/utils/dashboard/invitedEmployees";
import {
  designationAllowsFlexibleHours,
  FLEXIBLE_ALLOCATION_HOUR_OPTIONS,
  RESTRICTED_ALLOCATION_HOUR_OPTIONS,
  formatAllocatedHoursPercentLabel,
  generateAutomaticProjectCode,
  isValidIndiaMobile,
  isValidPersonName,
  MAX_ONBOARD_FILE_BYTES,
  MAX_ONBOARD_TOTAL_BYTES,
} from "@/utils/dashboard/validation";
import { HARDCODED_DEPARTMENT_OPTIONS } from "@/constants/dashboard";
import { AllocationExtensionPanel } from "@/components/dashboard/sections/AllocationExtensionPanel";
import { EmployeeAttendancePanel } from "@/components/dashboard/sections/EmployeeAttendancePanel";
import { hrmsService } from "@/services/hrms.service";
import { apiClient } from "@/api/httpClient";
import { endpoints } from "@/api/endpoints";
import { toRows, toPagedRows } from "@/utils/apiRows";
import { userRequestActionLabel } from "@/utils/actionToast";
import { ApiError } from "@/api/error";
import { normalizePickerEmail } from "@/utils/learning/onboardOptions";
import { isManagerFlagTruthy, isManagerRoleLabel } from "@/utils/dashboard/allocationDisplay";

export function DashboardMainView() {
  const state = useDashboardPage();
  const {
` +
  // inject destructuring - use spread by assigning state to shorthand
  `    ...state
  } = { state };
  void state;
` +
  viewLines
    .join("\n")
    .replace(/^  /gm, "  ")
    .replace(/setOnboardForm\(\(p\)/g, "state.setOnboardForm((p)")
    // This won't work - view uses direct variable names from closure
  ;

// Simpler: view uses hook return directly via destructuring at top
const viewBody = viewLines.join("\n");
const viewFileSimple =
  `"use client";

` +
  imports.replace(/import \{ useCallback[\s\S]*?from "react";\n/, 'import { useDashboardPage } from "@/components/dashboard/hooks/useDashboardPageState";\n') +
  `

export function DashboardMainView() {
` +
  viewBody +
  "\n}\n";

// viewBody still references outer scope vars - must destructure ALL from useDashboardPage at start
// Too fragile. Keep monolithic client but add section files that import useDashboardPage for ONE tab each.

fs.mkdirSync(path.join(root, "components/dashboard/hooks"), { recursive: true });
fs.writeFileSync(path.join(root, "components/dashboard/hooks/useDashboardPageState.tsx"), hookFile);

const thinClient = `${imports}

import { DashboardPageProvider } from "@/components/dashboard/hooks/useDashboardPageState";
import { DashboardMainView } from "@/components/dashboard/DashboardMainView";

export function DashboardPageClient() {
  return (
    <DashboardPageProvider>
      <DashboardMainView />
    </DashboardPageProvider>
  );
}
`;

// For MainView - copy full client and replace function start with hook destructuring
let mainView = src;
const hookNames = []; // skip auto destructure

mainView = mainView.replace(
  "export function DashboardPageClient() {",
  `export function DashboardMainView() {
  const ctx = useDashboardPage();
`
);

// Replace all const/state references - impossible automatically

console.log("Hook file written. MainView manual merge required.");
console.log("Hook lines:", logicLines.length, "View lines:", viewLines.length);
