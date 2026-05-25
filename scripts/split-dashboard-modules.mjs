/**
 * Splits DashboardPageClient into per-module PageClient files.
 */
import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const srcPath = path.join(root, "components/dashboard/DashboardPageClient.tsx");
const src = fs.readFileSync(srcPath, "utf8");
const lines = src.split(/\r?\n/);

const fnStart = lines.findIndex((l) => l.includes("export function DashboardPageClient"));
const renderHelpersStart = lines.findIndex((l) => l.trim().startsWith("const renderSelfOnboardingPanel"));
const returnStart = lines.findIndex((l) => l.trim() === "return (");
const fnEnd = lines.findIndex((l, i) => i > returnStart && l === "}");

const imports = lines.slice(0, fnStart).join("\n");
const logicBlock = lines.slice(fnStart + 1, renderHelpersStart).join("\n");
const renderHelpers = lines.slice(renderHelpersStart, returnStart).join("\n");
const returnBlock = lines.slice(returnStart + 1, fnEnd).join("\n");

const MODULES = [
  { id: "overview", component: "OverviewPageClient", start: '{activeTab === "overview"', end: '{activeTab === "profile"' },
  { id: "profile", component: "ProfilePageClient", start: '{activeTab === "profile"', end: '{activeTab === "employee"', helpers: true },
  { id: "employee", component: "EmployeePageClient", start: '{activeTab === "employee"', end: '{activeTab === "allocation"' },
  { id: "allocation", component: "AllocationPageClient", start: '{activeTab === "allocation"', end: '{activeTab === "allocation-extension"' },
  { id: "allocation-extension", component: "AllocationExtensionPageClient", start: '{activeTab === "allocation-extension"', end: '{activeTab === "employee-attendance"' },
  { id: "employee-attendance", component: "EmployeeAttendancePageClient", start: '{activeTab === "employee-attendance"', end: '{activeTab === "timelog"' },
  { id: "timelog", component: "TimelogPageClient", start: '{activeTab === "timelog"', end: '{activeTab === "leave"' },
  { id: "leave", component: "LeavePageClient", start: '{activeTab === "leave"', end: '{activeTab === "offboarding"' },
  { id: "offboarding", component: "OffboardingPageClient", start: '{activeTab === "offboarding"', end: '{activeTab === "background-verification"' },
  { id: "background-verification", component: "BackgroundVerificationPageClient", start: '{activeTab === "background-verification"', end: '{activeTab.startsWith("reports-")' },
  { id: "reports", component: "ReportsPageClient", start: '{activeTab.startsWith("reports-")', end: '{activeTab === "uploads"' },
  { id: "uploads", component: "UploadsPageClient", start: '{activeTab === "uploads"', end: '{activeTab === "masters"' },
  { id: "masters", component: "MastersPageClient", start: '{activeTab === "masters"', end: "</main>" },
];

