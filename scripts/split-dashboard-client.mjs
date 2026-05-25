import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const pagePath = path.join(root, "app/(protected)/dashboard/page.tsx");
const lines = fs.readFileSync(pagePath, "utf8").split(/\r?\n/);

const newImports = `"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiClient, type ApiEnvelope } from "@/api/httpClient";
import { endpoints } from "@/api/endpoints";
import { hrmsService, type PagedData } from "@/services/hrms.service";
import { useOverviewData } from "@/hooks/useOverviewData";
import { ApiError } from "@/api/error";
import { useDashboardNav } from "@/components/dashboard/DashboardNavContext";
import { dashboardNavigation, filterVisibleNavigation } from "@/constants/dashboardNavigation";
import { toRows, toPagedRows } from "@/utils/apiRows";
import {
  formatActionErrorMessage,
  formatActionSuccessMessage,
  userRequestActionLabel,
} from "@/utils/actionToast";
import { AccountManagerSelect } from "@/components/allocation/AccountManagerSelect";
import { normalizePickerEmail } from "@/utils/learning/onboardOptions";
import { AttritionRetentionReports } from "@/components/reports/AttritionRetentionReports";
import {
  HARDCODED_DEPARTMENT_OPTIONS,
  MAX_ONBOARD_FILE_BYTES,
  MAX_ONBOARD_TOTAL_BYTES,
} from "@/constants/dashboard";
import {
  defaultInvitedEmployeesDateRange,
  filterInvitedRowsByCreatedAtRange,
  formatInvitedEmployeeTableRows,
  allocationAccManagerCell,
} from "@/utils/dashboard/invitedEmployees";
import {
  isValidPersonName,
  isValidIndiaMobile,
  resolveInternBandId,
  generateAutomaticProjectCode,
  designationAllowsFlexibleHours,
  FLEXIBLE_ALLOCATION_HOUR_OPTIONS,
  RESTRICTED_ALLOCATION_HOUR_OPTIONS,
  formatAllocatedHoursPercentLabel,
} from "@/utils/dashboard/validation";
import { applyTheme } from "@/utils/dashboard/theme";
import {
  isManagerFlagTruthy,
  isManagerRoleLabel,
  buildUserIdToNameMap,
  buildEmailToNameMap,
  enrichAllocationRowsForDisplay,
  normalizeForecastRows,
} from "@/utils/dashboard/allocationDisplay";
import {
  normalizeAssignedProjects,
  mergeProjectAndAllocationData,
  managerProjectCode,
  managerProjectName,
  managerTeamEmails,
  managerTeamRowsForProject,
} from "@/utils/dashboard/projects";
import { MetricCard } from "@/components/dashboard/ui/MetricCard";
import { InputField, SelectField, FileField, UploadTile } from "@/components/dashboard/ui/forms";
import {
  ProfilePhotoAvatar,
  ProfileField,
  formatSecondarySkillsForProfile,
} from "@/components/dashboard/ui/profile";
import { DataTable } from "@/components/dashboard/ui/DataTable";
import { IconUser, IconPencil, IconTrash, IconRefresh } from "@/components/dashboard/ui/icons";
import { AllocationExtensionPanel } from "@/components/dashboard/sections/AllocationExtensionPanel";
import { EmployeeAttendancePanel } from "@/components/dashboard/sections/EmployeeAttendancePanel";
`;

let body = lines.slice(245, 5881).join("\n");

body = body.replace(
  /function DashboardPageContent\(\) \{\n  const isManagerFlagTruthy[\s\S]*?const REQUEST_TYPE_ALIASES/,
  "export function DashboardPageClient() {\n  const REQUEST_TYPE_ALIASES"
);

body = body.replace(/\n  function applyTheme[\s\S]*?\n  \}\n\n  async function runAction/, "\n\n  async function runAction");

body = body.replace(
  /\n  function buildUserIdToNameMap[\s\S]*?\n  const availableOnboardRoles/,
  "\n  const availableOnboardRoles"
);

body = body.replace(
  /import \{ AllocationExtensionPanel \} from "@\/app\/\(protected\)\/dashboard\/AllocationExtensionPanel";\nimport \{ EmployeeAttendancePanel \} from "@\/app\/\(protected\)\/dashboard\/EmployeeAttendancePanel";/,
  ""
);

const clientFile = newImports + "\n\n" + body;

fs.mkdirSync(path.join(root, "components/dashboard"), { recursive: true });
fs.writeFileSync(path.join(root, "components/dashboard/DashboardPageClient.tsx"), clientFile);

const thinPage = `"use client";

import { Suspense } from "react";
import { DashboardPageClient } from "@/components/dashboard/DashboardPageClient";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-wt-bg text-sm text-wt-text-muted">
          Loading…
        </div>
      }
    >
      <DashboardPageClient />
    </Suspense>
  );
}
`;

fs.writeFileSync(pagePath, thinPage);

const sectionsDir = path.join(root, "components/dashboard/sections");
fs.mkdirSync(sectionsDir, { recursive: true });
for (const name of ["AllocationExtensionPanel.tsx", "EmployeeAttendancePanel.tsx"]) {
  const from = path.join(root, "app/(protected)/dashboard", name);
  const to = path.join(sectionsDir, name);
  if (fs.existsSync(from)) {
    let content = fs.readFileSync(from, "utf8");
    fs.writeFileSync(to, content);
    fs.unlinkSync(from);
  }
}

console.log("Done: DashboardPageClient.tsx + thin page.tsx + moved panels");
