"use client";

import { useEffect, useMemo, useState } from "react";
import { hrmsService, type LeaveManagerOption } from "@/services/hrms.service";
import { unwrapLeaveOptionItems } from "@/utils/leaveApiOptions";

function optionLabel(option: LeaveManagerOption): string {
  const name = option.name?.trim() || option.email;
  const project = option.project_name?.trim() || option.project_code?.trim();
  return project ? `${name} (${project})` : name;
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
  const [options, setOptions] = useState<LeaveManagerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await hrmsService.getLeaveManagerOptions();
        const items = unwrapLeaveOptionItems<LeaveManagerOption>(res);
        if (!cancelled) setOptions(items);
      } catch (err) {
        if (!cancelled) {
          setOptions([]);
          setError(err instanceof Error ? err.message : "Could not load managers.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (disabled || selectedEmails.length || !options.length) return;
    const defaultOnly = options.filter((option) =>
      String(option.project_name ?? "").toLowerCase().includes("default approver")
    );
    if (defaultOnly.length !== 1) return;
    const email = String(defaultOnly[0].email ?? "").trim();
    if (email) onChange([email]);
  }, [disabled, onChange, options, selectedEmails.length]);

  const selectedSet = useMemo(
    () => new Set(selectedEmails.map((email) => email.trim().toLowerCase()).filter(Boolean)),
    [selectedEmails]
  );

  if (loading) {
    return <p className="text-sm text-wt-text-muted">Loading managers…</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-700">{error}</p>;
  }

  if (!options.length) {
    return (
      <p className="text-sm text-wt-text-muted">
        No managers are available for your current project allocations.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        Select Managers <span className="text-rose-600">*</span>
      </p>
      <p className="text-xs text-wt-text-muted">
        Selected managers receive a notification and can approve or reject your leave in WebTrak.
      </p>
      <div className="max-h-48 space-y-2 overflow-auto rounded-xl border border-wt-border bg-wt-surface-2/30 p-3">
        {options.map((option) => {
          const email = String(option.email ?? "").trim();
          if (!email) return null;
          const checked = selectedSet.has(email.toLowerCase());
          return (
            <label
              key={email}
              className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-wt-surface-2"
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={checked}
                disabled={disabled}
                onChange={(event) => {
                  const next = new Set(selectedSet);
                  if (event.target.checked) next.add(email.toLowerCase());
                  else next.delete(email.toLowerCase());
                  const ordered = options
                    .map((row) => String(row.email ?? "").trim().toLowerCase())
                    .filter((value) => next.has(value));
                  onChange(ordered);
                }}
              />
              <span className="text-sm">
                <span className="font-medium">{optionLabel(option)}</span>
                <span className="block text-xs text-wt-text-muted">{email}</span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