function extractJsx(startMarker, endMarker) {
  const startIdx = returnBlock.indexOf(startMarker);
  if (startIdx < 0) return "";
  const endIdx = returnBlock.indexOf(endMarker, startIdx + 1);
  const chunk = endIdx < 0 ? returnBlock.slice(startIdx) : returnBlock.slice(startIdx, endIdx);
  return chunk
    .replace(/\{activeTab === "[^"]+" && /g, "")
    .replace(/\{activeTab\.startsWith\("reports-"\) && /g, "")
    .replace(/ && !requiresSelfOnboarding && hasHrAccess \? \(/g, " ? (")
    .replace(/ && !requiresSelfOnboarding \? \(/g, " ? (")
    .replace(/ && canAccessOverview && !requiresSelfOnboarding \? \(/g, " ? (")
    .replace(/ && canAccessProfile \? \(/g, " ? (")
    .replace(/ && hasHrAccess \? \(/g, " ? (")
    .replace(/ : null\}\s*$/gm, "")
    .trim();
}

function stripActiveTabGuards(code, moduleId) {
  let out = code;
  // Remove effects guarded for other tabs — keep lines that match this module or have no activeTab
  const effectBlocks = out.split(/\n  useEffect\(/);
  const kept = [effectBlocks[0]];
  for (let i = 1; i < effectBlocks.length; i++) {
    const block = effectBlocks[i];
    const full = "  useEffect(" + block;
    if (!full.includes("activeTab")) {
      kept.push(block);
      continue;
    }
    const tabChecks = [...full.matchAll(/activeTab\s*!==?\s*["']([^"']+)["']/g)];
    const startsWith = full.includes('activeTab.startsWith("reports-")');
    let keep = false;
    if (moduleId === "reports" && (startsWith || tabChecks.some((m) => m[1].startsWith("reports-")))) {
      keep = true;
    }
    for (const m of tabChecks) {
      if (m[1] === moduleId || (moduleId === "reports" && m[1].startsWith("reports-"))) {
        keep = true;
      }
    }
    if (full.includes(`activeTab === "${moduleId}"`) || (moduleId === "reports" && full.includes("reports-"))) {
      keep = true;
    }
    if (keep) {
      let cleaned = full;
      cleaned = cleaned.replace(new RegExp(`\\s*if \\(activeTab !== "${moduleId}"\\) return;\\n`, "g"), "\n");
      cleaned = cleaned.replace(/\s*if \(activeTab !== "reports-[^"]+"[^)]*\) return;\n/g, "\n");
      cleaned = cleaned.replace(/\s*if \(!activeTab\.startsWith\("reports-"\)\)[^\n]*\n/g, "\n");
      cleaned = cleaned.replace(/\s*if \(activeTab !== "[^"]+"\) return;\n/g, "\n");
      kept.push(cleaned.slice("  useEffect(".length));
    }
  }
  out = kept.join("\n  useEffect(");

  out = out.replace(/\n  useEffect\(\(\) => \{\n    if \(activeTab === "team-timelog"\)[\s\S]*?\}, \[activeTab[\s\S]*?\]\);\n/g, "\n");
  out = out.replace(/\n  useEffect\(\(\) => \{\n    if \(activeTab === "employee-request"\)[\s\S]*?\}, \[activeTab[\s\S]*?\]\);\n/g, "\n");

  out = out.replace(/useDashboardNav\(\)[\s\S]*?;\n/, "");
  out = out.replace(/const \{ activeTab[^}]*\} = useDashboardNav\(\);\n/g, "");
  out = out.replace(/\n  useEffect\(\(\) => \{\n    const allowed[\s\S]*?goToTab\(fallbackTab\);\n  \}, \[activeTab[\s\S]*?\]\);\n/g, "\n");

  if (moduleId !== "overview") {
    out = out.replace(/\s*if \(activeTab === "overview"\) refresh\(\);\n/g, "\n");
  }

  return out;
}

const sharedImports = `
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { OnboardingGate } from "@/components/dashboard/shared/OnboardingGate";
import { DashboardToast } from "@/components/dashboard/shared/DashboardToast";
import { useDashboardAccess } from "@/components/dashboard/shared/useDashboardAccess";
import { useDashboardAction } from "@/components/dashboard/shared/useDashboardAction";
`;

for (const mod of MODULES) {
  const jsx = extractJsx(mod.start, mod.end);
  let logic = stripActiveTabGuards(logicBlock, mod.id);
  const helpers = mod.helpers ? renderHelpers : "";

  const body = `${imports}
${sharedImports}

export function ${mod.component}() {
${logic}

${helpers}

  const access = useDashboardAccess();
  const { toast, actionLoading, runAction } = useDashboardAction();
  const {
    user,
    refreshSession,
    userRoles,
    hasHrAccess,
    hasManagerAccess,
    requiresSelfOnboarding,
    employeeSelfServeProfile,
    canAccessProfile,
    canAccessOverview,
    isSelfOnboarded,
    setIsSelfOnboarded,
    loadMyProfile,
  } = access;

  return (
    <>
      <DashboardPageShell>
        <OnboardingGate requiresSelfOnboarding={requiresSelfOnboarding}>
          ${jsx.replace(/^/gm, "          ").replace(/\n\s*$/,"")}
        </OnboardingGate>
      </DashboardPageShell>
      <DashboardToast toast={toast} />
    </>
  );
}
`;

  const dir = path.join(root, "components/dashboard", mod.id.replace(/-/g, "_") === mod.id ? mod.id : mod.id);
  const folder = mod.id;
  fs.mkdirSync(path.join(root, "components/dashboard", folder), { recursive: true });
  fs.writeFileSync(path.join(root, "components/dashboard", folder, `${mod.component}.tsx`), body);
  console.log("Wrote", mod.component);
}

console.log("Done splitting modules");
