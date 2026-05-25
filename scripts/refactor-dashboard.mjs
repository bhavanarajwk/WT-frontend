/**
 * One-time refactor: split app/(protected)/dashboard/page.tsx into modular structure.
 */
import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const pagePath = path.join(root, "app/(protected)/dashboard/page.tsx");
const src = fs.readFileSync(pagePath, "utf8");
const lines = src.split(/\r?\n/);

const preambleEnd = 244; // before DashboardPageContent
const contentStart = 245; // line 246 function DashboardPageContent
const contentEnd = 5866; // before export default
const postambleStart = 5882; // MetricCard etc.

const preamble = lines.slice(0, preambleEnd).join("\n");
const contentBody = lines.slice(contentStart, contentEnd).join("\n");
const postamble = lines.slice(postambleStart).join("\n");

// --- constants ---
const constantsBlock = lines.slice(24, 42).join("\n");
fs.mkdirSync(path.join(root, "components/dashboard"), { recursive: true });
fs.writeFileSync(
  path.join(root, "components/dashboard/constants.ts"),
  constantsBlock.replace(/^const /gm, "export const ") + "\n"
);

// --- lib: invited (lines 110-244 except allocation helpers) ---
const invitedUtils = `export const INVITED_LIST_DEFAULT_DAYS = 7;

export function formatDateInputYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return \`\${y}-\${m}-\${d}\`;
}

export function defaultInvitedEmployeesDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - INVITED_LIST_DEFAULT_DAYS);
  return { from: formatDateInputYmd(from), to: formatDateInputYmd(to) };
}

export function invitedRowCreatedAtYmd(row: Record<string, unknown>): string | null {
  const raw = String(row.created_at ?? row.createdAt ?? "").trim();
  if (!raw) return null;
  return raw.includes("T") ? raw.slice(0, 10) : raw.slice(0, 10);
}

export function filterInvitedRowsByCreatedAtRange(
  rows: Array<Record<string, unknown>>,
  from: string,
  to: string
): Array<Record<string, unknown>> {
  return rows.filter((row) => {
    const day = invitedRowCreatedAtYmd(row);
    if (!day) return false;
    return day >= from && day <= to;
  });
}

export function formatInvitedEmployeeTableRows(
  rows: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  return rows.map((row) => {
    const createdRaw = String(row.created_at ?? row.createdAt ?? "").trim();
    const createdDisplay = createdRaw
      ? createdRaw.includes("T")
        ? createdRaw.slice(0, 10)
        : createdRaw.slice(0, 19)
      : "—";
    return { ...row, created_at: createdDisplay };
  });
}

export function allocationAccManagerCell(row: Record<string, unknown>): string {
  const v =
    row.acc_manager ??
    row.accManager ??
    row.account_manager ??
    row.accountManager ??
    row.account_mgr ??
    row.accountMgr;
  const s = String(v ?? "").trim();
  return s || "—";
}
`;

fs.mkdirSync(path.join(root, "src/lib/dashboard"), { recursive: true });
fs.writeFileSync(path.join(root, "src/lib/dashboard/invitedEmployees.ts"), invitedUtils);

const validationUtils = `export function isValidPersonName(name: string): boolean {
  const t = name.trim();
  if (t.length < 2 || t.length > 120) return false;
  return /^[a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ\\s.'-]*$/u.test(t);
}

export function bandNameMatchKey(name: string): string {
  return name.trim().toUpperCase().replace(/[\\s\\-_–—]+/g, "");
}

export function resolveInternBandId(bands: Array<Record<string, unknown>>): number {
  const internHit = bands.find((row) => {
    const name = String(row.name ?? row.band_name ?? "").trim();
    return name.length > 0 && bandNameMatchKey(name) === "B8INTERN";
  });
  const internId = internHit?.id != null ? Number(internHit.id) : NaN;
  if (Number.isFinite(internId) && internId > 0) return internId;

  const genericB8 = bands.find(
    (row) => bandNameMatchKey(String(row.name ?? row.band_name ?? "")) === "B8"
  );
  const genericId = genericB8?.id != null ? Number(genericB8.id) : NaN;
  return Number.isFinite(genericId) && genericId > 0 ? genericId : 8;
}

export function isValidIndiaMobile(phone: string): boolean {
  const d = phone.replace(/[\\s-]/g, "");
  if (!d) return false;
  return /^(\\+91)?[6-9]\\d{9}$/.test(d);
}

export function generateAutomaticProjectCode(): string {
  const part = \`\${Date.now()}\`.slice(-6);
  return \`P00\${part}\`;
}

export function designationAllowsFlexibleHours(designation: string): boolean {
  const r = designation.trim().toLowerCase();
  if (!r) return false;
  return (
    r.includes("design") ||
    r.includes("devops") ||
    r.includes("project manager") ||
    r.includes("delivery manager") ||
    /\\bpm\\b/.test(r) ||
    /\\bdm\\b/.test(r) ||
    r.includes("chief") ||
    r.includes("ceo") ||
    r.includes("cto") ||
    r.includes("cfo") ||
    r.includes("coo") ||
    r.includes("c-suite") ||
    r.includes("csuite") ||
    r.includes("c suite") ||
    r.includes("chair")
  );
}

export const FLEXIBLE_ALLOCATION_HOUR_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;
export const RESTRICTED_ALLOCATION_HOUR_OPTIONS = ["4", "8"] as const;

export function formatAllocatedHoursPercentLabel(hoursRaw: unknown): string {
  const raw = String(hoursRaw ?? "").trim();
  if (!raw || raw === "—") return "—";
  const n = Number.parseFloat(raw.replace(/[^\\d.-]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return raw;
  const pct = Math.min(100, Math.round((n / 8) * 100));
  return \`\${pct}% (\${n}h)\`;
}
`;

