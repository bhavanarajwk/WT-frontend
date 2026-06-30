import { Info } from "lucide-react";

export function LeaveCcRecipientsNotice() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-wt-text-muted">
      <Info className="size-3.5 shrink-0" aria-hidden />
      HR recipients are automatically notified.
    </p>
  );
}
