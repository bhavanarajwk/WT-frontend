"use client";

import { ProfileField } from "@/components/dashboard/ui/profile";
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
    <dl className="grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
      {entries.map((entry) =>
        entry.resumeShareHref !== undefined ? (
          <div key={entry.label} className="contents">
            <dt className="text-wt-text-muted">{entry.label}</dt>
            <dd className="font-medium">
              <EmployeeResumeLink href={entry.resumeShareHref} />
            </dd>
          </div>
        ) : (
          <ProfileField
            key={entry.label}
            label={entry.label}
            value={formatProfileDisplayValue(entry.value)}
          />
        )
      )}
    </dl>
  );
}
