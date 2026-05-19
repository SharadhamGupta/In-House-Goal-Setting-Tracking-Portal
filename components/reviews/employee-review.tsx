"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, FileText, Loader2, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { calculateProgressPercent, progressStatusLabels, quarters } from "@/lib/domain/progress";
import type { AchievementFormValues, AchievementUpdate, Goal, GoalProgressStatus, Quarter, User } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { isQuarterOpen } from "@/lib/domain/cycle-utils";

type DraftValues = {
  actualValue: string;
  status: GoalProgressStatus;
  employeeComment: string;
};

type Props = {
  goals: Goal[];
  achievements: AchievementUpdate[];
  onSaveUpdates: (updates: { goal: Goal; values: AchievementFormValues }[]) => Promise<void>;
};

export function EmployeeReview({ goals, achievements, onSaveUpdates }: Props) {
  const [selectedQuarter, setSelectedQuarter] = useState<Quarter>("Q1");
  const [drafts, setDrafts] = useState<Record<string, DraftValues>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { activeCycle } = useWorkspace();

  const isOpen = isQuarterOpen(activeCycle, selectedQuarter);

  const approvedGoals = useMemo(() => goals.filter((g) => g.status === "approved"), [goals]);

  // Initialize drafts when quarter changes
  useEffect(() => {
    const initialDrafts: Record<string, DraftValues> = {};
    for (const goal of approvedGoals) {
      const achievement = achievements.find((a) => a.goalId === goal.id && a.quarter === selectedQuarter);
      initialDrafts[goal.id] = {
        actualValue: achievement?.actualValue ?? "",
        status: achievement?.status ?? "not_started",
        employeeComment: achievement?.employeeComment ?? "",
      };
    }
    setDrafts(initialDrafts);
  }, [approvedGoals, achievements, selectedQuarter]);

  const updateDraft = (goalId: string, patch: Partial<DraftValues>) => {
    setDrafts((prev) => ({
      ...prev,
      [goalId]: { ...prev[goalId], ...patch },
    }));
  };

  const getGoalProgress = (goal: Goal, draft: DraftValues) => {
    return calculateProgressPercent(goal, draft.actualValue, draft.status);
  };

  const totalGoals = approvedGoals.length;
  const completedCount = approvedGoals.filter((g) => drafts[g.id]?.status === "completed").length;
  const inProgressCount = approvedGoals.filter((g) => drafts[g.id]?.status === "on_track").length;
  
  const averageProgress = useMemo(() => {
    if (totalGoals === 0) return 0;
    const total = approvedGoals.reduce((sum, goal) => {
      const draft = drafts[goal.id];
      if (!draft) return sum;
      return sum + getGoalProgress(goal, draft);
    }, 0);
    return Math.round(total / totalGoals);
  }, [approvedGoals, drafts]);

  async function handleSave(submit: boolean) {
    if (submit) setIsSubmitting(true);
    else setIsSaving(true);

    try {
      const updates = approvedGoals.map((goal) => {
        const draft = drafts[goal.id];
        const existing = achievements.find((a) => a.goalId === goal.id && a.quarter === selectedQuarter);
        return {
          goal,
          values: {
            quarter: selectedQuarter,
            actualValue: draft.actualValue,
            status: draft.status,
            employeeComment: draft.employeeComment,
            managerComment: existing?.managerComment ?? "",
          },
        };
      });
      await onSaveUpdates(updates);
    } finally {
      setIsSaving(false);
      setIsSubmitting(false);
    }
  }

  const topBanner = useMemo(() => {
    if (!activeCycle) return null;
    const now = new Date();
    const qWindows: { q: Quarter; opens: Date; closes: Date }[] = [
      { q: "Q1", opens: new Date(activeCycle.q1OpensAt), closes: new Date(activeCycle.q1ClosesAt) },
      { q: "Q2", opens: new Date(activeCycle.q2OpensAt), closes: new Date(activeCycle.q2ClosesAt) },
      { q: "Q3", opens: new Date(activeCycle.q3OpensAt), closes: new Date(activeCycle.q3ClosesAt) },
      { q: "Q4", opens: new Date(activeCycle.q4OpensAt), closes: new Date(activeCycle.q4ClosesAt) }
    ];
    const openWin = qWindows.find(win => now >= win.opens && now <= win.closes);
    if (openWin) {
      return (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>Active Check-in Window: <span className="font-bold">{openWin.q}</span> is currently open for submissions until <span className="font-semibold">{openWin.closes.toDateString()}</span>.</span>
        </div>
      );
    } else {
      return (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>No check-in window is currently open.</span>
        </div>
      );
    }
  }, [activeCycle]);

  return (
    <div className="flex flex-col gap-8 pb-24">
      {topBanner}
      {/* 1. Top Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">My Quarterly Review</h2>
          <p className="mt-1 text-sm text-slate-500">Review progress and submit quarterly achievements.</p>
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

      {/* 2. Summary Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Goals" value={totalGoals} icon={FileText} />
        <SummaryCard label="Completed" value={completedCount} icon={CheckCircle2} />
        <SummaryCard label="In Progress" value={inProgressCount} icon={Clock3} />
        <SummaryCard 
          label="Average Progress %" 
          value={`${averageProgress}%`} 
          icon={CheckCircle2} 
          progress={averageProgress} 
        />
      </div>

      {/* 3. Main Review Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="border-b bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4 w-40">Thrust Area</th>
                <th className="px-5 py-4 min-w-[200px]">Goal Title</th>
                <th className="px-5 py-4 w-28">Type (UoM)</th>
                <th className="px-5 py-4 w-28">Target</th>
                <th className="px-5 py-4 w-24">Weight</th>
                <th className="px-5 py-4 w-32">Curr. Status</th>
                <th className="px-5 py-4 w-40">Actual</th>
                <th className="px-5 py-4 w-40">Review Status</th>
                <th className="px-5 py-4 w-32">Progress %</th>
                <th className="px-5 py-4 min-w-[250px]">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {approvedGoals.map((goal) => {
                const draft = drafts[goal.id];
                if (!draft) return null;
                const progress = getGoalProgress(goal, draft);
                const existing = achievements.find((a) => a.goalId === goal.id && a.quarter === selectedQuarter);
                const isSynced = existing?.syncedFromOwner === true;
                
                return (
                  <tr key={goal.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-5 py-4 align-top">
                      <span className="font-medium text-slate-700">{goal.thrustArea}</span>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className="font-semibold text-slate-900">{goal.title}</span>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className="capitalize text-slate-600">{goal.uom.replace("_", " ")}</span>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className="font-semibold text-slate-900">{goal.target}</span>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className="font-semibold text-slate-900">{goal.weightage}%</span>
                    </td>
                    <td className="px-5 py-4 align-top pt-5">
                      <span className={cn(
                        "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                        existing?.status === "completed" && "bg-emerald-100 text-emerald-700",
                        existing?.status === "on_track" && "bg-blue-100 text-blue-700",
                        (!existing || existing.status === "not_started") && "bg-slate-100 text-slate-600"
                      )}>
                        {existing ? progressStatusLabels[existing.status] : "Not Started"}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <Input
                        className="h-9 bg-slate-50 focus-visible:bg-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        value={draft.actualValue}
                        onChange={(e) => updateDraft(goal.id, { actualValue: e.target.value })}
                        placeholder={goal.uom === "timeline" ? "YYYY-MM-DD" : "Value"}
                        disabled={!isOpen || isSynced}
                      />
                      {isSynced && (
                        <div className="mt-1.5">
                          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10 whitespace-nowrap">
                            Synced from owner
                          </span>
                        </div>
                      )}
                      {!isSynced && activeCycle && (() => {
                        const now = new Date();
                        const map = {
                          Q1: [new Date(activeCycle.q1OpensAt), new Date(activeCycle.q1ClosesAt)],
                          Q2: [new Date(activeCycle.q2OpensAt), new Date(activeCycle.q2ClosesAt)],
                          Q3: [new Date(activeCycle.q3OpensAt), new Date(activeCycle.q3ClosesAt)],
                          Q4: [new Date(activeCycle.q4OpensAt), new Date(activeCycle.q4ClosesAt)],
                        };
                        const [opens, closes] = map[selectedQuarter];
                        if (now < opens) {
                          return <div className="mt-1"><span className="text-[10px] text-amber-600 font-medium">Window opens {opens.toDateString()}</span></div>;
                        } else if (now > closes) {
                          return <div className="mt-1"><span className="text-[10px] text-rose-600 font-medium">Window closed</span></div>;
                        }
                        return null;
                      })()}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <Select
                        value={draft.status}
                        onValueChange={(status: GoalProgressStatus) => updateDraft(goal.id, { status })}
                        disabled={!isOpen || isSynced}
                      >
                        <SelectTrigger className="h-9 bg-slate-50 focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">Not Started</SelectItem>
                          <SelectItem value="on_track">On Track</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-col gap-2 pt-1">
                        <span className={cn(
                          "text-sm font-bold", 
                          progress === 100 ? "text-emerald-600" : progress > 0 ? "text-blue-600" : "text-slate-500"
                        )}>
                          {progress}%
                        </span>
                        <Progress 
                          value={progress} 
                          className={cn("h-1.5", progress === 100 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-blue-500")}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <Textarea
                        className="min-h-[60px] h-[60px] resize-none bg-slate-50 focus-visible:bg-white text-sm py-2"
                        value={draft.employeeComment}
                        onChange={(e) => updateDraft(goal.id, { employeeComment: e.target.value })}
                        placeholder="Add remarks..."
                      />
                    </td>
                  </tr>
                );
              })}
              {approvedGoals.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-slate-500">
                    No approved goals found for your account.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white/80 p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.02)] backdrop-blur-xl lg:left-72">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-3 px-2 lg:px-4">
          <Button
            type="button"
            variant="outline"
            className="h-10 border-slate-200 bg-white px-6 font-semibold text-slate-600 hover:bg-slate-50"
            disabled={isSaving || isSubmitting || approvedGoals.length === 0}
            onClick={() => handleSave(false)}
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isSaving ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            type="button"
            className="h-10 bg-blue-600 px-6 font-semibold text-white shadow-sm hover:bg-blue-700"
            disabled={isSaving || isSubmitting || approvedGoals.length === 0}
            onClick={() => handleSave(true)}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {isSubmitting ? "Submitting..." : "Submit Quarterly Review"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, progress }: { label: string; value: string | number; icon: any; progress?: number }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {progress !== undefined && (
            <Progress 
              value={progress} 
              className={cn("mt-3 h-1 w-24", progress === 100 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-blue-500")}
            />
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
