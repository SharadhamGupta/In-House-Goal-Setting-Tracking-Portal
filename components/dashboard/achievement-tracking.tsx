"use client";

import { BarChart3, Bell, CheckCircle2, Clock3, Filter, Save, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { calculateProgressPercent, getLatestAchievement, getWeightedProgress, progressStatusLabels, quarters } from "@/lib/domain/progress";
import type { AchievementFormValues, AchievementUpdate, Goal, GoalProgressStatus, Quarter, Role, User } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

type Props = {
  role: Role;
  currentUser: User;
  users: User[];
  goals: Goal[];
  achievements: AchievementUpdate[];
  onSave: (goal: Goal, values: AchievementFormValues) => Promise<void>;
  onSendReminders?: (quarter: Quarter) => Promise<void>;
};

export function AchievementTracking({ role, currentUser, users, goals, achievements, onSave, onSendReminders }: Props) {
  const [reminderQuarter, setReminderQuarter] = useState<Quarter>("Q1");
  const [sendingReminders, setSendingReminders] = useState(false);
  
  // New Filters
  const [filterQuarter, setFilterQuarter] = useState<Quarter | "all">("all");
  const [filterStatus, setFilterStatus] = useState<GoalProgressStatus | "all">("all");

  const approvedGoals = useMemo(() => {
    let filtered = goals.filter((goal) => goal.status === "approved");

    if (role === "employee") {
      filtered = filtered.filter((goal) => goal.ownerId === currentUser.id);
    } else if (role === "manager") {
      const teamIds = new Set(users.filter((user) => user.managerId === currentUser.id).map((user) => user.id));
      filtered = filtered.filter((goal) => teamIds.has(goal.ownerId));
    }

    // Apply Client-Side Filters
    if (filterQuarter !== "all" || filterStatus !== "all") {
      filtered = filtered.filter((goal) => {
        // If quarter filter is active, get the achievement for that quarter
        // Otherwise use the latest achievement
        const achievement = filterQuarter !== "all" 
          ? achievements.find(a => a.goalId === goal.id && a.quarter === filterQuarter)
          : getLatestAchievement(goal.id, achievements);
        
        const currentStatus = achievement?.status ?? "not_started";
        const matchesQuarter = filterQuarter === "all" || (achievement && achievement.quarter === filterQuarter);
        const matchesStatus = filterStatus === "all" || currentStatus === filterStatus;

        return matchesQuarter && matchesStatus;
      });
    }

    return filtered;
  }, [currentUser.id, goals, role, users, filterQuarter, filterStatus, achievements]);

  const allApprovedGoalsForMetrics = useMemo(() => {
    if (role === "employee") {
      return goals.filter((goal) => goal.ownerId === currentUser.id && goal.status === "approved");
    }
    if (role === "manager") {
      const teamIds = new Set(users.filter((user) => user.managerId === currentUser.id).map((user) => user.id));
      return goals.filter((goal) => teamIds.has(goal.ownerId) && goal.status === "approved");
    }
    return goals.filter((goal) => goal.status === "approved");
  }, [currentUser.id, goals, role, users]);

  const weightedProgress = getWeightedProgress(allApprovedGoalsForMetrics, achievements);
  const completedCount = allApprovedGoalsForMetrics.filter((goal) => getLatestAchievement(goal.id, achievements)?.status === "completed").length;
  const onTrackCount = allApprovedGoalsForMetrics.filter((goal) => getLatestAchievement(goal.id, achievements)?.status === "on_track").length;
  const pendingReminderCount = allApprovedGoalsForMetrics.filter(
    (goal) => !achievements.some((achievement) => achievement.goalId === goal.id && achievement.quarter === reminderQuarter)
  ).length;

  async function sendReminders() {
    if (!onSendReminders || sendingReminders) return;
    setSendingReminders(true);
    try {
      await onSendReminders(reminderQuarter);
    } finally {
      setSendingReminders(false);
    }
  }

  return (
    <div className="grid gap-8">
      <div className="grid gap-4 md:grid-cols-3">
        <TrackingMetric label="Weighted Progress" value={`${weightedProgress}%`} icon={BarChart3} />
        <TrackingMetric label="On Track" value={onTrackCount} icon={Clock3} />
        <TrackingMetric label="Completed" value={completedCount} icon={CheckCircle2} />
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-slate-50/50">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">Quarterly Check-ins</h2>
              <p className="mt-1 text-sm text-slate-500 max-w-2xl">
                Track planned vs actual progress. Updates affect overall weighted completion based on your targets and UoM.
              </p>
            </div>
            
            {onSendReminders && (
              <div className="flex flex-col gap-2 rounded-lg bg-blue-50/50 p-3 border border-blue-100 sm:flex-row sm:items-center">
                <div className="text-sm font-medium text-blue-900 mr-2">Reminders:</div>
                <Select value={reminderQuarter} onValueChange={(quarter: Quarter) => setReminderQuarter(quarter)}>
                  <SelectTrigger className="w-full sm:w-[100px] h-9 bg-white border-blue-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {quarters.map((quarter) => (
                      <SelectItem key={quarter} value={quarter}>{quarter}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  type="button" 
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm"
                  disabled={!pendingReminderCount || sendingReminders} 
                  onClick={sendReminders}
                >
                  {sendingReminders ? <Clock3 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                  Send ({pendingReminderCount})
                </Button>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Filter className="h-4 w-4 text-slate-400" /> Filters:
            </div>
            <div className="flex flex-col gap-3 sm:flex-row w-full sm:w-auto">
              <Select value={filterQuarter} onValueChange={(value: Quarter | "all") => setFilterQuarter(value)}>
                <SelectTrigger className="w-full sm:w-[160px] bg-white">
                  <SelectValue placeholder="All Quarters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Quarters</SelectItem>
                  {quarters.map((quarter) => (
                    <SelectItem key={quarter} value={quarter}>{quarter}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={(value: GoalProgressStatus | "all") => setFilterStatus(value)}>
                <SelectTrigger className="w-full sm:w-[180px] bg-white">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="on_track">On Track</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50/30">
          <CheckInSchedule />
          
          <div className="mt-8 grid gap-6">
            {approvedGoals.length ? (
              approvedGoals.map((goal) => (
                <AchievementGoalRow
                  key={goal.id}
                  role={role}
                  owner={users.find((user) => user.id === goal.ownerId)}
                  goal={goal}
                  achievement={getLatestAchievement(goal.id, achievements)}
                  onSave={onSave}
                />
              ))
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
                <div className="mb-4 rounded-full bg-slate-50 p-4">
                  <SlidersHorizontal className="h-10 w-10 text-slate-400" />
                </div>
                <p className="text-lg font-semibold text-slate-900">No goals found</p>
                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  Try adjusting your filters, or wait for goals to be approved. Quarterly updates unlock once goals are fully approved.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckInSchedule() {
  const windows = [
    ["Goal Setting", "1 May", "Creation & approval"],
    ["Q1", "July", "Q1 Actuals update"],
    ["Q2", "October", "Q2 Actuals update"],
    ["Q3", "January", "Q3 Actuals update"],
    ["Q4 / Annual", "April", "Final achievements"]
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
      {windows.map(([period, opens, action]) => (
        <div key={period} className="rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{period}</p>
            <div className="h-2 w-2 rounded-full bg-blue-400"></div>
          </div>
          <p className="mt-2 text-lg font-bold text-slate-900">{opens}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{action}</p>
        </div>
      ))}
    </div>
  );
}

function AchievementGoalRow({
  role,
  owner,
  goal,
  achievement,
  onSave
}: {
  role: Role;
  owner?: User;
  goal: Goal;
  achievement?: AchievementUpdate;
  onSave: (goal: Goal, values: AchievementFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<AchievementFormValues>({
    quarter: achievement?.quarter ?? "Q1",
    actualValue: achievement?.actualValue ?? "",
    status: achievement?.status ?? "not_started",
    employeeComment: achievement?.employeeComment ?? "",
    managerComment: achievement?.managerComment ?? ""
  });
  const [saving, setSaving] = useState(false);
  const canEditEmployeeFields = role === "employee" || role === "admin";
  const canEditManagerComment = role === "manager" || role === "admin";
  const previewProgress = calculateProgressPercent(goal, values.actualValue, values.status);

  useEffect(() => {
    setValues({
      quarter: achievement?.quarter ?? "Q1",
      actualValue: achievement?.actualValue ?? "",
      status: achievement?.status ?? "not_started",
      employeeComment: achievement?.employeeComment ?? "",
      managerComment: achievement?.managerComment ?? ""
    });
  }, [achievement]);

  async function save() {
    setSaving(true);
    try {
      await onSave(goal, values);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Header Section */}
      <div className="border-b bg-slate-50/80 p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-bold text-slate-900">{goal.title}</h3>
              <ProgressPill status={achievement?.status ?? values.status} />
              {goal.sharedGoalGroupId && (
                <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-700">
                  Shared
                </span>
              )}
            </div>
            
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              {owner && (
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
                    {owner.name.charAt(0)}
                  </div>
                  <span className="font-medium text-slate-700">{owner.name}</span>
                </div>
              )}
              <div className="flex items-center gap-2 border-l pl-6">
                <span className="text-slate-500">Target:</span>
                <span className="font-bold text-slate-900">{goal.target}</span>
              </div>
              <div className="flex items-center gap-2 border-l pl-6">
                <span className="text-slate-500">UoM:</span>
                <span className="font-medium capitalize text-slate-700">{goal.uom.replace("_", " ")}</span>
              </div>
              <div className="flex items-center gap-2 border-l pl-6">
                <span className="text-slate-500">Weightage:</span>
                <span className="font-bold text-slate-900">{goal.weightage}%</span>
              </div>
            </div>
          </div>

          <div className="w-full rounded-xl bg-white p-4 border shadow-sm lg:w-64 lg:shrink-0">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {achievement ? "Saved Progress" : "Preview Progress"}
              </span>
              <span className="text-lg font-bold text-blue-600">
                {achievement?.progressPercent ?? previewProgress}%
              </span>
            </div>
            <Progress 
              value={achievement?.progressPercent ?? previewProgress} 
              className="h-2 [&>div]:bg-blue-500" 
            />
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="p-5 sm:p-6">
        <div className="grid gap-5 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Quarter</label>
            <Select
              value={values.quarter}
              disabled={!canEditEmployeeFields}
              onValueChange={(quarter: Quarter) => setValues((current) => ({ ...current, quarter }))}
            >
              <SelectTrigger className="h-11 bg-slate-50 focus:bg-white transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {quarters.map((quarter) => (
                  <SelectItem key={quarter} value={quarter}>{quarter}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Actual Achievement</label>
            <Input
              className="h-11 bg-slate-50 focus:bg-white transition-colors"
              value={values.actualValue}
              onChange={(event) => setValues((current) => ({ ...current, actualValue: event.target.value }))}
              placeholder={goal.uom === "timeline" ? "e.g., 2026-06-30" : "Enter actual value"}
              disabled={!canEditEmployeeFields}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</label>
            <Select
              value={values.status}
              disabled={!canEditEmployeeFields}
              onValueChange={(status: GoalProgressStatus) => setValues((current) => ({ ...current, status }))}
            >
              <SelectTrigger className="h-11 bg-slate-50 focus:bg-white transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="on_track">On Track</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Employee Update</label>
            <Textarea
              className="min-h-[100px] resize-none bg-slate-50 focus-visible:bg-white transition-colors"
              value={values.employeeComment}
              onChange={(event) => setValues((current) => ({ ...current, employeeComment: event.target.value }))}
              placeholder="Detail your achievements, blockers, and next steps..."
              disabled={!canEditEmployeeFields}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Manager Comment</label>
            <Textarea
              className={cn(
                "min-h-[100px] resize-none transition-colors", 
                canEditManagerComment ? "bg-slate-50 focus-visible:bg-white" : "bg-slate-50/50"
              )}
              value={values.managerComment}
              onChange={(event) => setValues((current) => ({ ...current, managerComment: event.target.value }))}
              placeholder={role === "employee" ? "Manager check-in comments will appear here." : "Provide feedback on this quarter's achievement."}
              disabled={!canEditManagerComment}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end border-t pt-5">
          <Button 
            type="button" 
            className="bg-slate-900 text-white hover:bg-slate-800 shadow-md gap-2"
            onClick={save} 
            disabled={saving}
          >
            {saving ? <Clock3 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save update"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TrackingMetric({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof BarChart3 }) {
  return (
    <Card className="border-0 shadow-sm ring-1 ring-slate-200">
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressPill({ status }: { status: GoalProgressStatus }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
        status === "completed" && "bg-emerald-100 text-emerald-700",
        status === "on_track" && "bg-blue-100 text-blue-700",
        status === "not_started" && "bg-slate-100 text-slate-600"
      )}
    >
      {progressStatusLabels[status]}
    </span>
  );
}
