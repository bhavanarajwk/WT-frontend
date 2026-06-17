"use client";

import type { FormField } from "@/types/exit-interview";
import { ReadonlyDateField } from "@/components/dashboard/ui/forms";
import { isReadonlyField, textareaPlaceholder } from "@/utils/exitInterview";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-rose-600">{message}</p>;
}

function ReadonlyControl({ field, value }: { field: FormField; value: string }) {
  if (field.widget === "readonly_date") {
    return <ReadonlyDateField value={value} />;
  }
  return <input className="input-field px-3 py-2 text-sm opacity-80" value={value} disabled readOnly />;
}

function MultiSelectControl({
  field,
  selected,
  onChange,
  disabled,
}: {
  field: FormField;
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const exclusive = field.exclusive_none_value;
  const options = field.options ?? [];

  const toggle = (value: string) => {
    if (disabled) return;
    const has = selected.includes(value);
    if (exclusive && value === exclusive) {
      onChange(has ? [] : [exclusive]);
      return;
    }
    const withoutExclusive = exclusive ? selected.filter((v) => v !== exclusive) : selected;
    if (has) {
      onChange(withoutExclusive.filter((v) => v !== value));
      return;
    }
    onChange([...withoutExclusive, value]);
  };

  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-start gap-2 text-sm text-wt-text">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={selected.includes(opt.value)}
            disabled={disabled}
            onChange={() => toggle(opt.value)}
          />
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

function SingleSelectControl({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FormField;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      {(field.options ?? []).map((opt) => (
        <label key={opt.value} className="flex items-center gap-2 text-sm text-wt-text">
          <input
            type="radio"
            name={field.key}
            checked={value === opt.value}
            disabled={disabled}
            onChange={() => onChange(opt.value)}
          />
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

function ScaleControl({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FormField;
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  const min = field.min ?? 1;
  const max = field.max ?? 10;
  const buttons = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {buttons.map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            className={`min-w-[2.25rem] rounded-lg border px-2 py-1.5 text-sm tabular-nums transition ${
              value === n
                ? "border-indigo-500 bg-indigo-50 text-indigo-800"
                : "border-wt-border bg-wt-surface-1 text-wt-text hover:bg-wt-surface-2"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {(field.min_label || field.max_label) && (
        <div className="flex justify-between text-xs text-wt-text-muted">
          <span>{field.min_label ?? min}</span>
          <span>{field.max_label ?? max}</span>
        </div>
      )}
    </div>
  );
}

export function ExitInterviewFormFields({
  fields,
  autofill,
  answers,
  errors,
  onChange,
  disabled = false,
}: {
  fields: FormField[];
  autofill: Record<string, string>;
  answers: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: (key: string, value: unknown) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-6">
      {fields.map((field) => {
        const readonly = isReadonlyField(field);
        const displayValue = readonly ? autofill[field.key] ?? "" : undefined;

        return (
          <div key={field.key} className="rounded-xl border border-wt-border bg-wt-surface-1 p-4">
            <p className="text-sm font-medium text-wt-text">
              {field.label}
              {field.required && !readonly ? <span className="text-rose-600"> *</span> : null}
            </p>

            <div className="mt-3">
              {readonly ? (
                <ReadonlyControl field={field} value={displayValue ?? ""} />
              ) : null}

              {field.widget === "multi_select" ? (
                <>
                  <MultiSelectControl
                    field={field}
                    selected={(answers[field.key] as string[]) ?? []}
                    onChange={(next) => onChange(field.key, next)}
                    disabled={disabled}
                  />
                  {field.other_field &&
                  ((answers[field.key] as string[]) ?? []).includes("OTHER") ? (
                    <label className="mt-3 flex flex-col gap-1 text-xs text-wt-text-muted">
                      Please specify
                      <input
                        className="input-field px-3 py-2 text-sm"
                        value={String(answers[field.other_field] ?? "")}
                        disabled={disabled}
                        onChange={(e) => onChange(field.other_field!, e.target.value)}
                      />
                    </label>
                  ) : null}
                </>
              ) : null}

              {field.widget === "single_select" ? (
                <SingleSelectControl
                  field={field}
                  value={String(answers[field.key] ?? "")}
                  onChange={(next) => onChange(field.key, next)}
                  disabled={disabled}
                />
              ) : null}

              {field.widget === "scale_1_10" ? (
                <ScaleControl
                  field={field}
                  value={Number(answers[field.key] ?? field.min ?? 5)}
                  onChange={(next) => onChange(field.key, next)}
                  disabled={disabled}
                />
              ) : null}

              {field.widget === "textarea" ? (
                <textarea
                  className="input-field mt-0 min-h-[100px] w-full px-3 py-2 text-sm"
                  value={String(answers[field.key] ?? "")}
                  placeholder={textareaPlaceholder(field)}
                  disabled={disabled}
                  onChange={(e) => onChange(field.key, e.target.value)}
                />
              ) : null}
            </div>

            <FieldError message={errors[field.key]} />
            {field.other_field ? <FieldError message={errors[field.other_field]} /> : null}
          </div>
        );
      })}
    </div>
  );
}
