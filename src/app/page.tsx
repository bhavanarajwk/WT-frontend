import { redirect } from "next/navigation";

/**
 * Root route — immediately redirect to the dashboard.
 * The protected layout will handle auth-gating and send
 * unauthenticated users to /login.
 */
export default function RootPage() {
  redirect("/dashboard");
} 
