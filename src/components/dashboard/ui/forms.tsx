"use client";

import { Children, isValidElement, useId, useRef, type ReactElement, type ReactNode } from "react";
import { CalendarIcon } from "lucide-react";
import { DropdownSelect } from "@/components/dashboard/ui/DropdownSelect";
import {
  SearchableSelectCombobox,
  type SearchableSelectOption,
} from "@/components/dashboard/ui/SearchableSelectCombobox";
import { Field, FieldLabel as ShadcnFieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FORM_FIELD_CLASS } from "@/components/dashboard/ui/uiLayout";
import { formatUILabel } from "@/utils/titleCase";
import {
  API_DATE_PLACEHOLDER,
  apiDateFieldValue,
  apiDateToInputValue,
  finalizeApiDateInput,
  inputValueToApiDate,
  maskApiDateInput,
} from "@/utils/apiDate";

export { SearchableSelectCombobox, type SearchableSelectOption };

const ADAPTIVE_SELECT_SEARCH_THRESHOLD = 6;

export function FieldLabel({
  label,
  required,
  htmlFor,
  className,
}: {
  label: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <ShadcnFieldLabel htmlFor={htmlFor} className={className}>
      {formatUILabel(label)}
      {required ? (
        <span className="text-destructive" aria-hidden>
          *
        </span>
      ) : null}
    </ShadcnFieldLabel>
  );
}

export function ApiDateField({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  min,
  max,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  className?: string;
}) {
  const fieldId = useId();
  const pickerRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    if (disabled) return;
    try {
      pickerRef.current?.showPicker?.();
    } catch {
      pickerRef.current?.focus();
    }
  }

  return (
    <Field className={cn(FORM_FIELD_CLASS, className)}>
      <FieldLabel label={label} required={required} htmlFor={fieldId} />
      <InputGroup className="h-10">
        <InputGroupInput
          id={fieldId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className="api-date-field"
          value={apiDateFieldValue(value)}
          placeholder={API_DATE_PLACEHOLDER}
          disabled={disabled}
          required={required}
          aria-required={required || undefined}
          pattern="\d{2}/\d{2}/\d{4}"
          title={`Use ${API_DATE_PLACEHOLDER}`}
          onChange={(e) => onChange(maskApiDateInput(e.target.value))}
          onBlur={(e) => onChange(finalizeApiDateInput(e.target.value))}
        />
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          value={apiDateToInputValue(value)}
          min={min ? apiDateToInputValue(min) : undefined}
          max={max ? apiDateToInputValue(max) : undefined}
          disabled={disabled}
          onChange={(e) => onChange(inputValueToApiDate(e.target.value))}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            type="button"
            tabIndex={-1}
            disabled={disabled}
            aria-label={`Open calendar for ${label}`}
            onClick={(e) => {
              e.preventDefault();
              openPicker();
            }}
          >
            <CalendarIcon className="size-4" />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  );
}

export function ReadonlyDateField({ value, className }: { value: string; className?: string }) {
  return (
    <InputGroup className={cn("h-10 opacity-80", className)}>
      <InputGroupInput
        type="text"
        className="api-date-field"
        value={apiDateFieldValue(value)}
        placeholder={API_DATE_PLACEHOLDER}
        disabled
        readOnly
        aria-readonly
      />
      <InputGroupAddon align="inline-end">
        <CalendarIcon className="size-4 text-muted-foreground" aria-hidden />
      </InputGroupAddon>
    </InputGroup>
  );
}

export function InputField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}) {
  if (type === "date") {
    return (
      <ApiDateField
        label={label}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
      />
    );
  }

  const fieldId = useId();

  return (
    <Field className={FORM_FIELD_CLASS}>
      <FieldLabel label={label} required={required} htmlFor={fieldId} />
      <Input
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
        required={required}
        aria-required={required || undefined}
        disabled={disabled}
      />
    </Field>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  required = false,
  placeholder,
  rows = 4,
  className,
  textareaClassName,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  rows?: number;
  className?: string;
  textareaClassName?: string;
}) {
  const fieldId = useId();

  return (
    <Field className={cn(FORM_FIELD_CLASS, className)}>
      <FieldLabel label={label} required={required} htmlFor={fieldId} />
      <Textarea
        id={fieldId}
        className={cn("min-h-[100px] resize-y break-words whitespace-pre-wrap", textareaClassName)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        aria-required={required || undefined}
        rows={rows}
      />
    </Field>
  );
}

export type SelectFieldOption = string | { value: string; label: string };

function normalizeSelectOptions(options: SelectFieldOption[]): SearchableSelectOption[] {
  return options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : { value: opt.value, label: opt.label }
  );
}

function optionsFromSelectChildren(children: ReactNode): SearchableSelectOption[] {
  const out: SearchableSelectOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ value?: string; children?: ReactNode }>;
    if (el.type !== "option") return;
    const val = String(el.props.value ?? "");
    const raw = el.props.children;
    const label =
      typeof raw === "string"
        ? raw
        : Array.isArray(raw)
          ? raw.map((part) => String(part ?? "")).join("")
          : String(raw ?? val);
    out.push({ value: val, label: label.trim() || val });
  });
  return out;
}

function withPlaceholderOption(
  items: SearchableSelectOption[],
  placeholder?: string,
  required?: boolean
): SearchableSelectOption[] {
  if (!placeholder) return items;
  if (items.some((opt) => opt.value === "")) return items;
  return [{ value: "", label: placeholder }, ...items];
}

