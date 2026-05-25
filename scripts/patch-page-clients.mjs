import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..", "components/dashboard");

const rp = path.join(root, "reports/ReportsPageClient.tsx");
let t = fs.readFileSync(rp, "utf8");
if (!t.includes("useDashboardNav")) {
  t = t.replace(
    'import { ApiError } from "@/api/error";',
    'import { useDashboardNav } from "@/components/dashboard/DashboardNavContext";\nimport { ApiError } from "@/api/error";'
  );
  t = t.replace(
    "export function ReportsPageClient() {",
    "export function ReportsPageClient() {\n  const { activeSection } = useDashboardNav();"
  );
}
t = t.replace(/\bactiveTab\b/g, "activeSection");
t = t.replace(
  /\s*useEffect\(\(\) => \{\n    if \(activeSection\.startsWith\("reports-"\)\) setReportsExpanded\(true\);\n  \}, \[activeSection, hasHrAccess\]\);\n\n/g,
  "\n"
);
fs.writeFileSync(rp, t);

const op = path.join(root, "overview/OverviewPageClient.tsx");
let o = fs.readFileSync(op, "utf8");
o = o.replace(/if \(activeTab === "overview"\) refresh\(\);/g, "refresh();");
o = o.replace(/}, \[activeTab, user\]\)/g, "}, [user])");
o = o.replace(/}, \[activeTab, hasManagerAccess\]\)/g, "}, [hasManagerAccess])");
fs.writeFileSync(op, o);

const pp = path.join(root, "profile/ProfilePageClient.tsx");
let p = fs.readFileSync(pp, "utf8");
p = p.replace(/  useEffect\(\(\) => \{\n    const allowed[\s\S]*?\}, \[activeTab, visibleNavigation, goToTab\]\);\n\n/g, "");
p = p.replace(/router\.replace\("\/dashboard", \{ scroll: false \}\)/g, 'router.replace("/dashboard/overview", { scroll: false })');
p = p.replace(/setActiveTab\("overview"\)/g, 'router.replace("/dashboard/overview", { scroll: false })');
p = p.replace(/if \(activeTab !== "profile" \|\| !canAccessProfile\) return;\n/g, "");
p = p.replace(/}, \[activeTab, canAccessProfile, requiresSelfOnboarding\]\)/g, "}, [canAccessProfile, requiresSelfOnboarding])");
fs.writeFileSync(pp, p);

function patchSubTab(folder, file, stateName, routeSegment) {
  const fp = path.join(root, folder, `${file}.tsx`);
  let f = fs.readFileSync(fp, "utf8");
  if (!f.includes("usePathname")) {
    f = f.replace(
      'import { useRouter, useSearchParams } from "next/navigation";',
      'import { useRouter, useSearchParams, usePathname } from "next/navigation";'
    );
  }
  const stateRe = new RegExp(`const \\[${stateName}, set`);
  if (!f.includes(`/${routeSegment}/team`)) {
    f = f.replace(
      stateRe,
      `const pathname = usePathname();\n  useEffect(() => {\n    if (pathname.includes("/dashboard/${routeSegment}/team")) set${stateName.charAt(0).toUpperCase() + stateName.slice(1)}("team");\n    else if (pathname.includes("/dashboard/${routeSegment}")) set${stateName.charAt(0).toUpperCase() + stateName.slice(1)}("my");\n  }, [pathname]);\n  const [${stateName}, set`
    );
  }
  f = f.replace(new RegExp(`if \\(activeTab !== "${routeSegment === "timelog" ? "timelog" : "leave"}" \\|\\| requiresSelfOnboarding\\) return;\\n`, "g"), "");
  f = f.replace(/if \(activeTab !== "timelog" \|\| timelogSubTab !== "team" \|\| !hasManagerAccess\) return;\n/g, 'if (timelogSubTab !== "team" || !hasManagerAccess) return;\n');
  f = f.replace(/if \(activeTab !== "timelog" \|\| timelogSubTab !== "team"\) return;\n/g, 'if (timelogSubTab !== "team") return;\n');
  f = f.replace(/if \(activeTab !== "leave"\) return;\n/g, "");
  f = f.replace(/if \(activeTab !== "leave" \|\| leaveSubTab !== "team"\) return;\n/g, 'if (leaveSubTab !== "team") return;\n');
  f = f.replace(/, activeTab/g, "");
  f = f.replace(/activeTab, /g, "");
  f = f.replace(/\bactiveTab\b/g, "");
  fs.writeFileSync(fp, f);
}

patchSubTab("timelog", "TimelogPageClient", "timelogSubTab", "timelog");
patchSubTab("leave", "LeavePageClient", "leaveSubTab", "leave");

console.log("patched page clients");
