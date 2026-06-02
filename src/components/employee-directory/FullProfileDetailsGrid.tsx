"use client";

import { EmployeeResumeLink } from "@/components/resumes/EmployeeResumeLink";
import {
  buildProfileDisplayEntries,
  formatProfileDisplayValue,
} from "@/utils/employeeDirectory";

export function FullProfileDetailsGrid({
  profile,
  resumeShareHref,
}: {
  profile: Record<string, unknown>;
  resumeShareHref?: string | null;
}) {
  const entries = buildProfileDisplayEntries(profile, resumeShareHref);

  return (
    <div className="wt-scroll-both overflow-auto rounded-xl border border-wt-border">
      <table className="min-w-full text-sm">
        <thead className="bg-wt-surface-2 text-wt-text-muted">
          <tr>
            <th className="px-3 py-2 text-left font-medium whitespace-nowrap w-[32%]">Field</th>
            <th className="px-3 py-2 text-left font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.label} className="border-t border-wt-border">
              <td className="px-3 py-2 text-wt-text-muted whitespace-nowrap">{entry.label}</td>
              <td className="px-3 py-2 font-medium">
                {entry.resumeShareHref !== undefined ? (
                  <EmployeeResumeLink href={entry.resumeShareHref} />
                ) : (
                  formatProfileDisplayValue(entry.value)
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
