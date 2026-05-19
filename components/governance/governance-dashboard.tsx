"use client";

import { AlertCircle, Calendar, CheckCircle2, ChevronDown, ChevronUp, Edit2, FileText, Lock, LockOpen, Play, Plus, Unlock, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unlockGoal, upsertCycle, setActiveCycle, notifyCheckInWindowOpen } from "@/lib/services/workspace-api-client";
import { cn } from "@/lib/utils";
import type { Goal, GoalCycle, ManagerReview, Quarter, User } from "@/lib/domain/types";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { useWorkspace } from "@/components/providers/workspace-provider";

type Props = {
  goals: Goal[];
  users: User[];
  reviews: ManagerReview[];
  setGoals: (goals: Goal[]) => void;
  notify: (title: string, description: string) => void;
};

export function GovernanceDashboard({ goals, users, reviews, setGoals, notify }: Props) {
  const { goalCycles, setGoalCycles } = useWorkspace();
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [isCycleManagementOpen, setIsCycleManagementOpen] = useState(true);
  const [editingCycle, setEditingCycle] = useState<Partial<GoalCycle> | null>(null);
  const [isSavingCycle, setIsSavingCycle] = useState(false);

  function formatDate(dateStr?: string) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function formatToDateTimeLocal(dateString?: string) {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const handleSaveCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCycle) return;
    if (!editingCycle.year || !editingCycle.label) {
      notify("Validation Error", "Year and Label are required.");
      return;
    }
    setIsSavingCycle(true);
    try {
      const res = await upsertCycle(editingCycle);
      if (res.success) {
        notify("Success", `Goal cycle successfully ${editingCycle.id ? "updated" : "created"}.`);
        if (editingCycle.id) {
          setGoalCycles(goalCycles.map(c => c.id === res.cycle.id ? res.cycle : c));
        } else {
          setGoalCycles([res.cycle, ...goalCycles]);
        }
        setEditingCycle(null);
      }
    } catch (error) {
      notify("Error", error instanceof Error ? error.message : "Failed to save cycle.");
    } finally {
      setIsSavingCycle(false);
    }
  };

  const handleSetActiveCycle = async (cycleId: string) => {
    if (!confirm("Are you sure you want to set this cycle as the active one? This will deactivate all other cycles.")) return;
    try {
      const res = await setActiveCycle(cycleId);
      if (res.success) {
        notify("Success", "Cycle set as active successfully.");
        setGoalCycles(goalCycles.map(c => ({
          ...c,
          isActive: c.id === cycleId
        })));
      }
    } catch (error) {
      notify("Error", error instanceof Error ? error.message : "Failed to set active cycle.");
    }
  };

  const handleNotifyQuarter = async (quarter: Quarter, cycleId: string) => {
    if (!confirm("Send check-in window open notification to all employees with approved goals?")) return;
    try {
      const res = await notifyCheckInWindowOpen(quarter, cycleId);
      notify("Success", `${res.notified} employees notified.`);
    } catch (error) {
      notify("Error", error instanceof Error ? error.message : "Failed to send notifications.");
    }
  };

  const isWindowOpen = (opensAt?: string, closesAt?: string) => {
    if (!opensAt || !closesAt) return false;
    const now = new Date();
    return now >= new Date(opensAt) && now <= new Date(closesAt);
  };

  async function handleUnlock(goalId: string) {
    setUnlockingId(goalId);
    try {
      const unlockedGoal = await unlockGoal(goalId);
      setGoals(goals.map((goal) => (goal.id === unlockedGoal.id ? unlockedGoal : goal)));
      notify("Goal unlocked", "The employee can edit and resubmit this goal.");
    } catch (error) {
      notify("Unlock failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setUnlockingId(null);
    }
  }

  // Statistics Calculation
  const totalGoals = goals.length;
  const approvedGoals = goals.filter((g) => g.status === "approved").length;
  const draftGoals = goals.filter((g) => g.status === "draft").length;
  const submittedGoals = goals.filter((g) => g.status === "submitted").length;
  
  const lockedGoals = goals.filter((g) => g.locked).length;
  const unlockedGoals = totalGoals - lockedGoals;

  // Manager Effectiveness Calculation
  const managers = users.filter((u) => u.role === "manager" || u.role === "admin");
  const managerMetrics = managers.map((manager) => {
    const directReports = users.filter((u) => u.managerId === manager.id);
    const directReportIds = new Set(directReports.map((u) => u.id));
    
    const teamGoals = goals.filter((g) => directReportIds.has(g.ownerId));
    const teamApproved = teamGoals.filter((g) => g.status === "approved").length;
    const teamPending = teamGoals.filter((g) => g.status === "submitted").length;
    
    const approvalRate = teamGoals.length > 0 ? Math.round((teamApproved / teamGoals.length) * 100) : 0;
    
    return {
      manager,
      reportCount: directReports.length,
      totalGoals: teamGoals.length,
      teamApproved,
      teamPending,
      approvalRate
    };
  }).filter((m) => m.reportCount > 0); // Only show managers with direct reports

  return (
    <div className="grid gap-8">
      {/* Top Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Goals Tracked" value={totalGoals} icon={FileText} tone="neutral" />
        <MetricCard label="Approved Goals" value={approvedGoals} helper={`${submittedGoals} pending review`} icon={CheckCircle2} tone="good" />
        <MetricCard label="Locked (Active)" value={lockedGoals} helper="Editing restricted" icon={Lock} tone="warn" />
        <MetricCard label="Unlocked (Drafting)" value={unlockedGoals} helper="Currently editable" icon={Unlock} tone="neutral" />
      </div>

      {/* Cycle Management Card */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="border-b bg-slate-50/50 p-5 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-500" />
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight text-slate-900">Cycle Management</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Manage goal setting windows and active review cycles.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditingCycle({
                year: new Date().getFullYear(),
                label: `FY ${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`,
                goalSettingOpensAt: new Date().toISOString(),
                goalSettingClosesAt: new Date().toISOString(),
                q1OpensAt: new Date().toISOString(),
                q1ClosesAt: new Date().toISOString(),
                q2OpensAt: new Date().toISOString(),
                q2ClosesAt: new Date().toISOString(),
                q3OpensAt: new Date().toISOString(),
                q3ClosesAt: new Date().toISOString(),
                q4OpensAt: new Date().toISOString(),
                q4ClosesAt: new Date().toISOString(),
                isActive: false
              })}
              className="gap-1 font-medium bg-white hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" /> New Cycle
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCycleManagementOpen(!isCycleManagementOpen)}
              className="text-slate-500 hover:text-slate-700"
            >
              {isCycleManagementOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
          </div>
        </CardHeader>

        {isCycleManagementOpen && (
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Year</th>
                    <th className="px-5 py-3">Label</th>
                    <th className="px-5 py-3">Goal Setting Window</th>
                    <th className="px-5 py-3">Q1</th>
                    <th className="px-5 py-3">Q2</th>
                    <th className="px-5 py-3">Q3</th>
                    <th className="px-5 py-3">Q4</th>
                    <th className="px-5 py-3 text-center">Active</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {goalCycles.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">No goal cycles found. Create one above.</td>
                    </tr>
                  ) : (
                    goalCycles.map((cycle) => (
                      <tr key={cycle.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 font-semibold text-slate-900">{cycle.year}</td>
                        <td className="px-5 py-4 font-medium text-slate-700">{cycle.label}</td>
                        <td className="px-5 py-4 text-xs text-slate-600">
                          {formatDate(cycle.goalSettingOpensAt)}<br />to<br />{formatDate(cycle.goalSettingClosesAt)}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-600">
                          <div className="flex flex-col gap-1.5">
                            <div>
                              {formatDate(cycle.q1OpensAt)}<br />to<br />{formatDate(cycle.q1ClosesAt)}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!isWindowOpen(cycle.q1OpensAt, cycle.q1ClosesAt)}
                              onClick={() => handleNotifyQuarter("Q1", cycle.id)}
                              className="py-0.5 px-1.5 h-6 text-[10px] uppercase font-bold border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200"
                            >
                              Notify
                            </Button>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-600">
                          <div className="flex flex-col gap-1.5">
                            <div>
                              {formatDate(cycle.q2OpensAt)}<br />to<br />{formatDate(cycle.q2ClosesAt)}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!isWindowOpen(cycle.q2OpensAt, cycle.q2ClosesAt)}
                              onClick={() => handleNotifyQuarter("Q2", cycle.id)}
                              className="py-0.5 px-1.5 h-6 text-[10px] uppercase font-bold border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200"
                            >
                              Notify
                            </Button>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-600">
                          <div className="flex flex-col gap-1.5">
                            <div>
                              {formatDate(cycle.q3OpensAt)}<br />to<br />{formatDate(cycle.q3ClosesAt)}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!isWindowOpen(cycle.q3OpensAt, cycle.q3ClosesAt)}
                              onClick={() => handleNotifyQuarter("Q3", cycle.id)}
                              className="py-0.5 px-1.5 h-6 text-[10px] uppercase font-bold border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200"
                            >
                              Notify
                            </Button>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-600">
                          <div className="flex flex-col gap-1.5">
                            <div>
                              {formatDate(cycle.q4OpensAt)}<br />to<br />{formatDate(cycle.q4ClosesAt)}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!isWindowOpen(cycle.q4OpensAt, cycle.q4ClosesAt)}
                              onClick={() => handleNotifyQuarter("Q4", cycle.id)}
                              className="py-0.5 px-1.5 h-6 text-[10px] uppercase font-bold border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200"
                            >
                              Notify
                            </Button>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {cycle.isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!cycle.isActive && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSetActiveCycle(cycle.id)}
                                className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800 gap-1 font-semibold"
                              >
                                <Play className="h-3 w-3" /> Set Active
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingCycle(cycle)}
                              className="bg-white hover:bg-slate-50 gap-1"
                            >
                              <Edit2 className="h-3 w-3" /> Edit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {editingCycle && (
              <form onSubmit={handleSaveCycle} className="border-t border-slate-100 bg-slate-50/50 p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                    {editingCycle.id ? "Edit Goal Cycle" : "Create New Goal Cycle"}
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingCycle(null)}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="cycle-year">Year</Label>
                    <Input
                      id="cycle-year"
                      type="number"
                      required
                      value={editingCycle.year ?? ""}
                      onChange={(e) => setEditingCycle({ ...editingCycle, year: Number(e.target.value) })}
                      placeholder="e.g. 2025"
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="cycle-label">Label</Label>
                    <Input
                      id="cycle-label"
                      type="text"
                      required
                      value={editingCycle.label ?? ""}
                      onChange={(e) => setEditingCycle({ ...editingCycle, label: e.target.value })}
                      placeholder="e.g. FY 2025-26"
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="setting-opens">Goal Setting Opens</Label>
                    <Input
                      id="setting-opens"
                      type="datetime-local"
                      required
                      value={formatToDateTimeLocal(editingCycle.goalSettingOpensAt)}
                      onChange={(e) => setEditingCycle({ ...editingCycle, goalSettingOpensAt: new Date(e.target.value).toISOString() })}
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="setting-closes">Goal Setting Closes</Label>
                    <Input
                      id="setting-closes"
                      type="datetime-local"
                      required
                      value={formatToDateTimeLocal(editingCycle.goalSettingClosesAt)}
                      onChange={(e) => setEditingCycle({ ...editingCycle, goalSettingClosesAt: new Date(e.target.value).toISOString() })}
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="q1-opens">Q1 Window Opens</Label>
                    <Input
                      id="q1-opens"
                      type="datetime-local"
                      required
                      value={formatToDateTimeLocal(editingCycle.q1OpensAt)}
                      onChange={(e) => setEditingCycle({ ...editingCycle, q1OpensAt: new Date(e.target.value).toISOString() })}
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="q1-closes">Q1 Window Closes</Label>
                    <Input
                      id="q1-closes"
                      type="datetime-local"
                      required
                      value={formatToDateTimeLocal(editingCycle.q1ClosesAt)}
                      onChange={(e) => setEditingCycle({ ...editingCycle, q1ClosesAt: new Date(e.target.value).toISOString() })}
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="q2-opens">Q2 Window Opens</Label>
                    <Input
                      id="q2-opens"
                      type="datetime-local"
                      required
                      value={formatToDateTimeLocal(editingCycle.q2OpensAt)}
                      onChange={(e) => setEditingCycle({ ...editingCycle, q2OpensAt: new Date(e.target.value).toISOString() })}
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="q2-closes">Q2 Window Closes</Label>
                    <Input
                      id="q2-closes"
                      type="datetime-local"
                      required
                      value={formatToDateTimeLocal(editingCycle.q2ClosesAt)}
                      onChange={(e) => setEditingCycle({ ...editingCycle, q2ClosesAt: new Date(e.target.value).toISOString() })}
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="q3-opens">Q3 Window Opens</Label>
                    <Input
                      id="q3-opens"
                      type="datetime-local"
                      required
                      value={formatToDateTimeLocal(editingCycle.q3OpensAt)}
                      onChange={(e) => setEditingCycle({ ...editingCycle, q3OpensAt: new Date(e.target.value).toISOString() })}
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="q3-closes">Q3 Window Closes</Label>
                    <Input
                      id="q3-closes"
                      type="datetime-local"
                      required
                      value={formatToDateTimeLocal(editingCycle.q3ClosesAt)}
                      onChange={(e) => setEditingCycle({ ...editingCycle, q3ClosesAt: new Date(e.target.value).toISOString() })}
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="q4-opens">Q4 Window Opens</Label>
                    <Input
                      id="q4-opens"
                      type="datetime-local"
                      required
                      value={formatToDateTimeLocal(editingCycle.q4OpensAt)}
                      onChange={(e) => setEditingCycle({ ...editingCycle, q4OpensAt: new Date(e.target.value).toISOString() })}
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="q4-closes">Q4 Window Closes</Label>
                    <Input
                      id="q4-closes"
                      type="datetime-local"
                      required
                      value={formatToDateTimeLocal(editingCycle.q4ClosesAt)}
                      onChange={(e) => setEditingCycle({ ...editingCycle, q4ClosesAt: new Date(e.target.value).toISOString() })}
                      className="bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingCycle(null)}
                    className="bg-white hover:bg-slate-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSavingCycle}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                  >
                    {isSavingCycle ? "Saving Cycle..." : "Save Cycle"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        )}
      </Card>

      <div className="grid gap-8 xl:grid-cols-[1fr_2fr]">
        {/* Manager Effectiveness */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="border-b bg-slate-50/50 p-5">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-500" />
              Manager Effectiveness
            </CardTitle>
            <p className="text-sm text-slate-500">Goal approval throughput by team leader.</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Manager</th>
                    <th className="px-5 py-3 text-center">Reports</th>
                    <th className="px-5 py-3 text-center">Pending</th>
                    <th className="px-5 py-3 text-right">Approval %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {managerMetrics.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">No active managers found.</td>
                    </tr>
                  ) : (
                    managerMetrics.map((metrics) => (
                      <tr key={metrics.manager.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 font-medium text-slate-900">{metrics.manager.name}</td>
                        <td className="px-5 py-4 text-center text-slate-600">{metrics.reportCount}</td>
                        <td className="px-5 py-4 text-center">
                          <span className={cn(
                            "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold",
                            metrics.teamPending > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                          )}>
                            {metrics.teamPending}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-bold text-slate-700">{metrics.approvalRate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Global Goal Audit Table */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="border-b bg-slate-50/50 p-5">
            <CardTitle className="text-lg flex items-center gap-2">
              <LockOpen className="h-5 w-5 text-indigo-500" />
              Global Goal Register
            </CardTitle>
            <p className="text-sm text-slate-500">Administrative view to monitor and override goal lock states.</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Owner</th>
                    <th className="px-5 py-3">Goal Details</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-center">Lock State</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {goals.map((goal) => {
                    const owner = users.find((user) => user.id === goal.ownerId);
                    const latestReview = reviews
                      .filter((review) => review.goalId === goal.id)
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
                    
                    return (
                      <tr key={goal.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-900">{owner?.name}</p>
                          <p className="text-xs text-slate-500">{owner?.department}</p>
                        </td>
                        <td className="px-5 py-4 max-w-[250px]">
                          <p className="font-medium text-slate-900 truncate" title={goal.title}>{goal.title}</p>
                          {latestReview?.comment && (
                            <p className="mt-1 flex items-start gap-1 text-xs text-slate-500">
                              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                              <span className="line-clamp-1" title={latestReview.comment}>{latestReview.comment}</span>
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={goal.status} />
                        </td>
                        <td className="px-5 py-4 text-center">
                          {goal.locked ? (
                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              <Lock className="h-3 w-3" /> Locked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              <Unlock className="h-3 w-3" /> Open
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            disabled={!goal.locked || unlockingId === goal.id} 
                            onClick={() => handleUnlock(goal.id)}
                            className="bg-white hover:bg-slate-50"
                          >
                            {unlockingId === goal.id ? (
                              <span className="flex items-center">Unlocking...</span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Unlock className="h-3.5 w-3.5" /> Unlock
                              </span>
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {goals.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">No goals found in the system.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value, helper, icon: Icon, tone }: { label: string; value: number; helper?: string; icon: typeof CheckCircle2; tone: "good" | "warn" | "neutral" }) {
  const iconColors = {
    good: "bg-emerald-100 text-emerald-600",
    warn: "bg-amber-100 text-amber-600",
    neutral: "bg-blue-50 text-blue-600"
  }[tone];

  return (
    <Card className="border-0 shadow-sm ring-1 ring-slate-200">
      <CardContent className="flex items-start justify-between p-6">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          {helper && <p className="mt-1 text-xs text-slate-400">{helper}</p>}
        </div>
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", iconColors)}>
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}
