import { redirect } from "next/navigation";
import { DASHBOARD_ROUTES } from "@/constants/routes";

export default function HrEmployeeTimelogPage() {
  redirect(`${DASHBOARD_ROUTES.timelog}/team`);
}
