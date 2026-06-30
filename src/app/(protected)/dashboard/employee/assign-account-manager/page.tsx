"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DASHBOARD_ROUTES } from "@/constants/routes";

/** Legacy assign route — redirect to Invited Employees. */
export default function AssignAccountManagerRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(DASHBOARD_ROUTES.employee);
  }, [router]);

  return null;
}
