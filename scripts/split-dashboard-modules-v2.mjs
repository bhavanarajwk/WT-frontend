import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const monolithPath = path.join(root, "components/dashboard/DashboardPageClient.tsx");
const allLines = fs.readFileSync(monolithPath, "utf8").split(/\r?\n/);

const fnLine = allLines.findIndex((l) => l.includes("function DashboardPageContent"));
const returnLine = allLines.findIndex(
  (l, i) =>
    i > fnLine &&
    l.trim() === "return (" &&
    (allLines[i + 1]?.trim().startsWith("<>") ||
      allLines[i + 1]?.trim().startsWith("<main"))
);
const exportWrapperLine = allLines.findIndex((l) =>
  l.includes("export function DashboardPageClient")
);
const fnEnd = allLines.lastIndexOf("}", exportWrapperLine - 1);
const logicLines = allLines.slice(fnLine + 1, returnLine);
const returnLines = allLines.slice(returnLine + 1, fnEnd);

let imports = allLines.slice(0, fnLine).join("\n");
imports = imports
  .replace(/import \{ useDashboardNav \}[^\n]+\n/g, "")
  .replace(/import \{ dashboardNavigation, filterVisibleNavigation \}[^\n]+\n/g, "")
  .replace(/import \{ applyTheme \}[^\n]+\n/g, "")
  .replace(/import \{ OverviewSection \}[^\n]+\n/g, "")
  .replace(/import \{ OnboardingPendingBanner \}[^\n]+\n/g, "");

const MODULES = [
  { folder: "overview", name: "OverviewPageClient", jsxStart: '{activeTab === "overview" && canAccessOverview', jsxEnd: '{activeTab === "profile"' },
  { folder: "profile", name: "ProfilePageClient", jsxStart: '{activeTab === "profile" && canAccessProfile', jsxEnd: '{activeTab === "employee"' },
  { folder: "employee", name: "EmployeePageClient", jsxStart: '{activeTab === "employee" && hasHrAccess', jsxEnd: '{activeTab === "allocation"' },
  { folder: "allocation", name: "AllocationPageClient", jsxStart: '{activeTab === "allocation" && !requiresSelfOnboarding', jsxEnd: '{activeTab === "allocation-extension"' },
  { folder: "allocation-extension", name: "AllocationExtensionPageClient", jsxStart: '{activeTab === "allocation-extension" && !requiresSelfOnboarding', jsxEnd: '{activeTab === "employee-attendance"' },
  { folder: "employee-attendance", name: "EmployeeAttendancePageClient", jsxStart: '{activeTab === "employee-attendance" && hasHrAccess', jsxEnd: '{activeTab === "timelog"' },
  { folder: "timelog", name: "TimelogPageClient", jsxStart: '{activeTab === "timelog" && !requiresSelfOnboarding', jsxEnd: '{activeTab === "leave"' },
  { folder: "leave", name: "LeavePageClient", jsxStart: '{activeTab === "leave" && !requiresSelfOnboarding', jsxEnd: '{activeTab === "offboarding"' },
  { folder: "offboarding", name: "OffboardingPageClient", jsxStart: '{activeTab === "offboarding" && !requiresSelfOnboarding && hasHrAccess', jsxEnd: '{activeTab === "background-verification"' },
  { folder: "background-verification", name: "BackgroundVerificationPageClient", jsxStart: '{activeTab === "background-verification" && !requiresSelfOnboarding && hasHrAccess', jsxEnd: '{activeTab.startsWith("reports-")' },
  { folder: "reports", name: "ReportsPageClient", jsxStart: '{activeTab.startsWith("reports-") && !requiresSelfOnboarding && hasHrAccess', jsxEnd: '{activeTab === "uploads"' },
  { folder: "uploads", name: "UploadsPageClient", jsxStart: '{activeTab === "uploads" && !requiresSelfOnboarding', jsxEnd: '{activeTab === "masters"' },
  { folder: "masters", name: "MastersPageClient", jsxStart: '{activeTab === "masters" && !requiresSelfOnboarding', jsxEnd: "</main>" },
];

