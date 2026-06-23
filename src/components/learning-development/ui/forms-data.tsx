"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export { DataTable } from "@/components/dashboard/ui/DataTable";
export { TrainingStatusBadge as StatusBadge } from "@/components/dashboard/ui/WtStatusBadge";

export function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <Button
        type="button"
        variant="ghost"
        className="absolute inset-0 h-full w-full rounded-none bg-black/40 backdrop-blur-[1px] hover:bg-black/40"
        aria-label="Close panel"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-wt-border bg-wt-surface-1 shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between border-b border-wt-border px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="border-t border-wt-border px-5 py-4">{footer}</div> : null}
      </aside>
    </div>
  );
}
