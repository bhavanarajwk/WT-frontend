import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..", "src");

const REPLACEMENTS = {
  "Access restricted": "Access Restricted",
  "Assign account manager": "Assign Account Manager",
  "Onboarding pending": "Onboarding Pending",
  "Create project": "Create Project",
  "Update project": "Update Project",
  "Employee onboarding": "Employee Onboarding",
  "Attrition summary": "Attrition Summary",
  "Employee offboarding": "Employee Offboarding",
  "Offboarded employees": "Offboarded Employees",
  "Employee attendance &amp; leave": "Employee Attendance & Leave",
  "Request allocation end-date extension": "Request Allocation End-Date Extension",
  "Earn credit": "Earn Credit",
  "Use comp-off": "Use Comp-Off",
  "Assign project manager": "Assign Project Manager",
  "Next expiry": "Next Expiry",
  "Assigned projects": "Assigned Projects",
  "Trainee attendance": "Trainee Attendance",
  "Attendance analytics": "Attendance Analytics",
  "Trainee scores": "Trainee Scores",
  "Score analytics": "Score Analytics",
  "Scores &amp; completion": "Scores & Completion",
  "Training analytics": "Training Analytics",
  "Training details": "Training Details",
  "Add session": "Add Session",
  "New session": "New Session",
  "Open trainings (self-enroll)": "Open Trainings (Self-Enroll)",
  "Upload / replace calendar": "Upload / Replace Calendar",
  "Available calendars": "Available Calendars",
  "Attrition &amp; retention": "Attrition & Retention",
  "Voluntary vs involuntary": "Voluntary vs Involuntary",
  "Minutes of meeting (MOM)": "Minutes of Meeting (MOM)",
  "Save Profile Changes": "Save Profile Changes",
};

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules") continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, files);
    else if (/\.tsx?$/.test(ent.name)) files.push(full);
  }
  return files;
}

let changed = 0;
for (const file of walk(ROOT)) {
  let content = fs.readFileSync(file, "utf8");
  const original = content;
  for (const [from, to] of Object.entries(REPLACEMENTS)) {
    if (from === to) continue;
    content = content.split(from).join(to);
  }
  if (content !== original) {
    fs.writeFileSync(file, content, "utf8");
    changed += 1;
    console.log(path.relative(ROOT, file));
  }
}
console.log(`Updated ${changed} file(s).`);
