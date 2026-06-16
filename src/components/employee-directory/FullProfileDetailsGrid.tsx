"use client";

import { EmployeeResumeLink } from "@/components/resumes/EmployeeResumeLink";
import {
  buildGroupedProfileSections,
  formatProfileDisplayValue,
  type ProfileDisplayEntry,
} from "@/utils/employeeDirectory";

function ProfileDetailField({ entry }: { entry: ProfileDisplayEntry }) {
  const spanClass = entry.fullWidth ? "sm:col-span-2" : "";

  return (
    <>
      <dt className={`text-wt-text-muted ${spanClass}`}>{entry.label}</dt>
      <dd className={`font-medium text-wt-text ${spanClass}`}>
        {entry.resumeShareHref !== undefined ? (
          <EmployeeResumeLink href={entry.resumeShareHref} />
        ) : (
          formatProfileDisplayValue(entry.value)
        )}
      </dd>
    </>
  );
}

export function FullProfileDetailsGrid({
  profile,
  resumeShareHref,
}: {
  profile: Record<string, unknown>;
  resumeShareHref?: string | null;
}) {
  const sections = buildGroupedProfileSections(profile, resumeShareHref);

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.title}>
          <h4 className="border-b border-wt-border pb-2 text-base font-semibold text-wt-text">
            {section.title}
          </h4>
          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
            {section.entries.map((entry) => (
              <ProfileDetailField key={entry.label} entry={entry} />
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
