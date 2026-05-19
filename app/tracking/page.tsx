"use client";

import { useState } from "react";
import { AchievementTracking } from "@/components/dashboard/achievement-tracking";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { upsertAchievement, sendQuarterlyCheckInReminders } from "@/lib/services/workspace-api-client";
import { Toast, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import type { Goal, AchievementFormValues, Quarter } from "@/lib/domain/types";

export default function TrackingPage() {
  const { role, currentUser, users, goals, achievements, setAchievements, loaded, refreshNotifications } = useWorkspace();
  const [toast, setToast] = useState<{ title: string; description: string } | null>(null);

  if (!loaded || !currentUser) return null;

  const notify = (title: string, description: string) => setToast({ title, description });

  async function saveAchievement(goal: Goal, values: AchievementFormValues) {
    try {
      const savedAchievement = await upsertAchievement(goal, values);
      setAchievements((currentAchievements) => {
        const exists = currentAchievements.some((achievement) => achievement.id === savedAchievement.id);
        return exists
          ? currentAchievements.map((achievement) => (achievement.id === savedAchievement.id ? savedAchievement : achievement))
          : [...currentAchievements, savedAchievement];
      });
      notify("Quarterly update saved", "Progress tracking has been updated.");
    } catch (error) {
      notify("Update failed", error instanceof Error ? error.message : "Please try again.");
    }
  }

  async function sendCheckInReminders(quarter: Quarter) {
    try {
      const result = await sendQuarterlyCheckInReminders(quarter);
      await refreshNotifications();
      notify(
        "Reminders sent",
        result.pendingGoals
          ? `${result.remindedEmployees} employee${result.remindedEmployees === 1 ? "" : "s"} notified for ${result.pendingGoals} pending update${result.pendingGoals === 1 ? "" : "s"}.`
          : "No pending quarterly check-ins were found."
      );
    } catch (error) {
      notify("Reminder failed", error instanceof Error ? error.message : "Please try again.");
    }
  }

  return (
    <ToastProvider>
      <AchievementTracking
        role={role}
        currentUser={currentUser}
        users={users}
        goals={goals}
        achievements={achievements}
        onSave={saveAchievement}
        onSendReminders={role === "manager" || role === "admin" ? sendCheckInReminders : undefined}
      />
      {toast && (
        <Toast open onOpenChange={(open) => !open && setToast(null)}>
          <ToastTitle className="font-semibold">{toast.title}</ToastTitle>
          <ToastDescription className="text-muted-foreground">{toast.description}</ToastDescription>
        </Toast>
      )}
      <ToastViewport />
    </ToastProvider>
  );
}
