"use client";

import Link from "next/link";

export function LearningHubRedirect({ feature }: { feature: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-wt-border bg-wt-surface-1 p-8 text-center space-y-4">
      <h1 className="text-xl font-semibold">{feature}</h1>
      <p className="text-sm text-wt-text-muted">
        Open a training from the library, then use the tabs inside that training to manage {feature.toLowerCase()}.
      </p>
      <Link href="/dashboard/learning-development/trainings" className="btn-primary inline-flex px-4 py-2 text-sm">
        Browse trainings
      </Link>
    </div>
  );
}
