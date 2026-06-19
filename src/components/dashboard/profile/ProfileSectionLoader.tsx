export function ProfileSectionLoader({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-wt-text-muted" role="status" aria-live="polite">
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-wt-border border-t-wt-text"
        aria-hidden
      />
      {message}
    </div>
  );
}
