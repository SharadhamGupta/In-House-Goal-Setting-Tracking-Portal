"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { validateGoalSet } from "@/lib/domain/goal-validation";
import { decideGoals, updateGoalFields } from "@/lib/services/workspace-api-client";
import { cn } from "@/lib/utils";
import type { Goal, ManagerReview, User } from "@/lib/domain/types";

export function TeamReviews({
  goals,
  users,
  currentUser,
  setGoals,
  reviews,
  setReviews,
  notify,
  onNotificationsChanged,
}: {
  goals: Goal[];
  users: User[];
  currentUser: User;
  setGoals: (goals: Goal[]) => void;
  reviews: ManagerReview[];
  setReviews: (reviews: ManagerReview[]) => void;
  notify: (title: string, description: string) => void;
  onNotificationsChanged: () => Promise<void>;
}) {
  const teamMembers = users.filter((user) => user.managerId === currentUser.id);
  const submittedOwners = teamMembers.filter((user) =>
    goals.some((goal) => goal.ownerId === user.id && goal.status === "submitted")
  );

  const [comments, setComments] = useState<Record<string, string>>({});
  const [decidingOwnerId, setDecidingOwnerId] = useState<string | null>(null);

  async function updateInline(goalId: string, patch: Partial<Pick<Goal, "target" | "weightage">>) {
    const previousGoals = goals;
    const optimisticGoals = goals.map((goal) => (goal.id === goalId ? { ...goal, ...patch, updatedAt: new Date().toISOString() } : goal));
    setGoals(optimisticGoals);

    try {
      const updatedGoal = await updateGoalFields(goalId, patch);
      setGoals(optimisticGoals.map((goal) => (goal.id === updatedGoal.id ? updatedGoal : goal)));
    } catch (error) {
      setGoals(previousGoals);
      notify("Update failed", error instanceof Error ? error.message : "Please try again.");
    }
  }

  async function decide(ownerId: string, status: "approved" | "rejected") {
    const ownerGoals = goals.filter((goal) => goal.ownerId === ownerId && goal.status === "submitted");
    const reviewValidation = validateGoalSet(ownerGoals);
    if (status === "approved" && !reviewValidation.canSubmit) {
      notify("Approval blocked", reviewValidation.issues.join(" "));
      return;
    }
    const currentComment = comments[ownerId] || "";
    if (status === "rejected" && currentComment.trim().length < 3) {
      notify("Comment required", "Add a short rework comment before returning goals.");
      return;
    }
    setDecidingOwnerId(ownerId);
    try {
      const result = await decideGoals(ownerId, status, currentComment.trim());
      const decidedGoals = result.goals;
      setGoals(goals.map((goal) => decidedGoals.find((decidedGoal) => decidedGoal.id === goal.id) ?? goal));
      setReviews([...reviews, ...result.reviews]);
      await onNotificationsChanged();
      setComments((prev) => {
        const next = { ...prev };
        delete next[ownerId];
        return next;
      });
      notify(
        status === "approved" ? "Goals approved" : "Goals rejected",
        status === "approved" ? "The employee has been notified by email." : "Rework email and in-app notification sent."
      );
    } catch (error) {
      notify("Review failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setDecidingOwnerId(null);
    }
  }

  if (!submittedOwners.length) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-4 rounded-full bg-emerald-50 p-5">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <p className="text-xl font-bold text-slate-900">All caught up!</p>
        <p className="mt-2 text-slate-500 max-w-sm">There are no pending goal submissions to review for your team.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {submittedOwners.map((owner) => {
        const ownerGoals = goals.filter((goal) => goal.ownerId === owner.id && goal.status === "submitted");
        const reviewValidation = validateGoalSet(ownerGoals);
        const currentComment = comments[owner.id] || "";
        
        return (
          <div key={owner.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
            {/* Header: Employee Details */}
            <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-700">
                    {owner.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{owner.name}</h3>
                    <p className="text-sm font-medium text-slate-500">{owner.title} · {owner.department}</p>
                  </div>
                </div>
                <StatusBadge status="submitted" />
              </div>
            </div>
            
            {/* Body */}
            <div className="p-6">
              {/* Clean Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Goal & Thrust Area</th>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4">Target</th>
                      <th className="px-5 py-4 w-40">Weightage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {ownerGoals.map((goal) => (
                      <tr key={goal.id} className="transition-colors hover:bg-slate-50/50">
                        <td className="px-5 py-5">
                          <p className="font-semibold text-slate-900 text-base">{goal.title}</p>
                          <p className="text-sm font-medium text-slate-500 mt-1">{goal.thrustArea}</p>
                        </td>
                        <td className="px-5 py-5 align-top pt-6">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", 
                            goal.sharedGoalGroupId != null ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"
                          )}>
                            {goal.sharedGoalGroupId != null ? "Shared" : "Individual"}
                          </span>
                        </td>
                        <td className="px-5 py-5">
                          <Input 
                            className="h-10 max-w-[220px] text-sm font-medium bg-slate-50 focus-visible:bg-white border-slate-200 transition-colors shadow-sm" 
                            value={goal.target} 
                            onChange={(event) => updateInline(goal.id, { target: event.target.value })} 
                          />
                        </td>
                        <td className="px-5 py-5">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={10}
                              className="h-10 w-24 text-sm font-bold bg-slate-50 focus-visible:bg-white border-slate-200 transition-colors shadow-sm text-center"
                              value={goal.weightage}
                              onChange={(event) => updateInline(goal.id, { weightage: Number(event.target.value) })}
                            />
                            <span className="text-sm font-bold text-slate-500">%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Review Section */}
              <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-stretch lg:gap-10">
                {/* Manager Comment Box */}
                <div className="flex-1">
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Manager Comment</label>
                  <Textarea
                    aria-label={`Manager review comment for ${owner.name}`}
                    value={currentComment}
                    onChange={(event) => setComments((prev) => ({ ...prev, [owner.id]: event.target.value }))}
                    placeholder="Provide feedback or instructions if returning goals for rework..."
                    className="min-h-[140px] resize-none bg-slate-50 focus-visible:bg-white border-slate-200 transition-colors shadow-sm text-base p-4"
                  />
                </div>

                {/* Validation and Action Buttons */}
                <div className="flex flex-col justify-between w-full rounded-2xl border border-slate-200 bg-slate-50 p-6 lg:w-[340px] lg:shrink-0 shadow-sm">
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Weightage</span>
                      <span className={cn(
                        "text-2xl font-black", 
                        reviewValidation.canSubmit ? "text-emerald-600" : "text-amber-600"
                      )}>
                        {reviewValidation.totalWeightage}%
                      </span>
                    </div>
                    
                    <Progress 
                      value={Math.min(reviewValidation.totalWeightage, 100)} 
                      className={cn(
                        "h-3 rounded-full bg-slate-200 overflow-hidden", 
                        reviewValidation.canSubmit ? "[&>div]:bg-emerald-500" : "[&>div]:bg-amber-500"
                      )}
                    />
                    
                    {reviewValidation.issues.length > 0 ? (
                      <div className="mt-5 flex items-start gap-3 rounded-xl bg-amber-100/50 p-4 text-sm text-amber-900 border border-amber-200/50">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                        <span className="leading-snug font-medium">{reviewValidation.issues.join(" ")}</span>
                      </div>
                    ) : (
                      <div className="mt-5 flex items-center gap-2 text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                        <CheckCircle2 className="h-4 w-4" />
                        Ready for approval
                      </div>
                    )}
                  </div>

                  {/* Prominent Reject and Approve Buttons */}
                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <Button 
                      type="button"
                      className="w-full bg-white border-2 border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 font-bold shadow-sm"
                      disabled={decidingOwnerId === owner.id} 
                      onClick={() => decide(owner.id, "rejected")}
                    >
                      {decidingOwnerId === owner.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Reject
                    </Button>
                    <Button 
                      type="button"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm border-2 border-transparent"
                      disabled={!reviewValidation.canSubmit || decidingOwnerId === owner.id} 
                      onClick={() => decide(owner.id, "approved")}
                    >
                      {decidingOwnerId === owner.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
