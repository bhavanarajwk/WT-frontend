/**
 * One-time migration: root app/components/config → src/* layout.
 * Run from webtrak-frontend: node scripts/migrate-src-architecture.mjs
 */
import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function moveDir(from, to) {
  if (!fs.existsSync(from)) return false;
  if (fs.existsSync(to)) {
    console.warn("skip move (exists):", to);
    return false;
  }
  ensureDir(path.dirname(to));
  fs.renameSync(from, to);
  console.log("moved", from, "→", to);
  return true;
}

function moveFile(from, to) {
  if (!fs.existsSync(from)) return false;
  ensureDir(path.dirname(to));
  if (fs.existsSync(to)) fs.unlinkSync(to);
  fs.renameSync(from, to);
  console.log("moved file", from, "→", to);
  return true;
}

function copyFile(from, to) {
  if (!fs.existsSync(from)) return;
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
  console.log("copied", from, "→", to);
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.name === "node_modules" || e.name === ".next") continue;
    if (e.isDirectory()) walkFiles(p, out);
    else if (/\.(ts|tsx|mts|mjs|js|json)$/.test(e.name)) out.push(p);
  }
  return out;
}

// --- Physical moves ---
ensureDir(path.join(root, "src"));
ensureDir(path.join(root, "public", "assets", "icons"));

// Utils from src/lib
const utilMoves = [
  ["src/lib/dashboard", "src/utils/dashboard"],
  ["src/lib/learning", "src/utils/learning"],
];
for (const [from, to] of utilMoves) moveDir(path.join(root, from), path.join(root, to));

for (const f of ["actionToast.ts", "apiRows.ts"]) {
  moveFile(path.join(root, "src/lib", f), path.join(root, "src/utils", f));
}

// Constants from config + dashboard constants
ensureDir(path.join(root, "src/constants"));
copyFile(path.join(root, "config/dashboardRoutes.ts"), path.join(root, "src/constants/routes.ts"));
copyFile(path.join(root, "config/dashboardNavigation.ts"), path.join(root, "src/constants/dashboardNavigation.ts"));
copyFile(path.join(root, "config/learningNav.ts"), path.join(root, "src/constants/learningNav.ts"));
copyFile(
  path.join(root, "components/dashboard/constants.ts"),
  path.join(root, "src/constants/dashboard.ts")
);

// Context, lib, services from app
moveFile(path.join(root, "app/context/AuthContext.tsx"), path.join(root, "src/context/AuthContext.tsx"));
moveFile(path.join(root, "app/lib/auth.ts"), path.join(root, "src/lib/auth.ts"));
moveFile(path.join(root, "app/lib/employeeApi.ts"), path.join(root, "src/services/employeeApi.ts"));

// WebTrakBrand → shared
const brandFrom = path.join(root, "app/components/WebTrakBrand.tsx");
const brandDir = path.join(root, "app/components/WebTrakBrand");
if (fs.existsSync(brandDir)) {
  moveDir(brandDir, path.join(root, "src/components/shared/WebTrakBrand"));
} else if (fs.existsSync(brandFrom)) {
  ensureDir(path.join(root, "src/components/shared"));
  moveFile(brandFrom, path.join(root, "src/components/shared/WebTrakBrand.tsx"));
}

// Public SVGs → assets/icons
for (const name of ["window.svg", "vercel.svg", "next.svg", "file.svg", "globe.svg"]) {
  const from = path.join(root, "public", name);
  const to = path.join(root, "public/assets/icons", name);
  if (fs.existsSync(from) && !fs.existsSync(to)) moveFile(from, to);
}

// Move root components → src/components (if src/components empty/missing)
if (fs.existsSync(path.join(root, "components")) && !fs.existsSync(path.join(root, "src/components"))) {
  moveDir(path.join(root, "components"), path.join(root, "src/components"));
} else if (fs.existsSync(path.join(root, "components"))) {
  // merge: move each subfolder
  for (const name of fs.readdirSync(path.join(root, "components"))) {
    const from = path.join(root, "components", name);
    const to = path.join(root, "src/components", name);
    if (name === "dashboard") {
      // constants already copied; remove constants.ts after merge if duplicate
    }
    if (!fs.existsSync(to)) moveDir(from, to);
    else console.warn("merge skip", from);
  }
  try {
    fs.rmdirSync(path.join(root, "components"));
  } catch {
    /* not empty */
  }
}

// Move app → src/app
if (fs.existsSync(path.join(root, "app")) && !fs.existsSync(path.join(root, "src/app"))) {
  moveDir(path.join(root, "app"), path.join(root, "src/app"));
}

