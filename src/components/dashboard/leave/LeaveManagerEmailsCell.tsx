import { formatManagerEmailList } from "@/utils/leaveManagerDisplay";

export function LeaveManagerEmailsCell({ emails }: { emails: string[] }) {
  const { display, title } = formatManagerEmailList(emails);
  if (display === "—") return <span>—</span>;
  return (
    <span className="max-w-[200px] truncate" title={title}>
      {display}
    </span>
  );
}
