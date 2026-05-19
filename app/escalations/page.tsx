"use client";

import { useCallback, useEffect, useState } from "react";
import { EscalationDashboard } from "@/components/escalations/escalation-dashboard";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { syncEscalations, resolveEscalation } from "@/lib/services/workspace-api-client";
import { Toast, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export default function EscalationsPage() {
  const { role, users, escalations, setEscalations, loaded, refreshNotifications } = useWorkspace();
  const [syncingEscalations, setSyncingEscalations] = useState(false);
  const [resolvingEscalationId, setResolvingEscalationId] = useState<string | null>(null);
  const [escalationsSynced, setEscalationsSynced] = useState(false);
  const [toast, setToast] = useState<{ title: string; description: string } | null>(null);

  const notify = useCallback((title: string, description: string) => setToast({ title, description }), []);

  const runEscalationSync = useCallback(async (showToast = true) => {
    setSyncingEscalations(true);
    try {
      const result = await syncEscalations();
      setEscalations(result.escalations);
      await refreshNotifications();
      if (showToast) {
        notify(
          "Escalations synced",
          `${result.created} created, ${result.resolved} resolved, ${result.evaluated} active rule hit${result.evaluated === 1 ? "" : "s"}.`
        );
      }
    } catch (error) {
      notify("Escalation sync failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSyncingEscalations(false);
    }
  }, [notify, refreshNotifications, setEscalations]);

  useEffect(() => {
    if (!loaded || role !== "admin" || escalationsSynced) return;
    setEscalationsSynced(true);
    void runEscalationSync(false);
  }, [escalationsSynced, loaded, role, runEscalationSync]);

  async function resolveEscalationItem(escalationId: string) {
    setResolvingEscalationId(escalationId);
    try {
      const resolved = await resolveEscalation(escalationId);
      setEscalations((current) => current.map((item) => (item.id === resolved.id ? resolved : item)));
      notify("Escalation resolved", "The governance register has been updated.");
    } catch (error) {
      notify("Resolve failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setResolvingEscalationId(null);
    }
  }

  if (!loaded || role !== "admin") return null;

  return (
    <ToastProvider>
      <EscalationDashboard
        escalations={escalations}
        users={users}
        syncing={syncingEscalations}
        resolvingId={resolvingEscalationId}
        onSync={() => runEscalationSync(true)}
        onResolve={resolveEscalationItem}
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
