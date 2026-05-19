"use client";

import { useState } from "react";
import { EmployeeDashboard } from "@/components/dashboard/goal-portal";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { validateGoalSet, MAX_GOALS } from "@/lib/domain/goal-validation";
import { GoalFormDialog } from "@/components/goals/goal-form-dialog";
import { insertGoal, updateGoal, deleteGoal, submitGoals as submitWorkspaceGoals } from "@/lib/services/workspace-api-client";
import { Toast, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import type { Goal, GoalFormValues } from "@/lib/domain/types";

import { TeamGoalsOverview } from "@/components/goals/team-goals-overview";
import { pushSharedGoal } from "@/lib/services/workspace-api-client";

export default function GoalsPage() {
  const { role, employee, users, currentUser, goals, setGoals, reviews, loaded, refreshNotifications, activeCycle } = useWorkspace();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [savingGoal, setSavingGoal] = useState(false);
  const [submittingGoals, setSubmittingGoals] = useState(false);
  const [toast, setToast] = useState<{ title: string; description: string } | null>(null);

  if (!loaded || !currentUser) return null;

  const notify = (title: string, description: string) => setToast({ title, description });

  const employeeGoals = employee ? goals.filter((goal) => goal.ownerId === employee.id) : [];
  const activeSubmissionGoals = employeeGoals.filter((goal) => !goal.locked && goal.status !== "approved");
  const validation = validateGoalSet(activeSubmissionGoals);

  async function saveGoal(values: GoalFormValues) {
    if (!employee) return false;
    if (savingGoal) return false;
    setSavingGoal(true);

    try {
      if (editingGoal) {
        const nextValues =
          editingGoal.sharedGoalGroupId && editingGoal.primaryOwnerId !== employee.id
            ? { ...editingGoal, weightage: values.weightage }
            : values;
        const updatedGoal = await updateGoal(editingGoal.id, nextValues);
        setGoals((currentGoals) => currentGoals.map((g) => (g.id === updatedGoal.id ? updatedGoal : g)));
        setDialogOpen(false);
        setEditingGoal(null);
        notify("Goal updated", "The draft goal has been saved.");
        return true;
      }

      if (employeeGoals.length >= MAX_GOALS) {
        notify("Goal limit reached", `Employees can create up to ${MAX_GOALS} goals.`);
        return false;
      }

      const newGoal = await insertGoal(employee.id, values);
      setGoals((currentGoals) => [...currentGoals, newGoal]);
      setDialogOpen(false);
      notify("Goal created", "The new goal is ready in draft.");
      return true;
    } catch (error) {
      notify("Unable to save goal", error instanceof Error ? error.message : "Please try again.");
      return false;
    } finally {
      setSavingGoal(false);
    }
  }

  async function removeGoal(goalId: string) {
    try {
      await deleteGoal(goalId);
      setGoals((currentGoals) => currentGoals.filter((g) => g.id !== goalId));
      notify("Goal deleted", "The draft goal was removed.");
    } catch (error) {
      notify("Delete failed", error instanceof Error ? error.message : "Please try again.");
    }
  }

  async function submitGoals() {
    if (!employee) return;
    setSubmittingGoals(true);
    try {
      const submittedGoals = await submitWorkspaceGoals(employee.id);
      setGoals((currentGoals) =>
        currentGoals.map((g) => submittedGoals.find((sg) => sg.id === g.id) ?? g)
      );
      await refreshNotifications();
      notify("Submitted for approval", "Your manager has been notified by email and in AtomBerg GoalHub.");
    } catch (error) {
      notify("Submit failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSubmittingGoals(false);
    }
  }

  const isManagerOrAdmin = role === "manager" || role === "admin";

  return (
    <ToastProvider>
      {isManagerOrAdmin ? (
        <TeamGoalsOverview
          goals={goals}
          users={users}
          reviews={reviews}
          currentUser={currentUser}
          onPushSharedGoal={async (ownerIds, goalData) => {
            try {
              const sharedGoals = await pushSharedGoal({ ownerIds, goalData });
              setGoals((currentGoals) => [...currentGoals, ...sharedGoals]);
              notify("Shared KPI pushed", `Departmental KPI "${goalData.title}" was pushed to recipients.`);
            } catch (error) {
              notify("Push failed", error instanceof Error ? error.message : "Please try again.");
            }
          }}
        />
      ) : (
        <EmployeeDashboard
          goals={employeeGoals}
          reviews={reviews}
          validation={validation}
          onCreate={() => {
            setEditingGoal(null);
            setDialogOpen(true);
          }}
          onEdit={(goal) => {
            setEditingGoal(goal);
            setDialogOpen(true);
          }}
          onDelete={removeGoal}
          onSubmit={submitGoals}
          isSubmitting={submittingGoals}
          activeCycle={activeCycle}
        />
      )}
      
      {!isManagerOrAdmin && employee && (
        <GoalFormDialog
          open={dialogOpen}
          goal={editingGoal}
          isSaving={savingGoal}
          lockSharedFields={Boolean(editingGoal?.sharedGoalGroupId && editingGoal.primaryOwnerId !== employee.id)}
          onOpenChange={setDialogOpen}
          onSubmit={saveGoal}
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
