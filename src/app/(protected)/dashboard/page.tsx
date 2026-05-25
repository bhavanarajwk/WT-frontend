import { redirect } from "next/navigation";
import { DASHBOARD_DEFAULT_PATH } from "@/constants/routes";

export default function DashboardPage() {
  redirect(DASHBOARD_DEFAULT_PATH);
}
