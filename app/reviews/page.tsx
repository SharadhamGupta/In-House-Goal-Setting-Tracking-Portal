"use client";

import { useState } from "react";
import { TeamCheckins } from "@/components/reviews/team-checkins";
import { EmployeeReview } from "@/components/reviews/employee-review";
import { AdminReviews } from "@/components/reviews/admin-reviews";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { upsertAchievement } from "@/lib/services/workspace-api-client";
import { Toast, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import type { AchievementFormValues, Goal } from "@/lib/domain/types";

export default function ReviewsPage() {
  const { role, currentUser, users, goals, achievements, setAchievements, loaded } = useWorkspace();
  const [toast, setToast] = useState<{ title: string; description: string } | null>(null);

  if (!loaded || !currentUser) return null;
  if (role !== "manager" && role !== "employee" && role !== "admin") return null;

  const notify = (title: string, description: string) => setToast({ title, description });

  async function handleSaveUpdates(updates: { goal: Goal; values: AchievementFormValues }[]) {
    try {
      const savePromises = updates.map(({ goal, values }) => upsertAchievement(goal, values));
      const savedAchievements = await Promise.all(savePromises);
      
      setAchievements((currentAchievements) => {
        let updated = [...currentAchievements];
        for (const saved of savedAchievements) {
          const index = updated.findIndex((a) => a.id === saved.id);
          if (index >= 0) {
            updated[index] = saved;
          } else {
            updated.push(saved);
          }
        }
        return updated;
      });

      notify("Review Saved", "Check-in reviews have been successfully updated.");
    } catch (error) {
      notify("Submission Failed", error instanceof Error ? error.message : "Please try again.");
      throw error;
    }
  }

  return (
    <ToastProvider>
      {role === "employee" ? (
        <EmployeeReview 
          goals={goals} 
          achievements={achievements} 
          onSaveUpdates={handleSaveUpdates} 
        />
      ) : role === "admin" ? (
        <AdminReviews notify={notify} />
      ) : (
        <TeamCheckins
          currentUser={currentUser}
          users={users}
          goals={goals}
          achievements={achievements}
          onSaveCheckins={handleSaveUpdates}
        />
      )}
      
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
