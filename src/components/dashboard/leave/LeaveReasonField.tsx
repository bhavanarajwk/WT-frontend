"use client";

import { useId } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel as ShadcnFieldLabel } from "@/components/ui/field";
import { FORM_FIELD_CLASS } from "@/components/dashboard/ui/uiLayout";
import { formatUILabel } from "@/utils/titleCase";
import { cn } from "@/lib/utils";

const MAX_LENGTH = 200;

export function LeaveReasonField({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const fieldId = useId();

  return (
    <Field className={FORM_FIELD_CLASS}>
      <ShadcnFieldLabel htmlFor={fieldId}>
        {formatUILabel("Reason for Leave")}
        <span className="text-destructive" aria-hidden>
          *
        </span>
      </ShadcnFieldLabel>
      <div className="relative">
        <Textarea
          id={fieldId}
          className="min-h-[88px] resize-y pr-14"
          value={value}
          disabled={disabled}
          maxLength={MAX_LENGTH}
          placeholder="Enter reason for your leave..."
          rows={3}
          onChange={(event) => onChange(event.target.value)}
        />
        <span
          className="pointer-events-none absolute bottom-2 right-3 text-xs tabular-nums text-wt-text-muted"
          aria-live="polite"
        >
          {value.length} / {MAX_LENGTH}
        </span>
      </div>
    </Field>
  );
}

export function WfhReasonField({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const fieldId = useId();

  return (
    <Field className={FORM_FIELD_CLASS}>
      <ShadcnFieldLabel htmlFor={fieldId}>
        {formatUILabel("Reason")}
        <span className="text-destructive" aria-hidden>
          *
        </span>
      </ShadcnFieldLabel>
      <div className="relative">
        <Textarea
          id={fieldId}
          className={cn("min-h-[88px] resize-y pr-14")}
          value={value}
          disabled={disabled}
          maxLength={MAX_LENGTH}
          placeholder="Enter reason for your request..."
          rows={3}
          onChange={(event) => onChange(event.target.value)}
        />
        <span
          className="pointer-events-none absolute bottom-2 right-3 text-xs tabular-nums text-wt-text-muted"
          aria-live="polite"
        >
          {value.length} / {MAX_LENGTH}
        </span>
      </div>
    </Field>
  );
}
