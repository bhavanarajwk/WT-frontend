import type { ComponentProps } from "react";
import {
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  WT_STICKY_TABLE_HEAD_CLASS,
  WT_TABLE_CELL_CLASS,
  WT_TABLE_HEAD_CLASS,
  WT_TABLE_TEXT_CLASS,
} from "@/components/dashboard/ui/tableLayout";

export {
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  WT_STICKY_TABLE_HEAD_CLASS,
  WT_TABLE_CELL_CLASS,
  WT_TABLE_HEAD_CLASS,
  WT_TABLE_TEXT_CLASS,
};

export { TableCheckbox } from "@/components/dashboard/ui/TableCheckbox";

/** Bare table for scroll regions — avoids shadcn Table's inner overflow wrapper (breaks sticky headers). */
export function WtTable({ className, ...props }: ComponentProps<"table">) {
  return (
    <table
      data-slot="table"
      className={cn("wt-scrollable-table w-full caption-bottom text-sm text-wt-text-muted", className)}
      {...props}
    />
  );
}
