"use client";

import type { ReactNode } from "react";
import {
  SECTION_DESCRIPTION_CLASS,
  SECTION_HEADER_CLASS,
  SECTION_TITLE_CLASS,
} from "@/components/dashboard/ui/uiLayout";
import { formatUILabel } from "@/utils/titleCase";

export function FormSection({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-wt-border bg-wt-surface-1 p-5 shadow-sm md:p-6 ${className}`.trim()}
    >
      <header className={SECTION_HEADER_CLASS}>
        <h4 className={SECTION_TITLE_CLASS}>{formatUILabel(title)}</h4>
        {description ? <p className={SECTION_DESCRIPTION_CLASS}>{description}</p> : null}
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function FormSubsection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-6 border-t border-wt-border pt-6">
      <h5 className={`mb-4 ${SECTION_TITLE_CLASS} text-sm`}>{formatUILabel(title)}</h5>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