// Learning hooks → src/hooks/learning
const ldHooks = path.join(root, "src/components/learning-development/hooks");
const hooksTarget = path.join(root, "src/hooks/learning");
if (fs.existsSync(ldHooks) && !fs.existsSync(hooksTarget)) {
  moveDir(ldHooks, hooksTarget);
}

// Types scaffold
ensureDir(path.join(root, "src/types"));
if (!fs.existsSync(path.join(root, "src/types/api.ts"))) {
  fs.writeFileSync(
    path.join(root, "src/types/api.ts"),
    `import type { ApiEnvelope } from "@/api/httpClient";

export type { ApiEnvelope };
export type RowRecord = Record<string, unknown>;
`
  );
}

if (!fs.existsSync(path.join(root, "src/types/index.ts"))) {
  fs.writeFileSync(
    path.join(root, "src/types/index.ts"),
    `export * from "./api";
`
  );
}

// Remove emptied config
try {
  if (fs.existsSync(path.join(root, "config"))) {
    const left = fs.readdirSync(path.join(root, "config"));
    if (left.length === 0) fs.rmdirSync(path.join(root, "config"));
  }
} catch {
  /* */
}

// --- Import rewrites ---
const replacements = [
  ["@/context/AuthContext", "@/context/AuthContext"],
  ["@/app/context/", "@/context/"],
  ["@/lib/auth", "@/lib/auth"],
  ["@/services/employeeApi", "@/services/employeeApi"],
  ["@/components/shared/WebTrakBrand/", "@/components/shared/WebTrakBrand/"],
  ["@/components/shared/WebTrakBrand", "@/components/shared/WebTrakBrand"],
  ["@/constants/dashboard", "@/constants/dashboard"],
  ["@/constants/routes", "@/constants/routes"],
  ["@/constants/dashboardNavigation", "@/constants/dashboardNavigation"],
  ["@/constants/learningNav", "@/constants/learningNav"],
  ["@/constants/", "@/constants/"],
  ["@/utils/dashboard/", "@/utils/dashboard/"],
  ["@/utils/learning/", "@/utils/learning/"],
  ["@/utils/actionToast", "@/utils/actionToast"],
  ["@/utils/apiRows", "@/utils/apiRows"],
  ["@/api/", "@/api/"],
  ["@/services/", "@/services/"],
  ["@/hooks/", "@/hooks/"],
  ["@/src/utils/", "@/utils/"],
  ["@/src/constants/", "@/constants/"],
  ["@/src/context/", "@/context/"],
  ["@/src/components/", "@/components/"],
  ["@/src/lib/", "@/lib/"],
  ["@/hooks/learning/", "@/hooks/learning/"],
  ["from \"../lib/dashboard/", "from \"@/utils/dashboard/"],
  ["from \"../lib/learning/", "from \"@/utils/learning/"],
];

const filesToPatch = [
  ...walkFiles(path.join(root, "src")),
  ...walkFiles(path.join(root, "scripts")),
  path.join(root, "eslint.config.mjs"),
  path.join(root, "proxy.ts"),
].filter((f) => fs.existsSync(f));

for (const filePath of filesToPatch) {
  let text = fs.readFileSync(filePath, "utf8");
  let changed = false;
  for (const [from, to] of replacements) {
    if (text.includes(from)) {
      text = text.split(from).join(to);
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(filePath, text);
}

// tsconfig paths
const tsconfigPath = path.join(root, "tsconfig.json");
const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
tsconfig.compilerOptions.paths = { "@/*": ["./src/*"] };
fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + "\n");

// eslint paths
const eslintPath = path.join(root, "eslint.config.mjs");
let eslint = fs.readFileSync(eslintPath, "utf8");
eslint = eslint
  .replace(
    '"app/(protected)/dashboard/**/page.tsx"',
    '"src/app/(protected)/dashboard/**/page.tsx"'
  )
  .replace(
    '"components/dashboard/**/*PageClient.tsx"',
    '"src/components/dashboard/**/*PageClient.tsx"'
  );
fs.writeFileSync(eslintPath, eslint);

// Fix scripts that reference old paths
for (const sp of walkFiles(path.join(root, "scripts"))) {
  let s = fs.readFileSync(sp, "utf8");
  s = s
    .replaceAll("components/dashboard/", "src/components/dashboard/")
    .replaceAll('"components/dashboard', '"src/components/dashboard');
  fs.writeFileSync(sp, s);
}

console.log("\nMigration complete. Run: pnpm run build");
