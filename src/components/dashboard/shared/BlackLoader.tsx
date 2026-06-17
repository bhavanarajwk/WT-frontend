type BlackLoaderProps = {
  label?: string;
  size?: "md" | "sm";
};

export function BlackLoader({ label = "Loading", size = "md" }: BlackLoaderProps) {
  return (
    <span
      className={size === "sm" ? "spinner-dark-sm" : "spinner-dark"}
      role="status"
      aria-label={label}
    />
  );
}

type LoadingOverlayProps = {
  label?: string;
  className?: string;
};

export function LoadingOverlay({ label = "Loading", className }: LoadingOverlayProps) {
  return (
    <div
      className={`absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-wt-surface-1/80 ${className ?? ""}`.trim()}
      aria-busy="true"
      aria-live="polite"
    >
      <BlackLoader label={label} />
    </div>
  );
}

type LoadingPanelProps = {
  label?: string;
  className?: string;
};

export function LoadingPanel({ label = "Loading", className }: LoadingPanelProps) {
  return (
    <div
      className={`flex min-h-[12rem] items-center justify-center rounded-xl border border-wt-border bg-wt-surface-2/30 ${className ?? ""}`.trim()}
      aria-busy="true"
      aria-live="polite"
    >
      <BlackLoader label={label} />
    </div>
  );
}
