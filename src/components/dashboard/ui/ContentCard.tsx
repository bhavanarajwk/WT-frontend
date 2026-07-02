import type { ReactNode } from "react";

import { CONTENT_CARD_CLASS } from "@/components/dashboard/ui/uiLayout";
import { cn } from "@/lib/utils";

export function ContentCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={cn(CONTENT_CARD_CLASS, className)}>{children}</section>;
}
