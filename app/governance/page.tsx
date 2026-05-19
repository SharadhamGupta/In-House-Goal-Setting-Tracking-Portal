"use client";

import { useState } from "react";
import { GovernanceDashboard } from "@/components/governance/governance-dashboard";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Toast, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export default function GovernancePage() {
  const { role, users, goals, reviews, setGoals, loaded } = useWorkspace();
  const [toast, setToast] = useState<{ title: string; description: string } | null>(null);

  if (!loaded || role !== "admin") return null;

  const notify = (title: string, description: string) => setToast({ title, description });

  return (
    <ToastProvider>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Governance</h2>
          <p className="text-muted-foreground mt-1 text-sm">Administrative oversight for goal states, unlocks, and manager effectiveness.</p>
        </div>
        
        <GovernanceDashboard
          goals={goals}
          users={users}
          reviews={reviews}
          setGoals={setGoals}
          notify={notify}
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
