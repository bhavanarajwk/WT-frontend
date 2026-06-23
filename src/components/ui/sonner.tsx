"use client";

import { useEffect, useState } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";

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

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useWtTheme();

  return (
    <Sonner
      theme={theme}
      position="top-right"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-600" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4 text-rose-600" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast !rounded-xl !border !shadow-lg !px-4 !py-3 !text-sm !font-medium",
          success:
            "!border-emerald-200 !bg-emerald-50 !text-emerald-900 dark:!border-emerald-500/30 dark:!bg-emerald-950/90 dark:!text-emerald-100",
          error:
            "!border-rose-200 !bg-rose-50 !text-rose-900 dark:!border-rose-500/30 dark:!bg-rose-950/90 dark:!text-rose-100",
          title: "!font-semibold",
          description: "!text-inherit",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
