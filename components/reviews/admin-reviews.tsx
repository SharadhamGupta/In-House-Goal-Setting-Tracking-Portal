"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Download, FileText, Lock, LockOpen, Search, ShieldCheck, Unlock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

import { useWorkspace } from "@/components/providers/workspace-provider";
import { calculateProgressPercent, quarters } from "@/lib/domain/progress";
import { unlockGoal } from "@/lib/services/workspace-api-client";
import { cn } from "@/lib/utils";
import type { Goal, Quarter } from "@/lib/domain/types";

type TabType = "dashboard" | "reviews" | "audit";

type Props = {
  notify?: (title: string, description: string) => void;
};

export function AdminReviews({ notify }: Props) {
  const { users, goals, reviews, achievements, setGoals } = useWorkspace();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "reviews" || tabParam === "dashboard" || tabParam === "audit") {
        setActiveTab(tabParam as TabType);
      }
    }
  }, []);
  const [selectedQuarter, setSelectedQuarter] = useState<Quarter | "all">("Q1");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  
  // Tab 2: Reviews Table Filters
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewStatusFilter, setReviewStatusFilter] = useState<string>("all");
  const [reviewPage, setReviewPage] = useState(1);
  const reviewsPerPage = 8;
  
  // Tab 3: Audit Table Filters
  const [auditSearch, setAuditSearch] = useState("");
  const [auditTypeFilter, setAuditTypeFilter] = useState<string>("all");
  const [auditPage, setAuditPage] = useState(1);
  const auditsPerPage = 10;

  // Selected Employee Detail Modal
  const [viewingEmployeeId, setViewingEmployeeId] = useState<string | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Departments List
  const departments = useMemo(() => {
    const depts = new Set<string>();
    users.forEach((u) => {
      if (u.department) depts.add(u.department);
    });
    return Array.from(depts);
  }, [users]);

  // Overall Goal Setting Completion (at least one approved goal)
  const goalSettingCompletion = useMemo(() => {
    const employees = users.filter((u) => u.role === "employee");
    if (!employees.length) return 0;
    const completed = employees.filter((emp) => 
      goals.some((g) => g.ownerId === emp.id && g.status === "approved")
    ).length;
    return Math.round((completed / employees.length) * 100);
  }, [users, goals]);

  // Quarter-wise Completion
  const quarterCompletions = useMemo(() => {
    const employees = users.filter((u) => u.role === "employee");
    
    return quarters.reduce((acc, q) => {
      if (!employees.length) {
        acc[q] = 0;
        return acc;
      }
      
      const completedCount = employees.filter((emp) => {
        const empGoals = goals.filter((g) => g.ownerId === emp.id && g.status === "approved");
        if (!empGoals.length) return false;
        
        // All approved goals must have completed manager check-in in this quarter
        return empGoals.every((g) => {
          const ach = achievements.find((a) => a.goalId === g.id && a.quarter === q);
          return ach && ach.managerCheckinCompleted === true;
        });
      }).length;
      
      acc[q] = Math.round((completedCount / employees.length) * 100);
      return acc;
    }, {} as Record<Quarter, number>);
  }, [users, goals, achievements]);

  // Employees Pending Reviews (Active Quarter)
  const activeQuarter: Quarter = selectedQuarter === "all" ? "Q1" : selectedQuarter;
  const pendingCount = useMemo(() => {
    const employees = users.filter((u) => u.role === "employee");
    return employees.filter((emp) => {
      const empGoals = goals.filter((g) => g.ownerId === emp.id && g.status === "approved");
      if (!empGoals.length) return false;
      return !empGoals.every((g) => {
        const ach = achievements.find((a) => a.goalId === g.id && a.quarter === activeQuarter);
        return ach && ach.managerCheckinCompleted === true;
      });
    }).length;
  }, [users, goals, achievements, activeQuarter]);

  // Department-wise Completion Breakdown
  const departmentBreakdowns = useMemo(() => {
    return departments.map((dept) => {
      const deptUsers = users.filter((u) => u.department === dept && u.role === "employee");
      if (!deptUsers.length) return { dept, goalSet: 0, completed: 0, pending: 0, progress: 0 };

      let goalSetCount = 0;
      let completedCount = 0;

      deptUsers.forEach((emp) => {
        const empGoals = goals.filter((g) => g.ownerId === emp.id && g.status === "approved");
        if (empGoals.length > 0) {
          goalSetCount++;
          const checkinDone = empGoals.every((g) => {
            const ach = achievements.find((a) => a.goalId === g.id && a.quarter === activeQuarter);
            return ach && ach.status === "completed";
          });
          if (checkinDone) completedCount++;
        }
      });

      return {
        dept,
        goalSet: Math.round((goalSetCount / deptUsers.length) * 100),
        completed: completedCount,
        pending: deptUsers.length - completedCount,
        progress: Math.round((completedCount / deptUsers.length) * 100)
      };
    });
  }, [departments, users, goals, achievements, activeQuarter]);

  // All Reviews Data List
  const allReviewsList = useMemo(() => {
    const employees = users.filter((u) => u.role === "employee");
    
    return employees.map((emp) => {
      const dept = emp.department ?? "N/A";
      const manager = users.find((u) => u.id === emp.managerId)?.name ?? "N/A";
      const empGoals = goals.filter((g) => g.ownerId === emp.id && g.status === "approved");
      
      let reviewStatus = "Pending";
      let goalCompletionSum = 0;
      let lastCheckinTime = "No Check-in";
      let lockState = "Open";

      if (empGoals.length > 0) {
        const completedCheckins = empGoals.filter((g) => {
          const ach = achievements.find((a) => a.goalId === g.id && a.quarter === activeQuarter);
          return ach && ach.status === "completed";
        }).length;

        if (completedCheckins === empGoals.length) {
          reviewStatus = "Completed";
        } else if (completedCheckins > 0 || achievements.some(a => empGoals.some(g => g.id === a.goalId) && a.quarter === activeQuarter)) {
          reviewStatus = "In Progress";
        }

        // Check if escalated
        const hasEscalation = achievements.some(a => 
          empGoals.some(g => g.id === a.goalId) && 
          a.quarter === activeQuarter && 
          a.status === "not_started" && 
          new Date(a.updatedAt || a.createdAt) < new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
        );
        if (hasEscalation) reviewStatus = "Escalated";

        // Goal completion %
        empGoals.forEach((g) => {
          const ach = achievements.find((a) => a.goalId === g.id && a.quarter === activeQuarter);
          goalCompletionSum += calculateProgressPercent(g, ach?.actualValue ?? "", ach?.status ?? "not_started");
        });

        // Lock state
        const allLocked = empGoals.every((g) => g.locked);
        lockState = allLocked ? "Locked" : "Open";

        // Last checkin
        const empAchievements = achievements.filter(a => empGoals.some(g => g.id === a.goalId) && a.quarter === activeQuarter);
        if (empAchievements.length > 0) {
          const sorted = [...empAchievements].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
          lastCheckinTime = new Date(sorted[0].updatedAt || sorted[0].createdAt).toLocaleDateString();
        }
      }

      return {
        employee: emp,
        department: dept,
        manager,
        quarter: activeQuarter,
        status: reviewStatus,
        completion: empGoals.length ? Math.round(goalCompletionSum / empGoals.length) : 0,
        lastCheckin: lastCheckinTime,
        governance: lockState
      };
    });
  }, [users, goals, achievements, activeQuarter]);

  // Filtered Reviews list for Tab 2
  const filteredReviews = useMemo(() => {
    return allReviewsList.filter((item) => {
      const matchesSearch = item.employee.name.toLowerCase().includes(reviewSearch.toLowerCase()) ||
                            item.department.toLowerCase().includes(reviewSearch.toLowerCase()) ||
                            item.manager.toLowerCase().includes(reviewSearch.toLowerCase());
      
      const matchesDept = selectedDept === "all" || item.department === selectedDept;
      const matchesStatus = reviewStatusFilter === "all" || item.status === reviewStatusFilter;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [allReviewsList, reviewSearch, selectedDept, reviewStatusFilter]);

  // Audit Logs Tab 3
  const auditLogs = useMemo(() => {
    const list: any[] = [];
    
    // Synthesize logs from reviews (Approve/Reject decisions)
    reviews.forEach((rev) => {
      const goal = goals.find((g) => g.id === rev.goalId);
      const employee = users.find((u) => u.id === goal?.ownerId);
      const manager = users.find((u) => u.id === rev.managerId);
      
      if (goal && employee && manager) {
        list.push({
          id: rev.id,
          timestamp: new Date(rev.createdAt).toLocaleString(),
          employee: employee.name,
          changedBy: manager.name,
          actionType: rev.status === "approved" ? "Goal Approved" : "Goal Returned",
          fieldChanged: "Status",
          prevValue: "submitted",
          newValue: rev.status,
          reason: rev.comment || "Regular quarterly sync"
        });
      }
    });

    // Synthesize unlocked goal logs
    goals.forEach((goal) => {
      if (!goal.locked && goal.status === "approved") {
        const employee = users.find((u) => u.id === goal.ownerId);
        list.push({
          id: `unlock-${goal.id}`,
          timestamp: new Date(goal.updatedAt || goal.createdAt).toLocaleString(),
          employee: employee?.name ?? "N/A",
          changedBy: "System Admin",
          actionType: "Goal Reopened",
          fieldChanged: "Lock State",
          prevValue: "Locked",
          newValue: "Open",
          reason: "Manual administrative override request"
        });
      }
    });

    // Sort chronologically
    return list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [reviews, goals, users]);

  // Filtered Audits
  const filteredAudits = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchesSearch = log.employee.toLowerCase().includes(auditSearch.toLowerCase()) ||
                            log.changedBy.toLowerCase().includes(auditSearch.toLowerCase()) ||
                            log.actionType.toLowerCase().includes(auditSearch.toLowerCase()) ||
                            log.reason.toLowerCase().includes(auditSearch.toLowerCase());
      const matchesType = auditTypeFilter === "all" || log.actionType === auditTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [auditLogs, auditSearch, auditTypeFilter]);

  // Unlock individual goal state override
  async function handleUnlockGoal(goalId: string) {
    setUnlockingId(goalId);
    try {
      const unlocked = await unlockGoal(goalId);
      setGoals(goals.map((g) => (g.id === unlocked.id ? unlocked : g)));
      if (notify) notify("Goal Unlocked", "The goal lock state was overridden successfully.");
    } catch (err) {
      if (notify) notify("Override Failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setUnlockingId(null);
    }
  }

  // Handle Organization CSV Export
  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        const headers = [
          "Employee Name",
          "Department",
          "Manager",
          "Goal Title",
          "Thrust Area",
          "Target",
          "Weightage",
          "Quarter",
          "Actual Value",
          "Status",
          "Employee Remarks",
          "Manager Comment"
        ];

        const rows: string[][] = [];

        filteredReviews.forEach((item) => {
          const empGoals = goals.filter((g) => g.ownerId === item.employee.id && g.status === "approved");
          
          empGoals.forEach((goal) => {
            const ach = achievements.find((a) => a.goalId === goal.id && (selectedQuarter === "all" || a.quarter === selectedQuarter));
            rows.push([
              item.employee.name,
              item.department,
              item.manager,
              goal.title,
              goal.thrustArea,
              goal.target,
              `${goal.weightage}%`,
              ach?.quarter ?? "N/A",
              ach?.actualValue ?? "No update",
              ach?.status ?? "not_started",
              ach?.employeeComment ?? "",
              ach?.managerComment ?? ""
            ]);
          });
        });

        const csvContent = [
          headers.join(","),
          ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `GoalHub_Organization_Review_Report_${activeQuarter}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (notify) notify("Export Successful", "CSVs formatted and downloaded successfully.");
      } catch (err) {
        if (notify) notify("Export Failed", "Error creating download link. Please try again.");
      } finally {
        setIsExporting(false);
      }
    }, 600);
  };

  // Pagination bounds
  const paginatedReviews = useMemo(() => {
    const start = (reviewPage - 1) * reviewsPerPage;
    return filteredReviews.slice(start, start + reviewsPerPage);
  }, [filteredReviews, reviewPage]);

  const paginatedAudits = useMemo(() => {
    const start = (auditPage - 1) * auditsPerPage;
    return filteredAudits.slice(start, start + auditsPerPage);
  }, [filteredAudits, auditPage]);

  const viewingEmployee = users.find((u) => u.id === viewingEmployeeId);
  const viewingGoals = viewingEmployee ? goals.filter((g) => g.ownerId === viewingEmployee.id && g.status === "approved") : [];

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Organization Review</h2>
          <p className="mt-1 text-sm text-slate-500">Monitor organization-wide review completion and quarterly check-ins.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border bg-white p-1 shadow-sm">
            {["Q1", "Q2", "Q3", "Q4"].map((q) => (
              <button
                key={q}
                onClick={() => setSelectedQuarter(q as Quarter)}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-xs font-bold transition-all",
                  selectedQuarter === q
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100"
                )}
              >
                {q}
              </button>
            ))}
          </div>

          <Button
            onClick={handleExport}
            disabled={isExporting}
            variant="outline"
            className="shrink-0 gap-2 font-medium bg-white hover:bg-slate-50 border-slate-200"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200">
        {(["dashboard", "reviews", "audit"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "border-b-2 px-6 py-3.5 text-sm font-bold transition-all -mb-px capitalize",
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            )}
          >
            {tab === "audit" ? "Audit Trail" : tab === "reviews" ? "All Reviews" : "Completion Dashboard"}
          </button>
        ))}
      </div>

      {/* TAB 1: Completion Dashboard */}
      {activeTab === "dashboard" && (
        <div className="grid gap-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <SummaryCard label="Goal Setting" value={`${goalSettingCompletion}%`} progress={goalSettingCompletion} icon={ShieldCheck} />
            <SummaryCard label="Q1 Check-ins" value={`${quarterCompletions.Q1}%`} progress={quarterCompletions.Q1} icon={CheckCircle2} />
            <SummaryCard label="Q2 Check-ins" value={`${quarterCompletions.Q2}%`} progress={quarterCompletions.Q2} icon={CheckCircle2} />
            <SummaryCard label="Q3 Check-ins" value={`${quarterCompletions.Q3}%`} progress={quarterCompletions.Q3} icon={CheckCircle2} />
            <SummaryCard label="Q4 Check-ins" value={`${quarterCompletions.Q4}%`} progress={quarterCompletions.Q4} icon={CheckCircle2} />
            <SummaryCard label="Pending Active" value={pendingCount} icon={AlertCircle} tone={pendingCount > 0 ? "warn" : "good"} />
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <Card className="shadow-sm border-slate-200 lg:col-span-2">
              <CardHeader className="border-b bg-slate-50/50 p-5">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-500" />
                  Department Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 border-b">
                      <tr>
                        <th className="px-6 py-4">Department</th>
                        <th className="px-6 py-4 text-center">Goal Setting %</th>
                        <th className="px-6 py-4 w-48 text-center">Active Quarter Completion</th>
                        <th className="px-6 py-4 text-center">Pending Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {departmentBreakdowns.map(({ dept, goalSet, progress, pending }) => (
                        <tr key={dept} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-900">{dept}</td>
                          <td className="px-6 py-4 text-center font-bold text-slate-700">{goalSet}%</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3 justify-center">
                              <Progress value={progress} className="h-1.5 w-24 [&>div]:bg-blue-500" />
                              <span className="text-xs font-bold text-slate-700">{progress}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-amber-600">{pending}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="border-b bg-slate-50/50 p-5">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Lock className="h-5 w-5 text-indigo-500" />
                  Lock Governance Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 flex flex-col gap-6">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Locked Goals count</span>
                  <p className="text-4xl font-extrabold text-slate-900 mt-2">{goals.filter(g => g.locked).length}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unlocked (Active Drafting)</span>
                  <p className="text-4xl font-extrabold text-slate-600 mt-2">{goals.filter(g => !g.locked).length}</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200/60 p-4 text-xs font-medium text-slate-500 leading-relaxed">
                  System strictly overrides editing configurations upon goal lock activation. Admins must re-open goal status logs in standard governance audits to override locked reviews.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: All Reviews */}
      {activeTab === "reviews" && (
        <div className="grid gap-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search employee or manager..."
                value={reviewSearch}
                onChange={(e) => { setReviewSearch(e.target.value); setReviewPage(1); }}
                className="pl-9 h-10 border-slate-200"
              />
            </div>
          </div>

          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[1000px]">
                  <thead className="bg-slate-50/80 border-b text-xs font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Department</th>
                      <th className="px-6 py-4">Manager</th>
                      <th className="px-6 py-4 text-center">Quarter</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-center">Completion %</th>
                      <th className="px-6 py-4 text-center">Last Check-in</th>
                      <th className="px-6 py-4 text-center">Lock State</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedReviews.map(({ employee, department, manager, quarter, status, completion, lastCheckin, governance }) => (
                      <tr key={employee.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                              {employee.name.charAt(0)}
                            </div>
                            <span className="font-semibold text-slate-900">{employee.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{department}</td>
                        <td className="px-6 py-4 text-slate-600">{manager}</td>
                        <td className="px-6 py-4 text-center font-bold text-slate-900">{quarter}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn(
                            "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                            status === "Completed" && "bg-emerald-100 text-emerald-700",
                            status === "In Progress" && "bg-blue-100 text-blue-700",
                            status === "Pending" && "bg-slate-100 text-slate-500",
                            status === "Escalated" && "bg-rose-100 text-rose-700"
                          )}>
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 justify-center">
                            <Progress value={completion} className="h-1.5 w-16 [&>div]:bg-blue-500" />
                            <span className="text-xs font-bold text-slate-700">{completion}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-slate-500 text-xs font-semibold">{lastCheckin}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium",
                            governance === "Locked" ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"
                          )}>
                            {governance === "Locked" ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                            {governance}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingEmployeeId(employee.id)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold"
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {paginatedReviews.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                          No matching review rows found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {filteredReviews.length > reviewsPerPage && (
                <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                  <span className="text-xs font-bold text-slate-500">
                    Showing {(reviewPage - 1) * reviewsPerPage + 1} to {Math.min(reviewPage * reviewsPerPage, filteredReviews.length)} of {filteredReviews.length} records
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reviewPage === 1}
                      onClick={() => setReviewPage((prev) => prev - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reviewPage * reviewsPerPage >= filteredReviews.length}
                      onClick={() => setReviewPage((prev) => prev + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: Audit Trail */}
      {activeTab === "audit" && (
        <div className="grid gap-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search audit trail..."
                value={auditSearch}
                onChange={(e) => { setAuditSearch(e.target.value); setAuditPage(1); }}
                className="pl-9 h-10 border-slate-200"
              />
            </div>
          </div>

          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[1000px]">
                  <thead className="bg-slate-50/80 border-b text-xs font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Timestamp</th>
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Changed By</th>
                      <th className="px-6 py-4">Action Type</th>
                      <th className="px-6 py-4">Field Changed</th>
                      <th className="px-6 py-4">Prev Value</th>
                      <th className="px-6 py-4">New Value</th>
                      <th className="px-6 py-4">Reason / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {paginatedAudits.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-slate-500 text-xs font-semibold">{log.timestamp}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">{log.employee}</td>
                        <td className="px-6 py-4 text-slate-700">{log.changedBy}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            log.actionType === "Goal Approved" && "bg-emerald-100 text-emerald-700",
                            log.actionType === "Goal Reopened" && "bg-amber-100 text-amber-700",
                            log.actionType === "Goal Returned" && "bg-rose-100 text-rose-700"
                          )}>
                            {log.actionType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs font-semibold">{log.fieldChanged}</td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">{log.prevValue}</td>
                        <td className="px-6 py-4 font-mono text-xs text-blue-600 font-semibold">{log.newValue}</td>
                        <td className="px-6 py-4 text-slate-600 text-xs leading-relaxed max-w-[200px] truncate" title={log.reason}>{log.reason}</td>
                      </tr>
                    ))}
                    {paginatedAudits.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                          No audit trail events found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {filteredAudits.length > auditsPerPage && (
                <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                  <span className="text-xs font-bold text-slate-500">
                    Showing {(auditPage - 1) * auditsPerPage + 1} to {Math.min(auditPage * auditsPerPage, filteredAudits.length)} of {filteredAudits.length} records
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={auditPage === 1}
                      onClick={() => setAuditPage((prev) => prev - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={auditPage * auditsPerPage >= filteredAudits.length}
                      onClick={() => setAuditPage((prev) => prev + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* DETAIL MODAL: Employee Goal & Review State Override */}
      <Dialog open={!!viewingEmployeeId} onOpenChange={(open) => !open && setViewingEmployeeId(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] p-0 flex flex-col overflow-hidden">
          {viewingEmployee && (
            <>
              <div className="border-b bg-slate-50/80 p-6">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                      {viewingEmployee.name.charAt(0)}
                    </div>
                    {viewingEmployee.name} - Governance View
                  </DialogTitle>
                  <DialogDescription>
                    Review employee goal states, unlock goals, and oversee feedback channels.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                <div className="grid gap-6">
                  {viewingGoals.map((goal) => {
                    const ach = achievements.find((a) => a.goalId === goal.id && a.quarter === activeQuarter);
                    const progress = calculateProgressPercent(goal, ach?.actualValue ?? "", ach?.status ?? "not_started");
                    
                    return (
                      <div key={goal.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{goal.thrustArea}</span>
                            <h4 className="font-bold text-slate-900 text-base mt-1">{goal.title}</h4>
                            <p className="text-sm text-slate-500 mt-2">{goal.description}</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {goal.locked ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={unlockingId === goal.id}
                                onClick={() => handleUnlockGoal(goal.id)}
                                className="bg-white hover:bg-slate-50 text-xs font-bold border-slate-200"
                              >
                                <Unlock className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                                {unlockingId === goal.id ? "Unlocking..." : "Unlock Goal"}
                              </Button>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                <Unlock className="h-3.5 w-3.5" /> Open
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm border-t border-slate-100 pt-4 mt-4">
                          <div>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Target</span>
                            <span className="font-semibold text-slate-900">{goal.target}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Weightage</span>
                            <span className="font-semibold text-slate-900">{goal.weightage}%</span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Quarter Actual</span>
                            <span className="font-semibold text-slate-900">{ach?.actualValue || "No check-in"}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Progress</span>
                            <span className="font-bold text-emerald-600">{progress}%</span>
                          </div>
                        </div>

                        {ach?.employeeComment && (
                          <div className="mt-4 rounded-lg bg-slate-50 p-3 border border-slate-200/60 text-xs">
                            <span className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Employee Comment</span>
                            <span className="italic text-slate-700">{ach.employeeComment}</span>
                          </div>
                        )}
                        
                        {ach?.managerComment && (
                          <div className="mt-3 rounded-lg bg-slate-50 p-3 border border-slate-200/60 text-xs">
                            <span className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Manager Comment</span>
                            <span className="italic text-slate-700">{ach.managerComment}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {viewingGoals.length === 0 && (
                    <p className="text-center text-slate-500 text-sm py-6">No approved goals found for this employee.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value, progress, icon: Icon, tone = "neutral" }: { label: string; value: string | number; progress?: number; icon: any; tone?: "neutral" | "good" | "warn" }) {
  return (
    <Card className="border-slate-200 shadow-sm transition-all hover:shadow-md">
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {progress !== undefined && (
            <Progress 
              value={progress} 
              className={cn("mt-3 h-1.5 w-20", progress === 100 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-blue-500")}
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
