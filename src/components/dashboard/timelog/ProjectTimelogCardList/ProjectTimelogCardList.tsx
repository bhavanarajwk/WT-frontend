"use client";

import { WtLoaderCentered } from "@/components/dashboard/ui/WtLoader";
import "./ProjectTimelogCardList.css";
import type { ProjectTimelogCardListProps } from "./ProjectTimelogCardList.types";

function employeeTotal(
  totals: Record<string, { email: string; name: string; week_total: number }[]>,
  projectCode: string,
  email: string
): string {
  const list = totals[projectCode];
  if (!list) return "0";
  const found = list.find((e) => e.email === email);
  if (!found) return "0";
  const t = found.week_total;
  if (t <= 0) return "0";
  return t % 1 === 0 ? String(t) : t.toFixed(2);
}

export function ProjectTimelogCardList({
  projects,
  weekTotals,
  weekTotalsLoading,
  expandedProject,
  selectedEmployee,
  onToggleProject,
  onSelectEmployee,
}: ProjectTimelogCardListProps) {
  if (!projects.length) {
    return <p className="empty-state">No projects available.</p>;
  }

  return (
    <div className="space-y-2">
      {projects.map((project) => {
        const isExpanded = expandedProject === project.project_code;
        return (
          <div key={project.project_code} className="project-card">
            <div
              className="project-card-header"
              onClick={() => onToggleProject(project.project_code)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggleProject(project.project_code); } }}
            >
              <span>
                <span className="project-card-name">{project.project_name}</span>
                <span className="project-card-code">{project.project_code}</span>
              </span>
              <span className="project-card-toggle">
                {project.employees.length} member{project.employees.length !== 1 ? "s" : ""}
                {isExpanded ? " ▲" : " ▼"}
              </span>
            </div>
            {isExpanded ? (
              <div className="project-card-body">
                {weekTotalsLoading ? (
                  <div className="p-4"><WtLoaderCentered label="" /></div>
                ) : !project.employees.length ? (
                  <p className="employee-row" style={{ justifyContent: "center", cursor: "default" }}>
                    No employees allocated
                  </p>
                ) : (
                  project.employees.map((emp) => (
                    <div
                      key={emp.email}
                      className={`employee-row${selectedEmployee === emp.email ? " selected" : ""}`}
                      onClick={() => onSelectEmployee(emp.email)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectEmployee(emp.email); } }}
                    >
                      <span className="employee-name">{emp.name}</span>
                      <span className="employee-week-total">
                        {employeeTotal(weekTotals, project.project_code, emp.email)}h
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
