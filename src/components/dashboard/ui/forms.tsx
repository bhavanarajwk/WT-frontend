"use client";

import { Children, isValidElement, useRef, type ReactElement, type ReactNode } from "react";
import { DropdownSelect } from "@/components/dashboard/ui/DropdownSelect";
import {
  SearchableSelectCombobox,
  type SearchableSelectOption,
} from "@/components/dashboard/ui/SearchableSelectCombobox";

export { SearchableSelectCombobox, type SearchableSelectOption };

const ADAPTIVE_SELECT_SEARCH_THRESHOLD = 6;

import {
  FIELD_LABEL_CLASS,
  FORM_FIELD_CLASS,
} from "@/components/dashboard/ui/uiLayout";
import { formatUILabel } from "@/utils/titleCase";
import {
  API_DATE_PLACEHOLDER,
  apiDateFieldValue,
  apiDateToInputValue,
  finalizeApiDateInput,
  inputValueToApiDate,
  maskApiDateInput,
} from "@/utils/apiDate";

export function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <span className={`inline-flex items-baseline gap-0.5 ${FIELD_LABEL_CLASS}`}>
      <span>{formatUILabel(label)}</span>
      {required ? (
        <span className="shrink-0 text-rose-600 leading-none" aria-hidden>
          *
        </span>
      ) : null}
    </span>
  );
}

function CalendarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
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
    <label className={`${FORM_FIELD_CLASS} ${className ?? ""}`.trim()}>
      <FieldLabel label={label} required={required} />
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className="input-field api-date-field px-3 py-2 pr-10 text-sm w-full"
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
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label={`Open calendar for ${label}`}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-wt-text-muted hover:text-wt-text hover:bg-wt-surface-2 disabled:opacity-50 disabled:pointer-events-none"
          onClick={(e) => {
            e.preventDefault();
            openPicker();
          }}
        >
          <CalendarIcon />
        </button>
      </div>
    </label>
  );
}

export function ReadonlyDateField({ value, className }: { value: string; className?: string }) {
  return (
    <div className={`relative ${className ?? ""}`.trim()}>
      <input
        type="text"
        className="input-field api-date-field w-full px-3 py-2 pr-10 text-sm opacity-80"
        value={apiDateFieldValue(value)}
        placeholder={API_DATE_PLACEHOLDER}
        disabled
        readOnly
        aria-readonly
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-wt-text-muted">
        <CalendarIcon />
      </span>
    </div>
  );
}

export function InputField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  if (type === "date") {
    return (
      <ApiDateField label={label} value={value} onChange={onChange} required={required} />
    );
  }

  return (
    <label className={FORM_FIELD_CLASS}>
      <FieldLabel label={label} required={required} />
      <input
        className="input-field px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
        required={required}
        aria-required={required || undefined}
      />
    </label>
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <label className={`${FORM_FIELD_CLASS} ${className ?? ""}`.trim()}>
      <FieldLabel label={label} required={required} />
      <textarea
        className="input-field min-h-[100px] w-full px-3 py-2 text-sm resize-y"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        aria-required={required || undefined}
        rows={rows}
      />
    </label>
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

function ChevronDownIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wt-text-muted"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  );
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
  const items = normalizeSelectOptions(options);
  return (
    <label className={`text-xs text-wt-text-muted flex flex-col gap-1 ${className ?? ""}`.trim()}>
      <FieldLabel label={label} required={required} />
      <div className="relative">
        <select
          className="input-field w-full appearance-none pr-9"
          value={value}
          required={required}
          disabled={disabled}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="" disabled={required}>
            {placeholder}
          </option>
          {items.map((option) => (
            <option key={`${option.value}-${option.label}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon />
      </div>
    </label>
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
  const items = withPlaceholderOption(normalizeSelectOptions(options), placeholder, required);
  const selectableCount = items.filter((opt) => opt.value !== "").length;
  const useSearch = selectableCount > ADAPTIVE_SELECT_SEARCH_THRESHOLD;
  const dropdownInputClassName =
    "input-field appearance-none px-3 py-2 pr-10 text-sm w-full";

  return (
    <label className={`${FORM_FIELD_CLASS} ${className ?? ""}`.trim()}>
      <FieldLabel label={label} required={required} />
      {useSearch ? (
        <SearchableSelectCombobox
          value={value}
          onChange={onChange}
          options={items}
          placeholder={searchPlaceholder}
          required={required}
          disabled={disabled}
          aria-label={label}
          showChevron
          inputClassName={dropdownInputClassName}
        />
      ) : (
        <DropdownSelect
          value={value}
          onChange={onChange}
          options={items}
          required={required}
          disabled={disabled}
          aria-label={label}
          selectClassName={dropdownInputClassName}
        />
      )}
    </label>
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
  const items = withPlaceholderOption(optionsFromSelectChildren(children), placeholder, required);
  return (
    <label className={`${FORM_FIELD_CLASS} ${className ?? ""}`.trim()}>
      <FieldLabel label={label} required={required} />
      <SearchableSelectCombobox
        value={value}
        onChange={onChange}
        options={items}
        placeholder={placeholder ?? "Search…"}
        required={required}
        disabled={disabled}
        aria-label={label}
      />
    </label>
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
  const isMulti = Boolean(multiple);
  return (
    <label className={FORM_FIELD_CLASS}>
      <FieldLabel label={label} required={required} />
      <input
        type="file"
        accept={accept}
        multiple={isMulti}
        className="input-field px-3 py-2 text-sm"
        onChange={(e) => {
          if (isMulti) {
            onPickFiles?.(e.target.files?.length ? Array.from(e.target.files) : []);
          } else {
            onPick?.(e.target.files?.[0] ?? null);
          }
        }}
      />
    </label>
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
    <div className="rounded-xl border border-wt-border bg-wt-surface-2 p-3 space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <input type="file" className="input-field px-2 py-1.5 text-sm" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
      <p className="text-xs text-wt-text-muted truncate">{file ? file.name : "No file selected"}</p>
      <button type="button" className="btn-primary px-2.5 py-1.5 text-sm" onClick={onUpload} disabled={loading || !file}>
        Upload
      </button>
    </div>
  );
}
