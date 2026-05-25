import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const insert = `  const availableOnboardRoles = bandDeptRoleMap[onboardForm.department] ?? [];
  const internBandId = useMemo(() => resolveInternBandId(onboardBands), [onboardBands]);

`;
const marker = `  useEffect(() => {
    if (onboardForm.user_type !== "INTERN") return;`;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith("PageClient.tsx")) out.push(p);
  }
  return out;
}

for (const filePath of walk(path.join(root, "components/dashboard"))) {
  if (
    filePath.includes("overview") ||
    filePath.includes("leave") ||
    filePath.includes("allocation-extension") ||
    filePath.includes("employee-attendance")
  ) {
    continue;
  }
  let content = fs.readFileSync(filePath, "utf8");
  if (!content.includes("internBandId")) continue;
  if (content.includes("const internBandId = useMemo")) continue;
  if (!content.includes(marker)) {
    console.warn("no marker:", filePath);
    continue;
  }
  content = content.replace(marker, insert + marker);
  fs.writeFileSync(filePath, content);
  console.log("fixed", filePath);
}
