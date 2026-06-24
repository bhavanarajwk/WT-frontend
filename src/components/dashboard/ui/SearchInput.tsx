"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

export function SearchInput({
  value,
  onChange,
  id = "management-list-search",
  placeholder = "Search",
  className,
  disabled = false,
  "aria-label": ariaLabel = "Search",
}: SearchInputProps) {
  return (
    <Input
      id={id}
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn("h-10 w-full", className)}
    />
  );
}
