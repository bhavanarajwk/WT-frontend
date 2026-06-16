"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

export type SearchableSelectOption = { value: string; label: string };

function optionMatchesQuery(option: SearchableSelectOption, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    option.label.toLowerCase().includes(q) || option.value.toLowerCase().includes(q)
  );
}

export function SearchableSelectCombobox({
  value,
  onChange,
  options,
  placeholder = "Search…",
  disabled = false,
  required = false,
  className = "",
  inputClassName = "input-field px-3 py-2 text-sm w-full",
  id: idProp,
  "aria-label": ariaLabel,
  dropdownAttached = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  id?: string;
  "aria-label"?: string;
  /** Drop the list flush on the input (no gap) so it overlays content below. */
  dropdownAttached?: boolean;
}) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const listId = `${id}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );
  const selectedLabel = selected?.label ?? "";

  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedLabel);
    }
  }, [selectedLabel, isOpen]);

  const filteredOptions = useMemo(() => {
    const q = isOpen ? query : "";
    return options.filter((opt) => optionMatchesQuery(opt, q));
  }, [options, query, isOpen]);

  const selectOption = useCallback(
    (opt: SearchableSelectOption) => {
      onChange(opt.value);
      setQuery(opt.label);
      setIsOpen(false);
    },
    [onChange]
  );

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const displayValue = isOpen ? query : selectedLabel;

  return (
    <div ref={rootRef} className={`relative ${className}`.trim()}>
      <input
        type="text"
        id={id}
        className={inputClassName}
        value={displayValue}
        disabled={disabled}
        required={required && !value}
        aria-required={required || undefined}
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        placeholder={placeholder}
        onFocus={() => {
          if (!disabled) {
            setIsOpen(true);
            setQuery("");
          }
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setQuery(selectedLabel);
          }, 150);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setIsOpen(false);
            setQuery(selectedLabel);
          }
          if (e.key === "Enter" && isOpen && filteredOptions.length === 1) {
            e.preventDefault();
            selectOption(filteredOptions[0]);
          }
        }}
      />
      {isOpen && !disabled ? (
        <ul
          id={listId}
          role="listbox"
          className={`absolute z-50 max-h-56 w-full overflow-auto border border-wt-border bg-wt-surface-1 py-1 text-sm shadow-lg ${
            dropdownAttached
              ? "left-0 right-0 top-full -mt-px rounded-b-lg"
              : "mt-1 rounded-lg"
          }`}
        >
          {filteredOptions.length === 0 ? (
            <li className="px-3 py-2 text-wt-text-muted">No matches</li>
          ) : (
            filteredOptions.map((opt) => (
              <li key={opt.value || `opt-${opt.label}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === opt.value}
                  className={`block w-full px-3 py-2 text-left hover:bg-wt-surface-2 ${
                    value === opt.value ? "bg-wt-surface-2 font-medium" : ""
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectOption(opt)}
                >
                  {opt.label}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
