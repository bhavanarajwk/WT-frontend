"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type TableCheckboxProps = Omit<ComponentProps<typeof Checkbox>, "onCheckedChange"> & {
  onCheckedChange?: (checked: boolean) => void;
  /** Stop row click propagation in data tables. Default true. */
  stopRowClick?: boolean;
};

/** Shared shadcn checkbox for data tables and selectable lists. */
export function TableCheckbox({
  className,
  onCheckedChange,
  onClick,
  stopRowClick = true,
  ...props
}: TableCheckboxProps) {
  return (
    <Checkbox
      className={cn(className)}
      onCheckedChange={(checked) => onCheckedChange?.(Boolean(checked))}
      onClick={(event) => {
        if (stopRowClick) event.stopPropagation();
        onClick?.(event);
      }}
      {...props}
    />
  );
}
