export function DashboardToast({
  toast,
}: {
  toast: { type: "success" | "error"; message: string } | null;
}) {
  if (!toast) return null;
  return (
    <div className="fixed right-5 bottom-5 z-50">
      <div
        className={`rounded-xl px-4 py-3 text-sm shadow-lg border ${
          toast.type === "success"
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