function selectItemsEqual(a: SearchableSelectOption, b: SearchableSelectOption) {
  return a.value === b.value;
}

/** Selection-only dropdown with a visible chevron (no free-text entry). */
export function DropdownSelectField({
  label,
  value,
  options,
  onChange,
  required = false,
  placeholder = "Select",
  disabled = false,
  className,
}: {
  label: string;
  value: string;
  options: SelectFieldOption[];
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const fieldId = useId();
  const items = withPlaceholderOption(normalizeSelectOptions(options), placeholder, required);
  const selected = items.find((opt) => opt.value === value) ?? null;

  return (
    <Field className={cn(FORM_FIELD_CLASS, className)}>
      <FieldLabel label={label} required={required} htmlFor={fieldId} />
      <Select
        value={selected}
        onValueChange={(item) => onChange(item?.value ?? "")}
        disabled={disabled}
        required={required}
        items={items}
        isItemEqualToValue={selectItemsEqual}
      >
        <SelectTrigger id={fieldId}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((option) => (
            <SelectItem key={`${option.value}-${option.label}`} value={option}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function AdaptiveSelectField({
  label,
  value,
  options,
  onChange,
  required = false,
  placeholder,
  disabled = false,
  className,
  searchPlaceholder = "Search…",
}: {
  label: string;
  value: string;
  options: SelectFieldOption[];
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  searchPlaceholder?: string;
}) {
  const fieldId = useId();
  const items = withPlaceholderOption(normalizeSelectOptions(options), placeholder, required);
  const selectableCount = items.filter((opt) => opt.value !== "").length;
  const useSearch = selectableCount > ADAPTIVE_SELECT_SEARCH_THRESHOLD;

  return (
    <Field className={cn(FORM_FIELD_CLASS, className)}>
      <FieldLabel label={label} required={required} htmlFor={fieldId} />
      {useSearch ? (
        <SearchableSelectCombobox
          id={fieldId}
          value={value}
          onChange={onChange}
          options={items}
          placeholder={searchPlaceholder}
          required={required}
          disabled={disabled}
          aria-label={label}
          showChevron
        />
      ) : (
        <DropdownSelect
          id={fieldId}
          value={value}
          onChange={onChange}
          options={items}
          required={required}
          disabled={disabled}
          aria-label={label}
        />
      )}
    </Field>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  required = false,
  placeholder,
  disabled = false,
  className,
}: {
  label: string;
  value: string;
  options: SelectFieldOption[];
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <AdaptiveSelectField
      label={label}
      value={value}
      options={options}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      searchPlaceholder={placeholder ?? "Search…"}
    />
  );
}

export function NativeSelectField({
  label,
  value,
  onChange,
  required = false,
  placeholder,
  disabled,
  className,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const fieldId = useId();
  const items = withPlaceholderOption(optionsFromSelectChildren(children), placeholder, required);
  return (
    <Field className={cn(FORM_FIELD_CLASS, className)}>
      <FieldLabel label={label} required={required} htmlFor={fieldId} />
      <SearchableSelectCombobox
        id={fieldId}
        value={value}
        onChange={onChange}
        options={items}
        placeholder={placeholder ?? "Search…"}
        required={required}
        disabled={disabled}
        aria-label={label}
      />
    </Field>
  );
}

export function DatePickerField({
  label,
  value,
  onChange,
  disabled = false,
  min,
  max,
  className,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  min?: string;
  max?: string;
  className?: string;
  required?: boolean;
}) {
  return (
    <ApiDateField
      label={label}
      value={value}
      onChange={onChange}
      disabled={disabled}
      min={min}
      max={max}
      className={className}
      required={required}
    />
  );
}

export function FileField({
  label,
  onPick,
  onPickFiles,
  accept,
  multiple,
  required = false,
}: {
  label: string;
  accept?: string;
  multiple?: boolean;
  required?: boolean;
  onPick?: (file: File | null) => void;
  onPickFiles?: (files: File[]) => void;
}) {
  const fieldId = useId();
  const isMulti = Boolean(multiple);
  return (
    <Field className={FORM_FIELD_CLASS}>
      <FieldLabel label={label} required={required} htmlFor={fieldId} />
      <Input
        id={fieldId}
        className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:py-1 file:text-sm file:font-medium"
        type="file"
        accept={accept}
        multiple={isMulti}
        required={required}
        onChange={(e) => {
          if (isMulti) {
            onPickFiles?.(e.target.files?.length ? Array.from(e.target.files) : []);
          } else {
            onPick?.(e.target.files?.[0] ?? null);
          }
        }}
      />
    </Field>
  );
}

export function UploadTile({
  label,
  file,
  onPick,
  onUpload,
  loading,
}: {
  label: string;
  file: File | null;
  onPick: (file: File | null) => void;
  onUpload: () => void | Promise<void>;
  loading: boolean;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
      <p className="text-sm font-medium">{label}</p>
      <Input
        className="h-10 cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:py-1 file:text-sm file:font-medium"
        type="file"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <p className="truncate text-xs text-muted-foreground">{file ? file.name : "No file selected"}</p>
      <button type="button" className="btn-primary px-2.5 py-1.5 text-sm" onClick={onUpload} disabled={loading || !file}>
        Upload
      </button>
    </div>
  );
}
