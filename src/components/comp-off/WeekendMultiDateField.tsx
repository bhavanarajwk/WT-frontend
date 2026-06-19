"use client";

import { useRef, useState } from "react";
import { FieldLabel } from "@/components/dashboard/ui/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  API_DATE_PLACEHOLDER,
  apiDateFieldValue,
  compareApiDates,
  finalizeApiDateInput,
  inputValueToApiDate,
  maskApiDateInput,
  normalizeToApiDate,
} from "@/utils/apiDate";
import { isWeekendYmd } from "@/utils/compOff";

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

function sortDatesAsc(dates: string[]): string[] {
  return [...dates].sort((a, b) => compareApiDates(a, b));
}

export function WeekendMultiDateField({
  label,
  value,
  onChange,
  required = false,
  maxDates = 2,
  disabled = false,
  className,
}: {
  label: string;
  value: string[];
  onChange: (dates: string[]) => void;
  required?: boolean;
  maxDates?: number;
  disabled?: boolean;
  className?: string;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  function tryAddDate(raw: string) {
    const normalized = normalizeToApiDate(finalizeApiDateInput(raw));
    if (!normalized) {
      const digits = raw.replace(/\D/g, "");
      if (digits.length >= 8) {
        setError(`Enter a valid date (${API_DATE_PLACEHOLDER}).`);
      }
      return false;
    }
    if (!isWeekendYmd(normalized)) {
      setError("Only weekends (Saturday or Sunday) can be selected.");
      return false;
    }
    if (value.includes(normalized)) {
      setError("This date is already selected.");
      return false;
    }
    if (value.length >= maxDates) {
      setError(`You can select up to ${maxDates} weekend date${maxDates === 1 ? "" : "s"}.`);
      return false;
    }
    setError("");
    onChange(sortDatesAsc([...value, normalized]));
    setDraft("");
    return true;
  }

  function openPicker() {
    if (disabled || value.length >= maxDates) return;
    try {
      pickerRef.current?.showPicker?.();
    } catch {
      pickerRef.current?.focus();
    }
  }

  function removeDate(date: string) {
    onChange(value.filter((d) => d !== date));
    setError("");
  }

  const atMax = value.length >= maxDates;

  return (
    <Field className={cn("flex flex-col gap-1.5", className)}>
      <FieldLabel label={label} required={required} />
      <div className="relative">
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className="api-date-field h-10 pr-10"
          value={draft}
          placeholder={atMax ? "Maximum dates selected" : API_DATE_PLACEHOLDER}
          disabled={disabled || atMax}
          aria-required={required || undefined}
          pattern="\d{2}/\d{2}/\d{4}"
          title={`Weekends only — ${API_DATE_PLACEHOLDER}`}
          onChange={(e) => {
            const next = maskApiDateInput(e.target.value);
            setDraft(next);
            if (next.replace(/\D/g, "").length === 8) {
              tryAddDate(next);
            } else if (error) {
              setError("");
            }
          }}
          onBlur={(e) => {
            const raw = e.target.value.trim();
            if (!raw) {
              setDraft("");
              setError("");
              return;
            }
            tryAddDate(raw);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (draft.trim()) tryAddDate(draft);
            }
          }}
        />
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          disabled={disabled || atMax}
          onChange={(e) => {
            const apiDate = inputValueToApiDate(e.target.value);
            if (apiDate) tryAddDate(apiDate);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          tabIndex={-1}
          disabled={disabled || atMax}
          aria-label={`Open calendar for ${label}`}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-wt-text-muted hover:text-wt-text hover:bg-wt-surface-2"
          onClick={(e) => {
            e.preventDefault();
            openPicker();
          }}
        >
          <CalendarIcon />
        </Button>
      </div>
      {value.length ? (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {value.map((date) => (
            <span
              key={date}
              className="inline-flex items-center gap-1 rounded-lg border border-wt-border bg-wt-surface-2 px-2 py-1 text-xs text-wt-text"
            >
              {apiDateFieldValue(date)}
              {!disabled ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="rounded p-0.5 text-wt-text-muted hover:text-rose-600 hover:bg-wt-surface-3"
                  aria-label={`Remove ${date}`}
                  onClick={() => removeDate(date)}
                >
                  ×
                </Button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
      {error ? (
        <p className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </Field>
  );
}
