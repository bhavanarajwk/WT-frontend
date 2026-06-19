"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { hrmsService, type LeaveRecipientOption } from "@/services/hrms.service";
import { Badge } from "@/components/ui/badge";
import { filledBadgeClass } from "@/components/dashboard/ui/badgeTones";
import { unwrapLeaveOptionItems } from "@/utils/leaveApiOptions";

function optionLabel(option: LeaveRecipientOption): string {
  const name = option.name?.trim() || option.email;
  const empId = option.emp_id?.trim();
  return empId ? `${name} (${empId})` : name;
}

function matchesQuery(option: LeaveRecipientOption, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    option.email.toLowerCase().includes(q) ||
    (option.name ?? "").toLowerCase().includes(q) ||
    (option.emp_id ?? "").toLowerCase().includes(q)
  );
}

export function LeaveAdditionalRecipientsSelector({
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
  const [options, setOptions] = useState<LeaveRecipientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const loadOptions = useCallback(async (search?: string) => {
    setSearching(true);
    setError(null);
    try {
      const res = await hrmsService.getLeaveRecipientOptions(
        search?.trim() ? { search: search.trim() } : undefined
      );
      const items = unwrapLeaveOptionItems<LeaveRecipientOption>(res);
      setOptions(items);
    } catch (err) {
      setOptions([]);
      setError(err instanceof Error ? err.message : "Could not load employees.");
    } finally {
      setSearching(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void loadOptions(query);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [open, query, loadOptions]);

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

  const selectedOptions = useMemo(() => {
    const byEmail = new Map(
      options.map((option) => [String(option.email).trim().toLowerCase(), option] as const)
    );
    return selectedEmails
      .map((email) => byEmail.get(email.trim().toLowerCase()))
      .filter((option): option is LeaveRecipientOption => Boolean(option));
  }, [options, selectedEmails]);

  const filteredOptions = useMemo(() => options.filter((option) => matchesQuery(option, query)), [options, query]);

  const toggleEmail = (email: string, checked: boolean) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    const next = new Set(selectedSet);
    if (checked) next.add(normalized);
    else next.delete(normalized);
    const ordered = options
      .map((row) => String(row.email ?? "").trim().toLowerCase())
      .filter((value) => next.has(value));
    for (const value of next) {
      if (!ordered.includes(value)) ordered.push(value);
    }
    onChange(ordered);
  };

  const removeEmail = (email: string) => {
    toggleEmail(email, false);
  };

  if (loading) {
    return <p className="text-sm text-wt-text-muted">Loading employees…</p>;
  }

  if (error && !options.length) {
    return <p className="text-sm text-rose-700">{error}</p>;
  }

  return (
    <div className="space-y-2" ref={rootRef}>
      <p className="text-sm font-medium">Leave Notification Recipients</p>
      <p className="text-xs text-wt-text-muted">
        Optional. Select one or more employees; each receives the leave notification email at their
        work address.
      </p>

      {selectedOptions.length ? (
        <div className="flex flex-wrap gap-2">
          {selectedEmails.map((email) => {
            const option = selectedOptions.find(
              (row) => row.email.trim().toLowerCase() === email.trim().toLowerCase()
            );
            const label = option ? optionLabel(option) : email;
            return (
              <Badge
                key={email}
                variant="secondary"
                className={`gap-1 pr-1 ${filledBadgeClass("neutral")}`}
              >
                <span className="max-w-[220px] truncate">{label}</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${label}`}
                  disabled={disabled}
                  onClick={() => removeEmail(email)}
                >
                  ×
                </button>
              </Badge>
            );
          })}
        </div>
      ) : null}

      <div className="relative">
        <button
          type="button"
          className="input-field flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listId}
          disabled={disabled}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="text-wt-text-muted">
            {selectedEmails.length ? `${selectedEmails.length} selected` : "Select employees…"}
          </span>
          <span aria-hidden>▾</span>
        </button>

        {open ? (
          <div
            id={listId}
            role="listbox"
            aria-multiselectable="true"
            className="absolute left-0 right-0 top-full z-50 mt-1 space-y-2 rounded-xl border border-wt-border bg-wt-surface-1 p-2 shadow-lg"
          >
            <input
              type="search"
              className="input-field w-full px-3 py-2 text-sm"
              placeholder="Search employees…"
              value={query}
              disabled={disabled}
              autoComplete="off"
              autoFocus
              onChange={(event) => setQuery(event.target.value)}
            />
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
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={checked}
                        disabled={disabled}
                        onChange={(event) => toggleEmail(email, event.target.checked)}
                      />
                      <span>
                        <span className="font-medium">{optionLabel(option)}</span>
                        <span className="block text-xs text-wt-text-muted">{email}</span>
                      </span>
                    </label>
                  );
                })
              ) : (
                <p className="px-3 py-2 text-sm text-wt-text-muted">No employees match your search.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
