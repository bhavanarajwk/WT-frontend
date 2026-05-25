import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..", "components/dashboard");

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith("PageClient.tsx")) {
      let f = fs.readFileSync(p, "utf8");
      const o = f;
      f = f.replace(/\}\);\s{2,}useEffect\(/g, "});\n\n  useEffect(");
      f = f.replace(/^\s*if \(\s*!==[^\n]*\n/gm, "");
      f = f.replace(
        /^\s*if \(\s*\(\s*!==[\s\S]*?\)\s*\|\|\s*!hasHrAccess\s*\)\s*\{\s*\n\s*return;\s*\n\s*\}\s*\n/gm,
        ""
      );
      f = f.replace(
        /^\s*if \(\s*\n\s*\(\s*!==[\s\S]*?\)\s*\|\|\s*!hasHrAccess\s*\)\s*\{\s*\n\s*return;\s*\n\s*\}\s*\n/gm,
        ""
      );
      f = f.replace(/^\s*!==\s*"[^"]+"\s*&&\s*\n/gm, "");
      f = f.replace(/^\s*if \(\.startsWith\("reports-"\)\)[^\n]*\n/gm, "");
      f = f.replace(
        /^\s*useEffect\(\(\) => \{\n\s*if \(!hasHrAccess\) return;\n\s*\}, \[[^\]]*\]\);\n\n/gm,
        ""
      );
      f = f.replace(/^\s*\(\s*!==[\s\S]*?\)\s*\|\|\s*!hasHrAccess\s*\)\s*\{\s*\n\s*return;\s*\n\s*\}\s*\n/gm, "");
      if (f !== o) {
        fs.writeFileSync(p, f);
        console.log("fixed", p);
      }
    }
  }
}

walk(root);
