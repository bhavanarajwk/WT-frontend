import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..", "components/dashboard");

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".tsx")) {
      let c = fs.readFileSync(p, "utf8");
      const o = c;
      c = c.replace(
        /@\/app\/\(protected\)\/dashboard\/AllocationExtensionPanel/g,
        "@/components/dashboard/sections/AllocationExtensionPanel"
      );
      c = c.replace(
        /@\/app\/\(protected\)\/dashboard\/EmployeeAttendancePanel/g,
        "@/components/dashboard/sections/EmployeeAttendancePanel"
      );
      c = c.replace(/setActiveTab\("overview"\)/g, 'router.replace("/dashboard/overview", { scroll: false })');
      if (c !== o) {
        fs.writeFileSync(p, c);
        console.log("fixed", p);
      }
    }
  }
}

walk(root);
