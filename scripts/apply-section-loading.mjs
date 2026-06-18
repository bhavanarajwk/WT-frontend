import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..", "src");

const IMPORT_LINE =
  'import { SectionLoading } from "@/components/dashboard/ui/SectionLoading";';

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules") continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, files);
    else if (full.endsWith(".tsx")) files.push(full);
  }
  return files;
}

function ensureImport(content) {
  if (content.includes(IMPORT_LINE) || !content.includes("<SectionLoading")) {
    return content;
  }
  if (content.includes('"use client"')) {
    return content.replace(/"use client";\r?\n\r?\n/, `"use client";\n\n${IMPORT_LINE}\n`);
  }
  return `${IMPORT_LINE}\n${content}`;
}

const replacements = [
  [
    /<p className="text-sm text-wt-text-muted">(Loading[^<]*)<\/p>/g,
    '<SectionLoading label="$1" />',
  ],
  [
    /\{loading \? <p className="text-sm text-wt-text-muted">(Loading[^<]*)<\/p> : null\}/g,
    "{loading ? <SectionLoading label=\"$1\" /> : null}",
  ],
  [
    /\{isLoading \? <p className="text-sm text-wt-text-muted">(Loading[^<]*)<\/p> : null\}/g,
    "{isLoading ? <SectionLoading label=\"$1\" /> : null}",
  ],
  [
    /\{listQ\.isLoading \? <p className="text-sm text-wt-text-muted">(Loading[^<]*)<\/p> : null\}/g,
    "{listQ.isLoading ? <SectionLoading label=\"$1\" /> : null}",
  ],
  [
    /<p className="mt-8 text-sm text-wt-text-muted">(Loading[^<]*)<\/p>/g,
    '<SectionLoading className="mt-8 py-4" label="$1" />',
  ],
  [
    /<p className="mt-6 text-sm text-wt-text-muted">(Loading[^<]*)<\/p>/g,
    '<SectionLoading className="mt-6 py-4" label="$1" />',
  ],
  [
    /<p className="mt-3 text-sm text-wt-text-muted">(Loading[^<]*)<\/p>/g,
    '<SectionLoading className="mt-3 py-4" label="$1" />',
  ],
  [
    /<p className="py-10 text-center text-sm text-wt-text-muted">(Loading[^<]*)<\/p>/g,
    '<SectionLoading className="py-10" label="$1" />',
  ],
  [
    /return <p className="text-sm text-wt-text-muted">(Loading[^<]*)<\/p>;/g,
    'return <SectionLoading label="$1" />;',
  ],
  [
    /<div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-8 text-sm text-wt-text-muted shadow-sm">\s*Loading…\s*<\/div>/g,
    '<div className="rounded-2xl border border-wt-border bg-wt-surface-1 p-8 shadow-sm"><SectionLoading label="Loading" /></div>',
  ],
];

let changed = 0;
for (const file of walk(ROOT)) {
  if (file.includes("SectionLoading.tsx") || file.includes("WtLoader.tsx")) continue;

  let content = fs.readFileSync(file, "utf8");
  const original = content;

  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }

  content = ensureImport(content);

  if (content !== original) {
    fs.writeFileSync(file, content, "utf8");
    changed += 1;
    console.log(path.relative(ROOT, file));
  }
}

console.log(`Updated ${changed} file(s).`);
