import * as React from "react";

import { cn } from "@/lib/utils";
import {
  CARD_CONTENT_CLASS,
  CARD_FOOTER_CLASS,
  CARD_HEADER_CLASS,
  CARD_TOOLBAR_CLASS,
  SECTION_DESCRIPTION_CLASS,
  SECTION_TITLE_CLASS,
} from "@/components/dashboard/ui/uiLayout";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-2xl border border-wt-border bg-wt-surface-1 text-wt-text shadow-sm",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5", CARD_HEADER_CLASS, className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3 data-slot="card-title" className={cn(SECTION_TITLE_CLASS, className)} {...props} />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn(SECTION_DESCRIPTION_CLASS, "mt-0", className)}
      {...props}
    />
  );
}

function CardToolbar({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-toolbar" className={cn(CARD_TOOLBAR_CLASS, className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn(CARD_CONTENT_CLASS, className)} {...props} />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center border-t border-wt-border", CARD_FOOTER_CLASS, className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardToolbar,
  CardContent,
  CardFooter,
};
