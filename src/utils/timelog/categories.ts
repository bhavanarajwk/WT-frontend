export const INTERNAL_PROJECT_CODE = "INTERNAL";
export const GENERAL_PROJECT_CODE = "GENERAL";

export const TASK_DEVELOPMENT = "DEVELOPMENT";
export const TASK_TESTING = "TESTING";
export const TASK_MEETING = "MEETING";
export const TASK_GENERAL = "GENERAL";

export const TASK_CATEGORY_LABELS: Record<string, string> = {
  DEVELOPMENT: "Development",
  TESTING: "Testing",
  MEETING: "Meeting",
  GENERAL: "General",
};

export const SUB_CATEGORIES: Record<string, string[]> = {
  DEVELOPMENT: ["Dev", "Testing", "Code review", "Bug fix"],
  TESTING: [
    "Write test cases",
    "Test execution",
    "Functional testing",
    "Automation",
    "Regression testing",
  ],
  MEETING: [
    "Sprint planning",
    "Retrospective",
    "Daily stand up",
    "Client call",
    "Project discussion",
  ],
  GENERAL: ["Holiday", "Leave", "Comp Off", "POC"],
};

export type TimelogProjectOption = {
  project_code: string;
  project_name: string;
  kind: string;
  task_categories: Array<{ value: string; label: string }>;
};

export type TimelogOptionsPayload = {
  client_projects: Array<{ project_code: string; project_name: string }>;
  project_options: TimelogProjectOption[];
  sub_categories_by_task: Record<string, string[]>;
};

export function taskCategoriesForProject(projectCode: string): string[] {
  const code = projectCode.trim().toUpperCase();
  if (code === GENERAL_PROJECT_CODE) return [TASK_GENERAL];
  if (code === INTERNAL_PROJECT_CODE) return [TASK_DEVELOPMENT, TASK_MEETING, TASK_GENERAL];
  return [TASK_DEVELOPMENT, TASK_TESTING, TASK_MEETING, TASK_GENERAL];
}

export function subCategoriesFor(projectCode: string, taskCategory: string): string[] {
  const code = projectCode.trim().toUpperCase();
  const task = taskCategory.trim().toUpperCase();
  if (task === TASK_GENERAL && code !== INTERNAL_PROJECT_CODE && code !== GENERAL_PROJECT_CODE) {
    return [];
  }
  return SUB_CATEGORIES[task] ?? [];
}

export function subCategoryRequired(projectCode: string, taskCategory: string): boolean {
  return subCategoriesFor(projectCode, taskCategory).length > 0;
}

export function projectOptionsFromPayload(payload: TimelogOptionsPayload | null): TimelogProjectOption[] {
  return payload?.project_options ?? [];
}
