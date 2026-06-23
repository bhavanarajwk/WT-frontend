"use client";

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  WT_STICKY_TABLE_HEAD_CLASS,
  WtTable,
} from "@/components/dashboard/ui/wtTable";
import { EmployeeResumeLink } from "@/components/resumes/EmployeeResumeLink";
import { EmployeeStatusBadge } from "@/components/employee-directory/EmployeeStatusBadge";
import {
  DETAIL_LABEL_CELL_CLASS,
  DETAIL_VALUE_CELL_CLASS,
  SECTION_HEADER_CLASS,
  SECTION_STACK_CLASS,
  SECTION_TITLE_CLASS,
} from "@/components/dashboard/ui/uiLayout";
import { ScrollableTable } from "@/components/dashboard/ui/ScrollableTable";
import {
  buildGroupedProfileSections,
  formatProfileDisplayValue,
  type ProfileDisplayEntry,
} from "@/utils/employeeDirectory";

function ProfileTableRows({ entries }: { entries: ProfileDisplayEntry[] }) {
  return (
    <>
      {entries.map((entry) => (
        <TableRow key={entry.label}>
          <TableCell className={DETAIL_LABEL_CELL_CLASS}>{entry.label}</TableCell>
          <TableCell className={DETAIL_VALUE_CELL_CLASS}>
            {entry.resumeShareHref !== undefined ? (
              <EmployeeResumeLink href={entry.resumeShareHref} />
            ) : entry.asStatusBadge ? (
              <EmployeeStatusBadge status={String(entry.value ?? "")} />
            ) : (
              formatProfileDisplayValue(entry.value)
            )}
          </TableCell>
        </TableRow>
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
            <WtTable>
              <TableHeader className={WT_STICKY_TABLE_HEAD_CLASS}>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={DETAIL_LABEL_CELL_CLASS}>Field</TableHead>
                  <TableHead className={DETAIL_VALUE_CELL_CLASS}>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <ProfileTableRows entries={section.entries} />
              </TableBody>
            </WtTable>
          </ScrollableTable>
        </section>
      ))}
    </div>
  );
}
