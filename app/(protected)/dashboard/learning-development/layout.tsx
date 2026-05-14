import type { ReactNode } from "react";

export default function LearningDevelopmentLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-full">{children}</div>;
}
