"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, Clock3, FileText, Loader2, Save, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { calculateProgressPercent, progressStatusLabels, quarters } from "@/lib/domain/progress";
import type { AchievementFormValues, AchievementUpdate, Goal, Quarter, User } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { completeManagerCheckin } from "@/lib/services/workspace-api-client";

type Props = {
  currentUser: User;
  users: User[];
  goals: Goal[];
  achievements: AchievementUpdate[];
  onSaveCheckins: (updates: { goal: Goal; values: AchievementFormValues }[]) => Promise<void>;
};

export function TeamCheckins({ currentUser, users, goals, achievements, onSaveCheckins }: Props) {
  const [selectedQuarter, setSelectedQuarter] = useState<Quarter>("Q1");
  const [reviewingEmployeeId, setReviewingEmployeeId] = useState<string | null>(null);
  const [managerComments, setManagerComments] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { setAchievements } = useWorkspace();

  const teamMembers = useMemo(() => users.filter((u) => u.managerId === currentUser.id), [users, currentUser.id]);
  const approvedGoals = useMemo(() => goals.filter((g) => g.status === "approved"), [goals]);

  const teamMetrics = useMemo(() => {
    let goalsReviewed = 0;
    let completedEmployees = 0;
    let totalProgress = 0;

    const employeeStats = teamMembers.map((emp) => {
      const empGoals = approvedGoals.filter((g) => g.ownerId === emp.id);
      let empProgressSum = 0;
      let checkinsCompleted = true;

      for (const goal of empGoals) {
        const achievement = achievements.find((a) => a.goalId === goal.id && a.quarter === selectedQuarter);
        if (!achievement) checkinsCompleted = false;
        else if (achievement.status !== "completed") checkinsCompleted = false;
        
        if (achievement?.managerComment) goalsReviewed++;
        
        const progress = calculateProgressPercent(
          goal, 
          achievement?.actualValue ?? "", 
          achievement?.status ?? "not_started"
        );
        empProgressSum += progress;
      }

      const overallProgress = empGoals.length ? Math.round(empProgressSum / empGoals.length) : 0;
      totalProgress += overallProgress;

      if (empGoals.length > 0 && checkinsCompleted) completedEmployees++;

      const managerCheckinFinished = empGoals.length > 0 && empGoals.every(g => {
        const ach = achievements.find((a) => a.goalId === g.id && a.quarter === selectedQuarter);
        return ach?.managerCheckinCompleted === true;
      });

      return {
        employee: emp,
        goalsCount: empGoals.length,
        overallProgress,
        checkinStatus: empGoals.length === 0 ? "No Goals" : checkinsCompleted ? "Completed" : "Pending",
        managerCheckinFinished
      };
    });

    const completionRate = teamMembers.length ? Math.round((completedEmployees / teamMembers.length) * 100) : 0;
    const employeesPending = teamMembers.length - completedEmployees;

    return { goalsReviewed, completionRate, employeesPending, employeeStats };
  }, [teamMembers, approvedGoals, achievements, selectedQuarter]);

  const reviewingEmployee = teamMembers.find((e) => e.id === reviewingEmployeeId);
  const reviewingGoals = reviewingEmployee ? approvedGoals.filter((g) => g.ownerId === reviewingEmployee.id) : [];
  
  const reviewingProgress = reviewingGoals.length 
    ? Math.round(reviewingGoals.reduce((sum, goal) => {
        const achievement = achievements.find((a) => a.goalId === goal.id && a.quarter === selectedQuarter);
        return sum + calculateProgressPercent(goal, achievement?.actualValue ?? "", achievement?.status ?? "not_started");
      }, 0) / reviewingGoals.length)
    : 0;

  // Initialize comments when opening modal
  const openReview = (empId: string) => {
    const empGoals = approvedGoals.filter((g) => g.ownerId === empId);
    const initialComments: Record<string, string> = {};
    for (const goal of empGoals) {
      const achievement = achievements.find((a) => a.goalId === goal.id && a.quarter === selectedQuarter);
      initialComments[goal.id] = achievement?.managerComment ?? "";
    }
    setManagerComments(initialComments);
    setErrorMessage(null);
    setReviewingEmployeeId(empId);
  };

  const handleSave = async (markComplete: boolean) => {
    if (!reviewingEmployee) return;
    setErrorMessage(null);
    
    if (markComplete) {
      // Validate that at least one non-empty manager comment was provided across any goal
      const hasComment = reviewingGoals.some(goal => {
        const val = managerComments[goal.id];
        return val && val.trim() !== "";
      });
      if (!hasComment) {
        setErrorMessage("Please add a check-in comment before marking as complete.");
        return;
      }

      setIsSubmitting(true);
      try {
        // 1. Save comments first
        const updates = reviewingGoals.map((goal) => {
          const existing = achievements.find((a) => a.goalId === goal.id && a.quarter === selectedQuarter);
          return {
            goal,
            values: {
              quarter: selectedQuarter,
              actualValue: existing?.actualValue ?? "",
              status: existing?.status ?? "not_started",
              employeeComment: existing?.employeeComment ?? "",
              managerComment: managerComments[goal.id] ?? "",
            },
          };
        });
        await onSaveCheckins(updates);

        // 2. Mark complete
        const firstNonEmptyComment = reviewingGoals
          .map(g => managerComments[g.id])
          .find(c => c && c.trim() !== "") || "";

        const res = await completeManagerCheckin(reviewingEmployee.id, selectedQuarter, firstNonEmptyComment);
        if (res.success) {
          setAchievements((current) => {
            return current.map((a) => {
              const belongs = reviewingGoals.some((g) => g.id === a.goalId);
              if (belongs && a.quarter === selectedQuarter) {
                return {
                  ...a,
                  managerCheckinCompleted: true,
                  managerCheckinCompletedAt: new Date().toISOString(),
                  managerComment: managerComments[a.goalId] || a.managerComment
                };
              }
              return a;
            });
          });
          setReviewingEmployeeId(null);
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Failed to mark check-in as complete.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setIsSaving(true);
      try {
        const updates = reviewingGoals.map((goal) => {
          const existing = achievements.find((a) => a.goalId === goal.id && a.quarter === selectedQuarter);
          return {
            goal,
            values: {
              quarter: selectedQuarter,
              actualValue: existing?.actualValue ?? "",
              status: existing?.status ?? "not_started",
              employeeComment: existing?.employeeComment ?? "",
              managerComment: managerComments[goal.id] ?? "",
            },
          };
        });
        await onSaveCheckins(updates);
        setReviewingEmployeeId(null);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Failed to save draft.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* 1. Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Team Quarterly Check-ins</h2>
          <p className="mt-1 text-sm text-slate-500">Review employee progress and complete quarterly manager check-ins.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-white p-1 shadow-sm">
          {quarters.map((q) => (
            <button
              key={q}
              onClick={() => setSelectedQuarter(q)}
              className={cn(
                "rounded-full px-5 py-1.5 text-sm font-semibold transition-all",
                selectedQuarter === q
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Employees" value={teamMembers.length} icon={Users} />
        <SummaryCard label="Goals Reviewed" value={teamMetrics.goalsReviewed} icon={FileText} />
        <SummaryCard label="Completion Rate %" value={`${teamMetrics.completionRate}%`} progress={teamMetrics.completionRate} icon={CheckCircle2} />
        <SummaryCard label="Employees Pending" value={teamMetrics.employeesPending} icon={Clock3} tone={teamMetrics.employeesPending > 0 ? "warn" : "good"} />
      </div>

      {/* 3. Main Team Review Table */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Goals</th>
                  <th className="px-6 py-4 w-40">Overall Progress</th>
                  <th className="px-6 py-4">Check-in Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teamMetrics.employeeStats.map(({ employee, goalsCount, overallProgress, checkinStatus, managerCheckinFinished }) => (
                  <tr key={employee.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                          {employee.name.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-900">{employee.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{employee.department ?? "N/A"}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{goalsCount}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Progress value={overallProgress} className="h-1.5 [&>div]:bg-blue-500" />
                        <span className="w-8 text-right text-xs font-bold text-slate-700">{overallProgress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {managerCheckinFinished ? (
                        <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                          Check-in Complete
                        </span>
                      ) : (
                        <span className={cn(
                          "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                          checkinStatus === "Completed" && "bg-emerald-100 text-emerald-700",
                          checkinStatus === "Pending" && "bg-amber-100 text-amber-700",
                          checkinStatus === "No Goals" && "bg-slate-100 text-slate-500"
                        )}>
                          {checkinStatus}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={goalsCount === 0}
                        onClick={() => openReview(employee.id)}
                        className="text-blue-600 font-semibold hover:text-blue-700 hover:bg-blue-50"
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
                {teamMetrics.employeeStats.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No direct reports found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4. Employee Detail Review Modal */}
      <Dialog open={!!reviewingEmployeeId} onOpenChange={(open) => !open && setReviewingEmployeeId(null)}>
        <DialogContent className="max-w-5xl flex flex-col max-h-[90vh] p-0 overflow-hidden">
          {reviewingEmployee && (
            <>
              {/* SECTION A: Employee Summary */}
              <div className="border-b bg-slate-50/80 p-6">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                      {reviewingEmployee.name.charAt(0)}
                    </div>
                    {reviewingEmployee.name} - {selectedQuarter} Review
                  </DialogTitle>
                  <DialogDescription>
                    Review actual achievements and provide structured feedback.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-6 flex flex-wrap gap-x-8 gap-y-4 text-sm">
                  <div className="flex flex-col gap-1 border-l-2 pl-4 border-slate-200">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Department</span>
                    <span className="font-semibold text-slate-900">{reviewingEmployee.department ?? "N/A"}</span>
                  </div>
                  <div className="flex flex-col gap-1 border-l-2 pl-4 border-slate-200">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Goals</span>
                    <span className="font-semibold text-slate-900">{reviewingGoals.length}</span>
                  </div>
                  <div className="flex flex-col gap-1 border-l-2 pl-4 border-slate-200">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Overall Progress</span>
                    <div className="flex items-center gap-2">
                      <Progress value={reviewingProgress} className="h-1.5 w-24 [&>div]:bg-blue-500" />
                      <span className="font-bold text-blue-600">{reviewingProgress}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION B: Goals Review Table */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                <div className="grid gap-6">
                  {reviewingGoals.map((goal) => {
                    const achievement = achievements.find((a) => a.goalId === goal.id && a.quarter === selectedQuarter);
                    const progress = calculateProgressPercent(goal, achievement?.actualValue ?? "", achievement?.status ?? "not_started");
                    
                    return (
                      <div key={goal.id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="flex flex-col lg:flex-row">
                          {/* Goal Info */}
                          <div className="flex-1 p-5 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/50">
                            <div className="mb-4 flex items-start justify-between">
                              <div>
                                <h4 className="font-bold text-slate-900 text-base">{goal.title}</h4>
                                <p className="text-xs font-medium text-slate-500 mt-1">{goal.thrustArea}</p>
                              </div>
                              <span className={cn(
                                "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                                achievement?.status === "completed" && "bg-emerald-100 text-emerald-700",
                                achievement?.status === "on_track" && "bg-blue-100 text-blue-700",
                                (!achievement || achievement.status === "not_started") && "bg-slate-100 text-slate-600"
                              )}>
                                {achievement ? progressStatusLabels[achievement.status] : "Not Started"}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mt-6">
                              <div>
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Target</span>
                                <span className="font-semibold text-slate-900">{goal.target}</span>
                              </div>
                              <div>
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Actual</span>
                                <span className={cn("font-semibold", achievement?.actualValue ? "text-blue-600" : "text-slate-400 italic")}>
                                  {achievement?.actualValue || "No update"}
                                </span>
                              </div>
                              <div>
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Weightage</span>
                                <span className="font-semibold text-slate-900">{goal.weightage}%</span>
                              </div>
                              <div>
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Progress</span>
                                <span className="font-bold text-emerald-600">{progress}%</span>
                              </div>
                            </div>
                            
                            {achievement?.employeeComment && (
                              <div className="mt-6 rounded-lg bg-white p-3 border border-slate-100 shadow-sm">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Employee Remarks</span>
                                <p className="text-sm text-slate-700 italic">{achievement.employeeComment}</p>
                              </div>
                            )}
                          </div>
                          
                          {/* Manager Comment */}
                          <div className="w-full lg:w-[320px] shrink-0 p-5 bg-white">
                            <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                              Manager Check-in Comment
                            </label>
                            <Textarea
                              className="h-[140px] resize-none bg-slate-50 focus-visible:bg-white text-sm"
                              placeholder="Add feedback, note blockers, or suggest improvements..."
                              value={managerComments[goal.id] ?? ""}
                              onChange={(e) => setManagerComments(prev => ({ ...prev, [goal.id]: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 6. Completion Workflow (Modal Footer) */}
              {(() => {
                const isManagerComplete = reviewingGoals.length > 0 && reviewingGoals.every(g => {
                  const ach = achievements.find(a => a.goalId === g.id && a.quarter === selectedQuarter);
                  return ach?.managerCheckinCompleted === true;
                });

                return (
                  <div className="flex flex-col gap-3 border-t bg-white p-5">
                    {errorMessage && (
                      <div className="text-sm font-semibold text-rose-600 text-right mb-1">
                        {errorMessage}
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-3">
                      <Button 
                        variant="outline" 
                        onClick={() => handleSave(false)} 
                        disabled={isSaving || isSubmitting || isManagerComplete}
                        className="font-semibold border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Draft
                      </Button>
                      <Button 
                        onClick={() => handleSave(true)} 
                        disabled={isSaving || isSubmitting || isManagerComplete}
                        className={cn(
                          "bg-blue-600 font-semibold text-white hover:bg-blue-700 shadow-sm",
                          isManagerComplete && "bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-100 cursor-not-allowed"
                        )}
                      >
                        {isSubmitting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        {isManagerComplete ? "Already Completed" : "Submit & Mark Complete"}
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, progress, tone = "neutral" }: { label: string; value: string | number; icon: any; progress?: number; tone?: "neutral" | "good" | "warn" }) {
  return (
    <Card className="border-slate-200 shadow-sm transition-all hover:shadow-md">
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {progress !== undefined && (
            <Progress 
              value={progress} 
              className={cn("mt-3 h-1.5 w-24", progress === 100 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-blue-500")}
            />
          )}
        </div>
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg",
          tone === "neutral" && "bg-slate-50 text-slate-400",
          tone === "good" && "bg-emerald-50 text-emerald-600",
          tone === "warn" && "bg-amber-50 text-amber-600"
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
