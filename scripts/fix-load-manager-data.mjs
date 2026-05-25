import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");

const block = `
  const loadManagerData = useCallback(
    async (force = false) => {
      if (!hasManagerAccess) return { projectRows: [] as Array<Record<string, unknown>>, detailRows: [] as Array<Record<string, unknown>> };
      if (!force && managerDataLoadedRef.current) {
        return { projectRows: managerProjects, detailRows: managerPortfolioRows };
      }
      if (managerDataLoadingRef.current) {
        return { projectRows: managerProjects, detailRows: managerPortfolioRows };
      }
      managerDataLoadingRef.current = true;
      try {
        const [projectRes, detailRes] = await Promise.all([
          hrmsService.getManagerProjects(),
          hrmsService.getManagerProjectsWithRoles(),
        ]);
        const projectRows = toPagedRows(projectRes.data ?? projectRes);
        const detailRows = toPagedRows(detailRes.data ?? detailRes);
        const effectiveProjectRows = projectRows.length ? projectRows : detailRows;
        setManagerProjects(effectiveProjectRows);
        setManagerPortfolioRows(detailRows);
        managerDataLoadedRef.current = true;
        const fallbackProjectCode = managerProjectCode(effectiveProjectRows[0] ?? detailRows[0] ?? {});
        setSelectedManagerProjectCode((prev) => prev || fallbackProjectCode);
        return { projectRows: effectiveProjectRows, detailRows };
      } finally {
        managerDataLoadingRef.current = false;
      }
    },
    [hasManagerAccess, managerProjects, managerPortfolioRows]
  );
`;

const anchor = "  const canAccessProfile = Boolean(user);";

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
    filePath.includes("allocation-extension") ||
    filePath.includes("employee-attendance")
  ) {
    continue;
  }
  let content = fs.readFileSync(filePath, "utf8");
  if (content.includes("const loadManagerData = useCallback")) continue;
  if (!content.includes("loadManagerData")) continue;
  if (!content.includes(anchor)) {
    console.warn("no anchor:", filePath);
    continue;
  }
  content = content.replace(anchor, anchor + block);
  fs.writeFileSync(filePath, content);
  console.log("fixed", filePath);
}
