export function IconPencil({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function IconChevronDown({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconMail({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 6h16v12H4z" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

export function IconPhone({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6.6 3.5A2 2 0 0 0 4.8 5.3c-.2 2.5 1 5.2 3.3 7.5s5 3.5 7.5 3.3a2 2 0 0 0 1.8-1.8l.7-3.2a1 1 0 0 0-.5-1.1L15 10.2a1 1 0 0 0-1 .2l-1.2 1.2a12 12 0 0 1-5.1-5.1l1.2-1.2a1 1 0 0 0 .2-1L7.8 4.2a1 1 0 0 0-1.1-.5Z" />
    </svg>
  );
}
