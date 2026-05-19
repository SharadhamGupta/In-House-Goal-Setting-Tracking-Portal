"use client";

import { useState } from "react";
import { TeamReviews } from "@/components/reviews/team-reviews";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Toast, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export default function ApprovalsPage() {
  const { role, currentUser, users, goals, setGoals, reviews, setReviews, loaded, refreshNotifications } = useWorkspace();
  const [toast, setToast] = useState<{ title: string; description: string } | null>(null);

  if (!loaded || role !== "manager" || !currentUser) return null;

  const notify = (title: string, description: string) => setToast({ title, description });

  return (
    <ToastProvider>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Goal Approvals</h2>
          <p className="text-muted-foreground mt-1 text-sm">Review and approve submitted goal sheets for your direct reports.</p>
        </div>
        
        <TeamReviews
          goals={goals}
          users={users}
          currentUser={currentUser}
          setGoals={setGoals}
          reviews={reviews}
          setReviews={setReviews}
          notify={notify}
          onNotificationsChanged={refreshNotifications}
        />
      </div>
      
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
