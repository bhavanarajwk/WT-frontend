export function DataTable({
  title,
  columns,
  rows,
  emptyLabel,
  compact = false,
}: {
  title?: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  emptyLabel: string;
  compact?: boolean;
}) {
  if (!rows.length) {
    return (
      <div className="space-y-1">
        {title ? <p className="text-sm font-medium">{title}</p> : null}
        <p className="text-sm text-wt-text-muted">{emptyLabel}</p>
      </div>
    );
  }
  const cellClass = compact ? "px-1.5 py-1 whitespace-nowrap" : "px-3 py-2 whitespace-nowrap";
  const headCellClass = compact
    ? "text-left px-1.5 py-1 font-medium whitespace-nowrap"
    : "text-left px-3 py-2 font-medium whitespace-nowrap";
  return (
    <div className="space-y-1">
      {title ? <p className="text-sm font-medium">{title}</p> : null}
      <div className="wt-scroll-both max-h-[min(70vh,520px)] rounded-xl border border-wt-border">
        <table className="min-w-full text-sm">
          <thead className="bg-wt-surface-2 text-wt-text-muted">
            <tr>
              {columns.map((col) => (
                <th key={col} className={headCellClass}>
                  {col.replaceAll("_", " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-t border-wt-border">
                {columns.map((col) => (
                  <td key={col} className={cellClass}>
                    {row[col] === null || row[col] === undefined ? "—" : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
