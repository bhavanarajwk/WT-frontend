"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { defaultDashboardPathForRoles } from "@/constants/routes";

export default function DashboardPage() {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    router.replace(defaultDashboardPathForRoles(user.roles));
  }, [status, user, router]);

  return (
    <div className="flex flex-1 items-center justify-center p-8 text-sm text-wt-text-muted">
      Loading workspace…
    </div>
  );
}
