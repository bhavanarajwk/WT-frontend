"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

export type SearchableSelectOption = { value: string; label: string };

export function SearchableSelectCombobox({
  value,
  onChange,
  options,
  placeholder = "Search…",
  disabled = false,
  loading = false,
  loadingLabel = "Loading…",
  required = false,
  className = "",
  inputClassName,
  id: idProp,
  "aria-label": ariaLabel,
  dropdownAttached = false,
  showChevron = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  id?: string;
  "aria-label"?: string;
  dropdownAttached?: boolean;
  showChevron?: boolean;
}) {
  const selected = options.find((opt) => opt.value === value) ?? null;
  const isDisabled = disabled || loading;

  return (
    <div className={cn("w-full", className)}>
      <Combobox
        items={options}
        value={selected}
        onValueChange={(item) => onChange(item?.value ?? "")}
        itemToStringValue={(item) => item.label}
        disabled={isDisabled}
      >
      <ComboboxInput
        id={idProp}
        placeholder={loading ? loadingLabel : placeholder}
        disabled={isDisabled}
        required={required && !value}
        aria-required={required || undefined}
        aria-busy={loading || undefined}
        aria-label={ariaLabel}
        showTrigger={showChevron}
        showClear={false}
        className={cn("w-full", inputClassName)}
      />
      <ComboboxContent side="bottom" sideOffset={4}>
        <ComboboxEmpty>{loading ? loadingLabel : "No matches"}</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item.value || `opt-${item.label}`} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
      </Combobox>
    </div>
  );
}
