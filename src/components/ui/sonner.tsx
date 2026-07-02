"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { Check, Info, Loader2, TriangleAlert, X, XCircle } from "lucide-react";
import { TOAST_DURATION_MS } from "@/lib/toast";
import { cn } from "@/lib/utils";

function useWtTheme(): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

function ToastGlyph({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full border",
        className
      )}
    >
      {children}
    </span>
  );
}

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useWtTheme();

  return (
    <Sonner
      theme={theme}
      position="top-right"
      className="wt-toaster group"
      duration={TOAST_DURATION_MS}
      gap={12}
      offset={18}
      visibleToasts={4}
      closeButton
      swipeDirections={["right"]}
      icons={{
        success: (
          <ToastGlyph className="border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Check className="size-4" strokeWidth={2.25} aria-hidden />
          </ToastGlyph>
        ),
        info: (
          <ToastGlyph className="border-sky-200/80 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300">
            <Info className="size-4" strokeWidth={2.25} aria-hidden />
          </ToastGlyph>
        ),
        warning: (
          <ToastGlyph className="border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
            <TriangleAlert className="size-4" strokeWidth={2.25} aria-hidden />
          </ToastGlyph>
        ),
        error: (
          <ToastGlyph className="border-rose-200/80 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300">
            <XCircle className="size-4" strokeWidth={2.25} aria-hidden />
          </ToastGlyph>
        ),
        loading: (
          <ToastGlyph className="border-wt-border-md bg-wt-surface-2 text-wt-brand">
            <Loader2 className="size-4 animate-spin" strokeWidth={2.25} aria-hidden />
          </ToastGlyph>
        ),
        close: <X className="size-3.5" strokeWidth={2.25} aria-hidden />,
      }}
      toastOptions={{
        classNames: {
          toast: "wt-toast group/toast",
          title: "wt-toast__title",
          description: "wt-toast__description",
          content: "wt-toast__content",
          icon: "wt-toast__icon",
          closeButton: "wt-toast__close",
          success: "wt-toast--success",
          error: "wt-toast--error",
          info: "wt-toast--info",
          warning: "wt-toast--warning",
          loading: "wt-toast--loading",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
