"use client";

import { EmployeeResumeLink } from "@/components/resumes/EmployeeResumeLink";
import { EmployeeStatusBadge } from "@/components/employee-directory/EmployeeStatusBadge";
import {
  DETAIL_LABEL_CELL_CLASS,
  DETAIL_VALUE_CELL_CLASS,
  SECTION_HEADER_CLASS,
  SECTION_STACK_CLASS,
  SECTION_TITLE_CLASS,
} from "@/components/dashboard/ui/uiLayout";
import {
  SCROLLABLE_TABLE_CLASS,
  ScrollableTable,
  STICKY_TABLE_HEAD_CLASS,
} from "@/components/dashboard/ui/ScrollableTable";
import {
  buildGroupedProfileSections,
  formatProfileDisplayValue,
  type ProfileDisplayEntry,
} from "@/utils/employeeDirectory";

function ProfileTableRows({ entries }: { entries: ProfileDisplayEntry[] }) {
  return (
    <>
      {entries.map((entry) => (
        <tr key={entry.label} className="border-t border-wt-border">
          <td className={DETAIL_LABEL_CELL_CLASS}>{entry.label}</td>
          <td className={DETAIL_VALUE_CELL_CLASS}>
            {entry.resumeShareHref !== undefined ? (
              <EmployeeResumeLink href={entry.resumeShareHref} />
            ) : entry.asStatusBadge ? (
              <EmployeeStatusBadge status={String(entry.value ?? "")} />
            ) : (
              formatProfileDisplayValue(entry.value)
            )}
          </td>
        </tr>
      ))}
    </>
  );
}

export function FullProfileDetailsGrid({
  profile,
  resumeShareHref,
  scrollChain = false,
}: {
  profile: Record<string, unknown>;
  resumeShareHref?: string | null;
  scrollChain?: boolean;
}) {
  const sections = buildGroupedProfileSections(profile, resumeShareHref);
  const sectionMaxHeight = scrollChain ? "max-h-[min(48vh,420px)]" : "max-h-none";

  return (
    <div className={SECTION_STACK_CLASS}>
      {sections.map((section) => (
        <section
          key={section.title}
          className={scrollChain ? "employee-profile-section" : undefined}
        >
          <header className={SECTION_HEADER_CLASS}>
            <h4 className={SECTION_TITLE_CLASS}>{section.title}</h4>
          </header>
          <ScrollableTable maxHeightClass={sectionMaxHeight} scrollChain={scrollChain}>
            <table className={SCROLLABLE_TABLE_CLASS}>
              <thead className={STICKY_TABLE_HEAD_CLASS}>
                <tr>
                  <th
                    className={`${DETAIL_LABEL_CELL_CLASS} text-left text-xs font-semibold tracking-wide`}
                  >
                    Field
                  </th>
                  <th
                    className={`${DETAIL_VALUE_CELL_CLASS} text-left text-xs font-semibold tracking-wide text-wt-text-muted`}
                  >
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                <ProfileTableRows entries={section.entries} />
              </tbody>
            </table>
          </ScrollableTable>
        </section>
      ))}
    </div>
  );
}
