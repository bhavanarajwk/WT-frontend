"use client";

import {
  TableBody,
  TableCell,
  TableRow,
  WtTable,
} from "@/components/dashboard/ui/wtTable";
import { EmployeeStatusBadge } from "@/components/employee-directory/EmployeeStatusBadge";
import { EmployeeResumeLink } from "@/components/resumes/EmployeeResumeLink";
import {
  DETAIL_LABEL_CELL_CLASS,
  DETAIL_VALUE_CELL_CLASS,
} from "@/components/dashboard/ui/uiLayout";
import {
  formatProfileDisplayValue,
  type ProfileDisplayEntry,
} from "@/utils/employeeDirectory";
import { cn } from "@/lib/utils";

function ProfileFieldValue({ entry }: { entry: ProfileDisplayEntry }) {
  if (entry.resumeShareHref !== undefined) {
    return <EmployeeResumeLink href={entry.resumeShareHref} />;
  }
  if (entry.asStatusBadge) {
    return <EmployeeStatusBadge status={String(entry.value ?? "")} />;
  }
  return <>{formatProfileDisplayValue(entry.value)}</>;
}

export function ProfileFieldGrid({
  entries,
  variant = "table",
}: {
  entries: ProfileDisplayEntry[];
  variant?: "default" | "dashboard" | "rows" | "table";
}) {
  if (!entries.length) {
    return <p className="text-sm text-wt-text-muted">No information available.</p>;
  }

  if (variant === "table") {
    return (
      <div className="overflow-x-auto rounded-lg border border-wt-border">
        <WtTable>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.label} className="hover:bg-transparent">
                <TableCell
                  className={cn(DETAIL_LABEL_CELL_CLASS, "w-[34%] min-w-[10rem] bg-wt-surface-2/40")}
                >
                  {entry.label}
                </TableCell>
                <TableCell className={cn(DETAIL_VALUE_CELL_CLASS, "text-wt-text")}>
                  <ProfileFieldValue entry={entry} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </WtTable>
      </div>
    );
  }

  if (variant === "default" || variant === "dashboard") {
    return (
      <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
        {entries.map((entry) => (
          <div
            key={entry.label}
            className={cn("min-w-0", entry.fullWidth ? "sm:col-span-2" : undefined)}
          >
            <dt className="text-sm font-medium text-wt-text-muted">{entry.label}</dt>
            <dd className="mt-1.5 text-sm font-medium text-wt-text break-words">
              <ProfileFieldValue entry={entry} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-wt-border">
      <WtTable>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.label} className="hover:bg-transparent">
              <TableCell className={cn(DETAIL_LABEL_CELL_CLASS, "bg-wt-surface-2/40")}>
                {entry.label}
              </TableCell>
              <TableCell className={DETAIL_VALUE_CELL_CLASS}>
                <ProfileFieldValue entry={entry} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </WtTable>
    </div>
  );
}
