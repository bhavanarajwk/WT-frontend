import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith("PageClient.tsx")) out.push(p);
  }
  return out;
}

const skip = new Set([
  "allocation-extension",
  "employee-attendance",
]);

for (const filePath of walk(path.join(root, "components/dashboard"))) {
  if ([...skip].some((s) => filePath.includes(s))) continue;

  let lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const exportIdx = lines.findIndex((l) => /^export function \w+PageClient/.test(l));
  if (exportIdx < 0) {
    console.warn("no export:", filePath);
    continue;
  }

  let lastImport = 0;
  for (let i = 0; i < exportIdx; i++) {
    if (lines[i].startsWith("import ")) lastImport = i;
  }

  const preambleStart = lines.findIndex(
    (l, i) =>
      i > lastImport &&
      (l.startsWith("const HARDCODED_DEPARTMENT") ||
        l.startsWith("function IconUser") ||
        l.startsWith("const MAX_ONBOARD") ||
        l.startsWith("import { OverviewSection"))
  );

  if (preambleStart < 0 || preambleStart >= exportIdx) {
    console.log("skip preamble:", filePath);
    continue;
  }

  // Keep module-specific imports (e.g. OverviewSection) between shared imports and export.
  const kept = [];
  for (let i = preambleStart; i < exportIdx; i++) {
    if (lines[i].startsWith("import ")) kept.push(lines[i]);
  }

  lines = [...lines.slice(0, preambleStart), ...kept, "", ...lines.slice(exportIdx)];

  let content = lines.join("\n");

  // Remove inline isManagerFlagTruthy shadowing import (common pattern from split).
  content = content.replace(
    /\n  const isManagerFlagTruthy = \(value: unknown\): boolean => \{[\s\S]*?\n  \};\n/g,
    "\n"
  );

  fs.writeFileSync(filePath, content);
  console.log("stripped", filePath);
}
