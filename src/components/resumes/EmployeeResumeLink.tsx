"use client";

export function EmployeeResumeLink({
  href,
}: {
  href?: string | null;
}) {
  const url = href ?? null;
  if (!url) {
    return <span className="text-wt-text-muted">—</span>;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-blue-600 hover:underline"
    >
      resume
    </a>
  );
}

import { pickResumeShareLink } from "@/utils/employeeResume";

export function EmployeeResumeLinkFromRow({ row }: { row: Record<string, unknown> }) {
  return <EmployeeResumeLink href={pickResumeShareLink(row)} />;
}
