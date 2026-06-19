"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ApiError } from "@/api/error";
import { hrmsService } from "@/services/hrms.service";
import type { Designation } from "@/types/masters";
import { parseDesignation, parseDesignationList } from "@/utils/masters";
import { FieldLabel } from "@/components/dashboard/ui/forms";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

const SEARCH_DEBOUNCE_MS = 300;

export function DesignationCombobox({
  bandId,
  department,
  value,
  onChange,
  disabled = false,
  required = false,
  canCreate = false,
  onError,
}: {
  bandId: number;
  department: string;
  value: string;
  onChange: (designationName: string) => void;
  disabled?: boolean;
  required?: boolean;
  canCreate?: boolean;
  onError?: (message: string) => void;
}) {
  const inputId = useId();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<Designation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const prerequisitesMet = bandId > 0 && Boolean(department.trim());
  const isDisabled = disabled || !prerequisitesMet;

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!prerequisitesMet) {
      setOptions([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void (async () => {
        setIsSearching(true);
        try {
          const res = await hrmsService.searchDesignations({
            band_id: bandId,
            department: department.trim(),
            search: query.trim() || undefined,
          });
          setOptions(parseDesignationList(res));
        } catch (error) {
          setOptions([]);
          const message =
            error instanceof ApiError
              ? error.message
              : error instanceof Error
                ? error.message
                : "Could not load designations.";
          onError?.(message);
        } finally {
          setIsSearching(false);
        }
      })();
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [bandId, department, query, prerequisitesMet, onError]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const trimmedQuery = query.trim();
  /** Only match API results — not the free-typed `value` (always equals `query` while typing). */
  const hasExactMatchInList = useMemo(
    () =>
      Boolean(trimmedQuery) &&
      options.some((item) => item.name.toLowerCase() === trimmedQuery.toLowerCase()),
    [options, trimmedQuery]
  );

  const showAddOption =
    canCreate &&
    Boolean(trimmedQuery) &&
    !hasExactMatchInList &&
    !isSearching &&
    prerequisitesMet;

  const selectDesignation = useCallback(
    (name: string) => {
      onChange(name);
      setQuery(name);
      setIsOpen(false);
    },
    [onChange]
  );

  const handleCreate = async () => {
    if (!trimmedQuery || !prerequisitesMet) return;
    setIsCreating(true);
    try {
      const res = await hrmsService.createDesignation({
        band_id: bandId,
        department: department.trim(),
        name: trimmedQuery,
      });
      const created = parseDesignation(res);
      if (!created?.name) {
        throw new Error("Designation was created but the response was invalid.");
      }
      selectDesignation(created.name);
      setOptions((prev) => {
        if (prev.some((p) => p.id === created.id)) return prev;
        return [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
      });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not create designation.";
      if (error instanceof ApiError && error.status === 400) {
        try {
          const res = await hrmsService.searchDesignations({
            band_id: bandId,
            department: department.trim(),
            search: trimmedQuery,
          });
          const refreshed = parseDesignationList(res);
          setOptions(refreshed);
          const hit = refreshed.find(
            (item) => item.name.toLowerCase() === trimmedQuery.toLowerCase()
          );
          if (hit) {
            selectDesignation(hit.name);
            return;
          }
        } catch {
          // fall through to toast
        }
      }
      onError?.(message);
    } finally {
      setIsCreating(false);
    }
  };

  const placeholder = !prerequisitesMet
    ? "Select band and department first"
    : "Search or select designation";

  return (
    <Field className="flex flex-col gap-1.5">
      <FieldLabel label="Designation" required={required} htmlFor={inputId} />
      <div ref={rootRef} className="relative">
        <Input
          id={inputId}
          type="text"
          value={query}
          disabled={isDisabled}
          required={required}
          aria-required={required || undefined}
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={placeholder}
          onFocus={() => {
            if (!isDisabled) setIsOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
        />
        {isOpen && !isDisabled ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-wt-border bg-wt-surface-1 py-1 text-sm shadow-lg"
          >
            {isSearching ? (
              <li className="px-3 py-2 text-wt-text-muted">Searching…</li>
            ) : null}
            {!isSearching && options.length === 0 && !showAddOption ? (
              <li className="px-3 py-2 text-wt-text-muted">
                {trimmedQuery ? "No matches" : "Type to search designations"}
              </li>
            ) : null}
            {options.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === item.name}
                  className={`block w-full px-3 py-2 text-left hover:bg-wt-surface-2 ${
                    value === item.name ? "bg-wt-surface-2 font-medium" : ""
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectDesignation(item.name)}
                >
                  {item.name}
                </button>
              </li>
            ))}
            {showAddOption ? (
              <li className="border-t border-wt-border">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
                  disabled={isCreating}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void handleCreate()}
                >
                  {isCreating ? "Adding…" : `Add "${trimmedQuery}" as new designation`}
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </Field>
  );
}
