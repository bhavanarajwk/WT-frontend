"use client";

import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { formatApiDate, normalizeWeekStart, weekRangeLabel } from "@/utils/timelog/weekDates";

type WeekPickerFieldProps = {
  weekStart: Date;
  onWeekStartChange: (weekStart: Date) => void;
  disabled?: boolean;
  className?: string;
};

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
      className="h-4 w-4 shrink-0"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function WeekPickerField({
  weekStart,
  onWeekStartChange,
  disabled = false,
  className,
}: WeekPickerFieldProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const normalized = normalizeWeekStart(weekStart);

  function openPicker() {
    if (disabled) return;
    try {
      pickerRef.current?.showPicker?.();
    } catch {
      pickerRef.current?.focus();
    }
  }

  function handleDateChange(isoValue: string) {
    if (!isoValue) return;
    const [y, m, d] = isoValue.split("-").map(Number);
    onWeekStartChange(normalizeWeekStart(new Date(y, m - 1, d)));
  }

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`.trim()}>
      <Button variant="outline" size="sm" type="button" disabled={disabled} aria-label="Select week" className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-wt-border rounded-lg hover:bg-wt-surface-2 disabled:opacity-50" onClick={openPicker} >
        <CalendarIcon />
        <span className="whitespace-nowrap">{weekRangeLabel(normalized)}</span>
      </Button>
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        disabled={disabled}
        value={formatApiDate(normalized)}
        onChange={(e) => handleDateChange(e.target.value)}
      />
    </div>
  );
}
