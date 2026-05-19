"use client";

import { VisualDashboard } from "@/components/dashboard/visual-dashboard";
import { useWorkspace } from "@/components/providers/workspace-provider";

export default function DashboardPage() {
  const { role, currentUser, users, goals, reviews, achievements, loaded } = useWorkspace();

  if (!loaded || !currentUser) return null;

  return (
    <VisualDashboard
      role={role}
      currentUser={currentUser}
      users={users}
      goals={goals}
      reviews={reviews}
      achievements={achievements}
    />
  );
}
