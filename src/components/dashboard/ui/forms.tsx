"use client";

import { useRef } from "react";

export function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="text-xs text-wt-text-muted flex flex-col gap-1">
      {label}
      <input className="input-field px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)} type={type} />
    </label>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs text-wt-text-muted flex flex-col gap-1">
      {label}
      <select className="input-field px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
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

export function DatePickerField({
  label,
  value,
  onChange,
  disabled = false,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  min?: string;
  max?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    if (disabled) return;
    try {
      inputRef.current?.showPicker?.();
    } catch {
      inputRef.current?.focus();
    }
  }

  return (
    <label className="text-xs text-wt-text-muted flex flex-col gap-1">
      {label}
      <div className="relative">
        <input
          ref={inputRef}
          type="date"
          className="input-field date-picker-field px-3 py-2 pr-10 text-sm w-full"
          value={value}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onClick={openPicker}
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

export function FileField({
  label,
  onPick,
  onPickFiles,
  accept,
  multiple,
}: {
  label: string;
  accept?: string;
  multiple?: boolean;
  onPick?: (file: File | null) => void;
  onPickFiles?: (files: File[]) => void;
}) {
  const isMulti = Boolean(multiple);
  return (
    <label className="text-xs text-wt-text-muted flex flex-col gap-1">
      {label}
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
