function ToastIcon({ type }: { type: "success" | "error" }) {
  if (type === "success") {
    return (
      <svg
        className="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function DashboardToast({
  toast,
  position = "bottom",
}: {
  toast: { type: "success" | "error"; message: string } | null;
  position?: "top" | "bottom";
}) {
  if (!toast) return null;

  const isTop = position === "top";
  const isSuccess = toast.type === "success";
  const wrapperClass = isTop
    ? "toast-slide-in fixed right-5 top-5 z-[100]"
    : "fixed right-5 bottom-5 z-50";

  if (!isTop) {
    return (
      <div className={wrapperClass}>
        <div
          className={`rounded-xl px-4 py-3 text-sm shadow-lg border ${
            isSuccess
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <div
        className={`flex min-w-[min(100vw-2.5rem,380px)] max-w-[420px] overflow-hidden rounded-none border shadow-[0_12px_40px_-8px_rgba(15,23,42,0.28)] ${
          isSuccess
            ? "border-emerald-200/80 bg-white"
            : "border-rose-200/80 bg-white"
        }`}
        role="status"
        aria-live="polite"
      >
        <div
          className={`w-1 shrink-0 ${isSuccess ? "bg-emerald-500" : "bg-rose-500"}`}
          aria-hidden="true"
        />
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-none ${
              isSuccess
                ? "bg-emerald-100 text-emerald-600"
                : "bg-rose-100 text-rose-600"
            }`}
          >
            <ToastIcon type={toast.type} />
          </div>
          <div className="min-w-0">
            <p
              className={`text-xs font-semibold uppercase tracking-wide ${
                isSuccess ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {isSuccess ? "Success" : "Error"}
            </p>
            <p className="mt-0.5 text-sm font-medium leading-snug text-slate-800">
              {toast.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
