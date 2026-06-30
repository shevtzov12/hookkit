import "@/styles/hookkit.css";
import { DashboardApp } from "@/components/dashboard/dashboard-app";
import { isClerkEnabled } from "@/lib/auth/config";

export default function DashboardPage() {
  return <DashboardApp clerkEnabled={isClerkEnabled()} />;
}
