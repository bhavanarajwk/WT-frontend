"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { type LeaveManagerOption } from "@/services/hrms.service";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldLabel } from "@/components/dashboard/ui/forms";
import { useEmployeeManagers } from "@/hooks/leave/useEmployeeManagers";
import { X } from "lucide-react";

function optionLabel(option: LeaveManagerOption): string {
  const name = option.name?.trim() || option.email;
  return `${name} (${option.email})`;
}

function matchesQuery(option: LeaveManagerOption, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const empId = String(option.employeeId ?? option.employee_id ?? "").trim();
  return (
    option.email.toLowerCase().includes(q) ||
    (option.name ?? "").toLowerCase().includes(q) ||
    empId.toLowerCase().includes(q)
  );
}

export function LeaveManagerSelector({
  selectedEmails,
  onChange,
  disabled = false,
}: {
  selectedEmails: string[];
  onChange: (emails: string[]) => void;
  disabled?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  const managersQ = useEmployeeManagers(debouncedQuery, open);
  const options = managersQ.data ?? [];
  const loading = managersQ.isLoading && !managersQ.data;
  const searching = managersQ.isFetching && Boolean(managersQ.data);
  const error = managersQ.error instanceof Error ? managersQ.error.message : null;

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selectedSet = useMemo(
    () => new Set(selectedEmails.map((email) => email.trim().toLowerCase()).filter(Boolean)),
    [selectedEmails]
  );

  const optionByEmail = useMemo(() => {
    const map = new Map<string, LeaveManagerOption>();
    for (const option of options) {
      const email = String(option.email ?? "").trim().toLowerCase();
      if (email) map.set(email, option);
    }
    return map;
  }, [options]);

  const filteredOptions = useMemo(
    () => options.filter((option) => matchesQuery(option, query)),
    [options, query]
  );

  const toggleEmail = (email: string, checked: boolean) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    const next = new Set(selectedSet);
    if (checked) next.add(normalized);
    else next.delete(normalized);
    const ordered = selectedEmails
      .map((value) => value.trim().toLowerCase())
      .filter((value) => next.has(value));
    for (const value of next) {
      if (!ordered.includes(value)) {
        const match = options.find(
          (row) => String(row.email ?? "").trim().toLowerCase() === value
        );
        ordered.push(String(match?.email ?? value).trim());
      }
    }
    onChange(ordered);
  };

  const removeEmail = (email: string) => {
    toggleEmail(email, false);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error && !options.length) {
    return (
      <div className="space-y-2">
        <FieldLabel label="Primary managers" required />
        <p className="text-sm text-rose-700">Unable to load managers. Please try again.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => void managersQ.refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2" ref={rootRef}>
      <FieldLabel label="Primary managers" required />

      <div className="relative">
        <input
          type="search"
          className="input-field h-10 w-full px-3 py-2 text-sm"
          placeholder="Search employee or manager..."
          value={query}
          disabled={disabled}
          autoComplete="off"
          aria-controls={listId}
          aria-expanded={open}
          aria-haspopup="listbox"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
        />

        {open ? (
          <div
            id={listId}
            role="listbox"
            aria-multiselectable="true"
            className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-wt-border bg-wt-surface-1 p-2 shadow-lg"
          >
            <div className="max-h-52 overflow-auto rounded-lg border border-wt-border">
              {searching ? (
                <p className="px-3 py-2 text-sm text-wt-text-muted">Searching…</p>
              ) : filteredOptions.length ? (
                filteredOptions.map((option) => {
                  const email = String(option.email ?? "").trim();
                  if (!email) return null;
                  const checked = selectedSet.has(email.toLowerCase());
                  return (
                    <label
                      key={email}
                      className="flex cursor-pointer items-start gap-2 px-3 py-2 text-sm hover:bg-wt-surface-2"
                    >
                      <Checkbox
                        className="mt-0.5"
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={(next) => toggleEmail(email, Boolean(next))}
                      />
                      <span className="font-medium">{optionLabel(option)}</span>
                    </label>
                  );
                })
              ) : (
                <p className="px-3 py-2 text-sm text-wt-text-muted">No managers match your search.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {selectedEmails.length ? (
        <div className="flex flex-wrap gap-2">
          {selectedEmails.map((email) => {
            const option = optionByEmail.get(email.trim().toLowerCase());
            const chipLabel = option?.name?.trim() || email;
            return (
              <span
                key={email}
                className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-sm text-sky-900"
                title={option ? optionLabel(option) : email}
              >
                <span className="max-w-[220px] truncate">{chipLabel}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="size-5 rounded-full text-sky-700 hover:bg-sky-200/80 hover:text-sky-900"
                  aria-label={`Remove ${chipLabel}`}
                  disabled={disabled}
                  onClick={() => removeEmail(email)}
                >
                  <X className="size-3.5" aria-hidden />
                </Button>
              </span>
            );
          })}
        </div>
      ) : null}

      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
