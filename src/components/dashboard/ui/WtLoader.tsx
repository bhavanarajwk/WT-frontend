"use client";

type WtLoaderProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
};

export function WtLoader({ size = "md", className = "", label = "Loading" }: WtLoaderProps) {
  return (
    <span
      className={`wt-loader wt-loader--${size} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={label}
    />
  );
}

export function WtLoaderCentered({
  label = "Loading",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`.trim()}>
      <WtLoader size="lg" label={label} />
      {label ? <p className="text-sm text-wt-text-muted">{label}</p> : null}
    </div>
  );
}

export function WtLoadingOverlay({ label = "Loading" }: { label?: string }) {
  return (
    <div className="wt-loading-overlay" role="status" aria-live="polite" aria-busy="true" aria-label={label}>
      <WtLoader size="lg" label={label} />
    </div>
  );
}