fs.writeFileSync(path.join(root, "src/lib/dashboard/validation.ts"), validationUtils);

// icons from lines 44-108
const iconsSrc = lines.slice(43, 108).join("\n");
fs.mkdirSync(path.join(root, "components/dashboard/ui"), { recursive: true });
fs.writeFileSync(
  path.join(root, "components/dashboard/ui/icons.tsx"),
  iconsSrc.replace(/^function Icon/gm, "export function Icon")
);

// postamble -> ui files
fs.writeFileSync(
  path.join(root, "components/dashboard/ui/MetricCard.tsx"),
  postamble.split("function InputField")[0].trim() + "\n"
);
const formsAndRest = "function InputField" + postamble.split("function InputField")[1];
const dataTableSplit = formsAndRest.split("function DataTable");
fs.writeFileSync(
  path.join(root, "components/dashboard/ui/forms.tsx"),
  `"use client";\n\n${dataTableSplit[0].trim()}\n`.replace(/^function /gm, "export function ")
);
fs.writeFileSync(
  path.join(root, "components/dashboard/ui/profile.tsx"),
  `"use client";\n\nimport { useState } from "react";\n\n${dataTableSplit[1].split("function DataTable")[0].trim()}\n`.replace(
    /^function /gm,
    "export function "
  )
);
fs.writeFileSync(
  path.join(root, "components/dashboard/ui/DataTable.tsx"),
  `"use client";\n\nexport ${dataTableSplit[1].trim()}\n`
);

// theme helper from content
fs.writeFileSync(
  path.join(root, "src/lib/dashboard/theme.ts"),
  `export function applyTheme(nextTheme: "light" | "dark" | "system") {
  const root = document.documentElement;
  if (nextTheme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-theme", prefersDark ? "dark" : "light");
  } else {
    root.setAttribute("data-theme", nextTheme);
  }
  window.localStorage.setItem("wt-theme", nextTheme);
}
`
);

// Extract allocation/manager helpers from content (lines 1108-1512 in original, offset in contentBody)
// We'll strip them from hook and import from lib - done in transform below

const hookImports = `"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// Transform contentBody: rename function to hook, remove inner helper functions we'll extract
let hookBody = contentBody
  .replace("function DashboardPageContent()", "export function useDashboardPage()")
  .replace(/  function applyTheme[\s\S]*?  }\n\n  async function runAction/, "  async function runAction");

// Remove helper blocks (buildUserIdToNameMap through managerTeamRowsForProject)
hookBody = hookBody.replace(
  /  function buildUserIdToNameMap[\s\S]*?  }\n\n  const availableOnboardRoles/,
  "  const availableOnboardRoles"
);

// Find render section
const returnIdx = hookBody.indexOf("  return (");
const logicPart = hookBody.slice(0, returnIdx);
const renderPart = hookBody.slice(returnIdx);

fs.mkdirSync(path.join(root, "components/dashboard/hooks"), { recursive: true });
fs.writeFileSync(
  path.join(root, "components/dashboard/hooks/useDashboardPage.tsx"),
  hookImports + "\n" + logicPart + "\n  return {\n    render: () => (\n" + renderPart.replace(/^  return \(/, "") + "\n    ),\n  };\n}\n"
);

console.log("Refactor script: base files written. Manual allocationDisplay + projects + sections + page still needed.");
