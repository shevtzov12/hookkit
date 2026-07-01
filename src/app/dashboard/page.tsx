import "@/styles/hookkit.css";
import { DashboardApp } from "@/components/dashboard/dashboard-app";
import { isClerkEnabled, isLocalFileDevMode } from "@/lib/auth/config";

export default function DashboardPage() {
  return (
    <DashboardApp
      clerkEnabled={isClerkEnabled()}
      apiKeysEnabled={isClerkEnabled() || isLocalFileDevMode()}
    />
  );
}
