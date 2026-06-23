"use client";

import type { FormField } from "@/types/exit-interview";
import { ReadonlyDateField } from "@/components/dashboard/ui/forms";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { isReadonlyField, textareaPlaceholder } from "@/utils/exitInterview";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-rose-600">{message}</p>;
}

function ReadonlyControl({ field, value }: { field: FormField; value: string }) {
  if (field.widget === "readonly_date") {
    return <ReadonlyDateField value={value} />;
  }
  return <Input className="h-10 opacity-80" value={value} disabled readOnly />;
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
        <Label key={opt.value} className="flex items-start gap-2 text-sm font-normal text-wt-text">
          <Checkbox
            className="mt-0.5"
            checked={selected.includes(opt.value)}
            disabled={disabled}
            onCheckedChange={() => toggle(opt.value)}
          />
          <span>{opt.label}</span>
        </Label>
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
    <RadioGroup
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      className="space-y-2"
    >
      {(field.options ?? []).map((opt) => (
        <Label key={opt.value} className="flex items-center gap-2 text-sm font-normal text-wt-text">
          <RadioGroupItem value={opt.value} />
          <span>{opt.label}</span>
        </Label>
      ))}
    </RadioGroup>
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
          <Button
            key={n}
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onChange(n)}
            className={`min-w-[2.25rem] rounded-lg border px-2 py-1.5 tabular-nums ${
              value === n
                ? "border-indigo-500 bg-indigo-50 text-indigo-800 hover:bg-indigo-50 hover:text-indigo-800"
                : "border-wt-border bg-wt-surface-1 text-wt-text hover:bg-wt-surface-2"
            }`}
          >
            {n}
          </Button>
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
                      <Input
                        className="mt-3 h-10"
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
                <Textarea
                  className="mt-0 min-h-[100px]"
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
