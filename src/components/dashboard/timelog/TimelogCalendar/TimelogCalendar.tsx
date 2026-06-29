"use client";

import { useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { showErrorToast } from "@/lib/toast";
import { DAYS_OF_WEEK } from "@/hooks/timelog/useDayTimelog";
import "./TimelogCalendar.css";
import type { TimelogCalendarProps } from "./TimelogCalendar.types";

const MONTH_OPTIONS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function TimelogCalendar({
  calendar,
  selectedDate,
  loading,
  viewYear,
  viewMonth,
  doj,
  onSelectDate,
  onNavigate,
  onGoToToday,
  onGoToMonth,
}: TimelogCalendarProps) {
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const dojDate = useMemo(() => {
    if (!doj) return null;
    const d = new Date(doj);
    return isNaN(d.getTime()) ? null : d;
  }, [doj]);

  const yearOptions = useMemo(() => {
    const startYear = dojDate ? dojDate.getFullYear() : currentYear;
    const years: number[] = [];
    for (let y = startYear; y <= currentYear; y++) years.push(y);
    return years;
  }, [dojDate, currentYear]);

  const monthOptions = useMemo(() => {
    if (!dojDate || viewYear > dojDate.getFullYear()) {
      return viewYear >= currentYear
        ? MONTH_OPTIONS.map((_, i) => i).filter((m) => m <= currentMonth)
        : MONTH_OPTIONS.map((_, i) => i);
    }
    if (viewYear === dojDate.getFullYear()) {
      return MONTH_OPTIONS.map((_, i) => i).filter((m) => m >= dojDate.getMonth() && (viewYear < currentYear || m <= currentMonth));
    }
    return viewYear >= currentYear
      ? MONTH_OPTIONS.map((_, i) => i).filter((m) => m <= currentMonth)
      : MONTH_OPTIONS.map((_, i) => i);
  }, [dojDate, viewYear, currentYear, currentMonth]);

  const handleSelectDate = useCallback(
    (dateKey: string, isFuture: boolean) => {
      if (isFuture) {
        showErrorToast("You cannot add timelogs for future dates");
        return;
      }
      onSelectDate(dateKey);
    },
    [onSelectDate]
  );

  return (
    <div className="timelog-calendar">
      <div className="timelog-calendar-header">
        <div className="timelog-calendar-nav">
          {dojDate ? (
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={loading || (viewYear === dojDate.getFullYear() && viewMonth === dojDate.getMonth())}
              onClick={() => onNavigate(-1)}
            >
              ←
            </Button>
          ) : null}
          {dojDate ? (
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={loading || (viewYear === currentYear && viewMonth === currentMonth)}
              onClick={() => onNavigate(1)}
            >
              →
            </Button>
          ) : null}
          <select
            className="timelog-calendar-select"
            value={viewMonth}
            onChange={(e) => onGoToMonth(viewYear, Number(e.target.value))}
          >
            {monthOptions.map((i) => (
              <option key={i} value={i}>
                {MONTH_OPTIONS[i]}
              </option>
            ))}
          </select>
          <select
            className="timelog-calendar-select"
            value={viewYear}
            onChange={(e) => onGoToMonth(Number(e.target.value), viewMonth)}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={loading}
            onClick={onGoToToday}
          >
            Today
          </Button>
        </div>
      </div>

      <div className="timelog-calendar-grid">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="timelog-calendar-day-header">
            {d}
          </div>
        ))}
        {calendar.days.map((day) => {
          const isSelected = selectedDate === day.dateKey;
          const hasEntries = day.entryCount > 0;
          const classNames = [
            "timelog-calendar-cell",
            day.isCurrentMonth ? "" : "timelog-calendar-cell--other-month",
            day.isToday ? "timelog-calendar-cell--today" : "",
            isSelected && !day.isFuture ? "timelog-calendar-cell--selected" : "",
            hasEntries ? "timelog-calendar-cell--has-entries" : "",
            day.isFuture ? "timelog-calendar-cell--future" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <div
              key={day.dateKey}
              className={classNames}
              onClick={() => handleSelectDate(day.dateKey, day.isFuture)}
            >
              <div className="timelog-calendar-cell-top">
                <span
                  className={`timelog-calendar-day-num${hasEntries ? " timelog-calendar-day-num--has-entries" : ""}`}
                >
                  {day.day}
                </span>
                {hasEntries ? (
                  <span className="timelog-calendar-entry-dot" />
                ) : null}
              </div>
              {hasEntries ? (
                <div className="timelog-calendar-day-info">
                  <span className="timelog-calendar-hours">
                    {day.totalHours}h
                  </span>
                  <span className="timelog-calendar-entries">
                    {day.entryCount}{" "}
                    {day.entryCount === 1 ? "entry" : "entries"}
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