function extractJsx(startMarker, endMarker, stripPatterns) {
  const text = returnLines.join("\n");
  const s = text.indexOf(startMarker);
  if (s < 0) throw new Error(`Missing start ${startMarker}`);
  const e = text.indexOf(endMarker, s + 1);
  let chunk = e < 0 ? text.slice(s) : text.slice(s, e);
  chunk = chunk.replace(/^\s*<main[^>]*>\s*/i, "").replace(/\s*<\/main>\s*$/i, "");
  chunk = chunk.replace(/^\s*\{activeTab[^?]*\?\s*\(/m, "");
  chunk = chunk.replace(/^\s*\{activeTab\.startsWith\("reports-"\)[^?]*\?\s*\(/m, "");
  chunk = chunk.replace(/\{requiresSelfOnboarding \? <OnboardingPendingBanner \/> : null\}\s*/g, "");
  chunk = chunk.replace(/\)\s*:\s*null\}\s*$/s, "");
  return chunk.trim();
}

function transformLogic(lines, moduleId) {
  let text = lines.join("\n");

  text = text.replace(/import \{ useDashboardNav \}[^\n]+\n/g, "");
  text = text.replace(/import \{ dashboardNavigation, filterVisibleNavigation \}[^\n]+\n/g, "");
  text = text.replace(/import \{ OverviewSection \}[^\n]+\n/g, "");
  text = text.replace(/import \{ OnboardingPendingBanner \}[^\n]+\n/g, "");
  text = text.replace(/  const \{ activeTab, setActiveTab, goToTab, setReportsExpanded \} = useDashboardNav\(\);\n/g, "");

  text = text.replace(/  const \[theme, setTheme\][\s\S]*?\}\);\n/g, "");
  text = text.replace(/  useEffect\(\(\) => \{\n    applyTheme\(theme\);\n  \}, \[theme\]\);\n\n/g, "");

  text = text.replace(/  useEffect\(\(\) => \{\n    if \(activeTab === "team-timelog"\)[\s\S]*?\}, \[activeTab, setActiveTab, router\]\);\n\n/g, "");
  text = text.replace(/  useEffect\(\(\) => \{\n    if \(activeTab === "employee-request"\)[\s\S]*?\}, \[activeTab, setActiveTab, router\]\);\n\n/g, "");

  text = text.replace(/  useEffect\(\(\) => \{\n    const allowed = new Set[\s\S]*?\}, \[activeTab, visibleNavigation, goToTab\]\);\n\n/g, "");
  text = text.replace(/  useEffect\(\(\) => \{\n    if \(activeTab\.startsWith\("reports-"\)\) setReportsExpanded\(true\);\n  \}, \[activeTab, hasHrAccess\]\);\n\n/g, "");

  text = text.replace(/  const visibleNavigation = useMemo\([\s\S]*?\);\n/g, "");
  text = text.replace(/  const canAccessOverview = useMemo\([\s\S]*?\);\n/g, "");

  text = text.replace(/  useEffect\(\s*useEffect\(/g, "  useEffect(");

  text = text.replace(
    /  useEffect\(\(\) => \{\n    const tab = searchParams\.get\("tab"\);[\s\S]*?\}, \[searchParams, canAccessProfile, router\]\);\n\n/g,
    ""
  );

  function effectRelevant(chunk) {
    if (!chunk.includes("activeTab")) return true;
    const isReports = moduleId === "reports";
    return (
      (isReports && chunk.includes("reports-")) ||
      chunk.includes(`"${moduleId}"`) ||
      (moduleId === "profile" && chunk.includes('"profile"')) ||
      (moduleId === "timelog" &&
        (chunk.includes('"timelog"') || chunk.includes("timelogSubTab"))) ||
      (moduleId === "leave" &&
        (chunk.includes('"leave"') || chunk.includes("leaveSubTab"))) ||
      (moduleId === "offboarding" && chunk.includes('"offboarding"')) ||
      (moduleId === "background-verification" &&
        chunk.includes('"background-verification"'))
    );
  }

  function cleanEffectGuards(chunk) {
    let e = chunk;
    e = e.replace(/^\s*if \(activeTab !== "[^"]+"\) return;\n/gm, "");
    e = e.replace(/^\s*if \(activeTab === "[^"]+"\) return;\n/gm, "");
    e = e.replace(/^\s*if \(!activeTab\.startsWith\("reports-"\)\)[^\n]*\n/gm, "");
    e = e.replace(
      /^\s*if \(\s*\(\s*activeTab !== "offboarding"[\s\S]*?\) return;\n/gm,
      ""
    );
    e = e.replace(/^\s*if \(activeTab !== "[^"]+" \|\|[^\n]*\) return;\n/gm, "");
    e = e.replace(/^\s*if \(activeTab === "[^"]+" \|\|[^\n]*\) return;\n/gm, "");
    return e;
  }

  function stripLeadingEffect(chunk) {
    const m = chunk.match(/^  useEffect\(\(\) => \{[\s\S]*?\n  \}, \[[^\]]*\]\);\n\n/);
    return m ? chunk.slice(m[0].length) : chunk;
  }

  const parts = text.split(/\n(?=  useEffect\()/);
  let out = parts[0];
  for (const chunk of parts.slice(1)) {
    if (!chunk.trim()) continue;
    if (!chunk.includes("activeTab")) {
      out += chunk;
      continue;
    }
    if (effectRelevant(chunk)) {
      out += cleanEffectGuards(chunk);
    } else {
      out += stripLeadingEffect(chunk);
    }
  }

  if (moduleId !== "overview") {
    out = out.replace(/\s*if \(activeTab === "overview"\) refresh\(\);\n/g, "\n");
  }

  return out;
}

const shellImports = `
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { OnboardingGate } from "@/components/dashboard/shared/OnboardingGate";
`;

const toastStart = returnLines.findIndex((l) => l.trim().startsWith("{toast ?"));
const toastBlock = returnLines.slice(toastStart, toastStart + 15).join("\n");

for (const mod of MODULES) {
  const jsx = extractJsx(mod.jsxStart, mod.jsxEnd, mod.strip);
  const logic = transformLogic(logicLines, mod.folder === "reports" ? "reports" : mod.folder);
  const helpers = "";

  let extraImport = "";
  if (mod.folder === "overview" && !imports.includes("OverviewSection")) {
    extraImport = 'import { OverviewSection } from "@/components/dashboard/overview/OverviewSection";\n';
  }
  if (mod.folder === "allocation-extension" && !imports.includes("AllocationExtensionPanel")) {
    extraImport =
      'import { AllocationExtensionPanel } from "@/components/dashboard/sections/AllocationExtensionPanel";\n';
  }
  if (mod.folder === "employee-attendance" && !imports.includes("EmployeeAttendancePanel")) {
    extraImport =
      'import { EmployeeAttendancePanel } from "@/components/dashboard/sections/EmployeeAttendancePanel";\n';
  }

  const file = `${imports}
${extraImport}${shellImports}

export function ${mod.name}() {
${logic}
${helpers}
  return (
    <>
      <DashboardPageShell>
        <OnboardingGate requiresSelfOnboarding={requiresSelfOnboarding}>
${jsx.split("\n").map((l) => "          " + l).join("\n")}
        </OnboardingGate>
      </DashboardPageShell>
${toastBlock.split("\n").map((l) => "      " + l).join("\n")}
    </>
  );
}
`;

  fs.mkdirSync(path.join(root, "components/dashboard", mod.folder), { recursive: true });
  fs.writeFileSync(path.join(root, "components/dashboard", mod.folder, `${mod.name}.tsx`), file);
  console.log("OK", mod.name);
}
