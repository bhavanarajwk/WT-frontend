"use client";

export function CompOffRulesBanner() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-medium mb-1">Comp-off rules</p>
      <ul className="list-disc pl-5 space-y-0.5 text-amber-900/90">
        <li>1 unit = 1 full calendar day (usage has no half-days).</li>
        <li>Earn Credits expire 60 days after the worked date.</li>
        <li>Usage consumes grants FIFO (oldest expiry first).</li>
        <li>Earn: request goes to your project manager; +1 unit is added after they approve.</li>
        <li>Usage: only available when you have balance; request goes to HR for approval.</li>
      </ul>
    </div>
  );
}
