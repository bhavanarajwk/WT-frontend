import { redirect } from "next/navigation";
import { DASHBOARD_ROUTES, DASHBOARD_DEFAULT_PATH } from "@/constants/routes";

/** Legacy helper: map old ?tab= values to real routes (optional bookmarks). */
export function redirectDashboardTab(tab: string) {
  const path = DASHBOARD_ROUTES[tab] ?? DASHBOARD_DEFAULT_PATH;
  redirect(path);
}
