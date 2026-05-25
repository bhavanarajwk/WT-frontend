import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");

const SHARED_IMPORTS = `
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
  buildProjectCodeDisplayMap,
  enrichAllocationRowsForDisplay,
  normalizeForecastRows,
  allocationRowEmail,
  allocationProjectCode,
  allocationProjectTitleFromRow,
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
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { OnboardingGate } from "@/components/dashboard/shared/OnboardingGate";
import { useDashboardAccess } from "@/components/dashboard/shared/useDashboardAccess";
import { useDashboardAction } from "@/components/dashboard/shared/useDashboardAction";
import { DashboardToast } from "@/components/dashboard/shared/DashboardToast";
`.trim();

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith("PageClient.tsx")) out.push(p);
  }
  return out;
}

for (const filePath of walk(path.join(root, "components/dashboard"))) {
  if (filePath.includes("allocation-extension") || filePath.includes("employee-attendance")) {
    continue;
  }
  let content = fs.readFileSync(filePath, "utf8");
  if (content.includes('from "@/utils/dashboard/allocationDisplay"')) {
    continue;
  }
  const anchor = 'import { AttritionRetentionReports } from "@/components/reports/AttritionRetentionReports";';
  if (!content.includes(anchor)) {
    console.warn("skip (no anchor):", filePath);
    continue;
  }
  content = content.replace(anchor, `${anchor}\n${SHARED_IMPORTS}\n`);
  // Remove duplicate mid-file shell imports from patch scripts
  content = content.replace(
    /\nimport \{ DashboardPageShell \} from "@\/components\/dashboard\/DashboardPageShell";\nimport \{ OnboardingGate \} from "@\/components\/dashboard\/shared\/OnboardingGate";\n\n/g,
    "\n"
  );
  fs.writeFileSync(filePath, content);
  console.log("patched", filePath);
}
