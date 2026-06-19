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
  required?: boolean;
  className?: string;
  inputClassName?: string;
  id?: string;
  "aria-label"?: string;
  dropdownAttached?: boolean;
  showChevron?: boolean;
}) {
  const selected = options.find((opt) => opt.value === value) ?? null;

  return (
    <div className={cn("w-full", className)}>
      <Combobox
        items={options}
        value={selected}
        onValueChange={(item) => onChange(item?.value ?? "")}
        itemToStringValue={(item) => item.label}
        disabled={disabled}
      >
      <ComboboxInput
        id={idProp}
        placeholder={placeholder}
        disabled={disabled}
        required={required && !value}
        aria-required={required || undefined}
        aria-label={ariaLabel}
        showTrigger={showChevron}
        showClear={false}
        className={cn("w-full", inputClassName)}
      />
      <ComboboxContent side="bottom" sideOffset={4}>
        <ComboboxEmpty>No matches</ComboboxEmpty>
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
