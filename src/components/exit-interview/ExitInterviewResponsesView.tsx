"use client";

import type { FormField } from "@/types/exit-interview";
import { exitInterviewFieldsWithResponses, formatResponseForDisplay } from "@/utils/exitInterview";

export function ExitInterviewResponsesView({
  fields,
  responses,
}: {
  fields: FormField[];
  responses: Record<string, unknown>;
}) {
  const visibleFields = exitInterviewFieldsWithResponses(fields, responses);

  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {visibleFields.map((field) => (
        <div
          key={field.key}
          className={`rounded-lg border border-wt-border bg-wt-surface-2/50 px-4 py-3 ${
            field.widget === "textarea" ? "sm:col-span-2" : ""
          }`}
        >
          <dt className="text-xs font-medium uppercase tracking-wide text-wt-text-muted">{field.label}</dt>
          <dd className="mt-1 text-sm text-wt-text whitespace-pre-wrap">
            {formatResponseForDisplay(field, responses[field.key])}
          </dd>
          {field.other_field && responses[field.other_field] ? (
            <dd className="mt-1 text-sm text-wt-text-muted">
              Other: {String(responses[field.other_field])}
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
