import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..", "components/dashboard");

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith("PageClient.tsx") && !p.includes("DashboardPageClient")) {
      let f = fs.readFileSync(p, "utf8");
      f = f.replace(/if \(activeTab !== "[^"]+"\) return;\n/g, "");
      f = f.replace(/if \(activeTab !== "[^"]+" \|\| [^\n]+\) return;\n/g, "");
      f = f.replace(/\}, \[activeTab([^\]]*)\]\)/g, "}, [$1])".replace(/^\, /, ""));
      f = f.replace(/, activeTab/g, "");
      f = f.replace(/activeTab, /g, "");
      fs.writeFileSync(p, f);
      console.log("cleaned", p);
    }
  }
}
walk(root);

// Fix timelog/leave state order
for (const [folder, state] of [
  ["timelog", "timelogSubTab"],
  ["leave", "leaveSubTab"],
]) {
  const fp = path.join(root, folder, folder === "timelog" ? "TimelogPageClient.tsx" : "LeavePageClient.tsx");
  let f = fs.readFileSync(fp, "utf8");
  const block = f.match(
    new RegExp(
      `const pathname = usePathname\\(\\);\\n  useEffect\\(\\(\\) => \\{[\\s\\S]*?\\}, \\[pathname\\]\\);\\n  const \\[${state}, set[^\\]]+\\][^;]+;`,
      "m"
    )
  );
  if (block) {
    const inner = block[0];
    const stateLine = inner.match(new RegExp(`const \\[${state}[^\n]+`))?.[0];
    const effectPart = inner.replace(stateLine + ";", "").trim();
    if (stateLine) {
      f = f.replace(inner, `${stateLine};\n  ${effectPart}`);
      fs.writeFileSync(fp, f);
    }
  }
}
