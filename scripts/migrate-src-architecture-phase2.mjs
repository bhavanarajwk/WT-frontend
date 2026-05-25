import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function moveDirCopy(from, to) {
  if (!fs.existsSync(from)) return;
  if (fs.existsSync(to)) {
    copyRecursive(from, to);
    console.log("merged copy", from, "→", to);
  } else {
    copyRecursive(from, to);
    console.log("copied", from, "→", to);
  }
}

// components → src/components
const compRoot = path.join(root, "components");
const compDest = path.join(root, "src/components");
if (fs.existsSync(compRoot)) {
  for (const name of fs.readdirSync(compRoot)) {
    const from = path.join(compRoot, name);
    const to = path.join(compDest, name);
    moveDirCopy(from, to);
  }
}

// WebTrakBrand
const brandFrom = path.join(root, "app/components/WebTrakBrand");
const brandTo = path.join(root, "src/components/shared/WebTrakBrand");
if (fs.existsSync(brandFrom)) moveDirCopy(brandFrom, brandTo);
const brandFile = path.join(root, "app/components/WebTrakBrand.tsx");
if (fs.existsSync(brandFile)) {
  copyRecursive(brandFile, path.join(root, "src/components/shared/WebTrakBrand.tsx"));
}

// app → src/app
const appFrom = path.join(root, "app");
const appTo = path.join(root, "src/app");
if (fs.existsSync(appFrom) && !fs.existsSync(appTo)) {
  copyRecursive(appFrom, appTo);
  console.log("copied app → src/app");
}

// learning hooks
const ldHooks = path.join(root, "src/components/learning-development/hooks");
const hooksTarget = path.join(root, "src/hooks/learning");
if (fs.existsSync(ldHooks)) {
  moveDirCopy(ldHooks, hooksTarget);
}

// types
const typesDir = path.join(root, "src/types");
fs.mkdirSync(typesDir, { recursive: true });
if (!fs.existsSync(path.join(typesDir, "api.ts"))) {
  fs.writeFileSync(
    path.join(typesDir, "api.ts"),
    `export type RowRecord = Record<string, unknown>;\n`
  );
}
if (!fs.existsSync(path.join(typesDir, "index.ts"))) {
  fs.writeFileSync(path.join(typesDir, "index.ts"), `export * from "./api";\n`);
}

const replacements = [
  ["@/context/AuthContext", "@/context/AuthContext"],
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
  ["@/hooks/learning/", "@/hooks/learning/"],
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.name === "node_modules" || e.name === ".next") continue;
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

for (const filePath of [
  ...walk(path.join(root, "src")),
  ...walk(path.join(root, "scripts")),
  path.join(root, "eslint.config.mjs"),
]) {
  if (!fs.existsSync(filePath)) continue;
  let t = fs.readFileSync(filePath, "utf8");
  let c = false;
  for (const [a, b] of replacements) {
    if (t.includes(a)) {
      t = t.split(a).join(b);
      c = true;
    }
  }
  if (c) fs.writeFileSync(filePath, t);
}

const ts = JSON.parse(fs.readFileSync(path.join(root, "tsconfig.json"), "utf8"));
ts.compilerOptions.paths = { "@/*": ["./src/*"] };
fs.writeFileSync(path.join(root, "tsconfig.json"), JSON.stringify(ts, null, 2) + "\n");

let eslint = fs.readFileSync(path.join(root, "eslint.config.mjs"), "utf8");
eslint = eslint
  .replace("app/(protected)/dashboard", "src/app/(protected)/dashboard")
  .replace('"components/dashboard/', '"src/components/dashboard/');
fs.writeFileSync(path.join(root, "eslint.config.mjs"), eslint);

console.log("phase2 done");
