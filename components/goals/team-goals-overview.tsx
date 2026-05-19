"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Download, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { SharedGoalPanel } from "@/components/dashboard/goal-portal";
import { cn } from "@/lib/utils";
import type { Goal, ManagerReview, User } from "@/lib/domain/types";

export function TeamGoalsOverview({
  goals,
  users,
  reviews,
  currentUser,
  onPushSharedGoal
}: {
  goals: Goal[];
  users: User[];
  reviews: ManagerReview[];
  currentUser: User;
  onPushSharedGoal: (ownerIds: string[], goalData: any) => Promise<void>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const isManager = currentUser.role === "manager";
  const teamMembers = useMemo(() => {
    if (isManager) {
      return users.filter((u) => u.managerId === currentUser.id);
    }
    return users.filter((u) => u.role !== "admin");
  }, [currentUser.id, isManager, users]);

  const teamMemberIds = new Set(teamMembers.map((u) => u.id));
  const teamGoals = goals.filter((g) => teamMemberIds.has(g.ownerId));

  const departments = useMemo(() => {
    const deps = new Set(teamMembers.map((u) => u.department).filter(Boolean));
    return Array.from(deps) as string[];
  }, [teamMembers]);

  const filteredGoals = useMemo(() => {
    return teamGoals.filter((goal) => {
      const owner = teamMembers.find((u) => u.id === goal.ownerId);
      
      const matchesSearch =
        goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        owner?.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || goal.status === statusFilter;
      const matchesType = typeFilter === "all" || (typeFilter === "shared" ? goal.sharedGoalGroupId != null : goal.sharedGoalGroupId == null);
      const matchesDept = departmentFilter === "all" || owner?.department === departmentFilter;

      return matchesSearch && matchesStatus && matchesType && matchesDept;
    });
  }, [teamGoals, teamMembers, searchQuery, statusFilter, typeFilter, departmentFilter]);

  const toggleRow = (goalId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(goalId)) next.delete(goalId);
      else next.add(goalId);
      return next;
    });
  };

  const exportToCSV = () => {
    const headers = ["Owner", "Department", "Title", "Type", "Target", "Weightage", "Status", "Locked"];
    const csvContent = [
      headers.join(","),
      ...filteredGoals.map((goal) => {
        const owner = teamMembers.find((u) => u.id === goal.ownerId);
        return [
          `"${owner?.name || ""}"`,
          `"${owner?.department || ""}"`,
          `"${goal.title.replace(/"/g, '""')}"`,
          goal.sharedGoalGroupId ? "Shared" : "Individual",
          `"${goal.target.replace(/"/g, '""')}"`,
          goal.weightage,
          goal.status,
          goal.locked ? "Yes" : "No"
        ].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `team-goals-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {isManager && (
        <SharedGoalPanel
          users={users}
          currentUser={currentUser}
          goals={goals}
          onPushSharedGoal={onPushSharedGoal}
        />
      )}

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-slate-50/50">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Team Goals Database</h2>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                {filteredGoals.length}
              </span>
            </div>
            
            <div className="relative inline-block text-left">
              <Button onClick={() => setIsDropdownOpen(!isDropdownOpen)} variant="outline" className="shrink-0 gap-2 font-medium">
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4 ml-1 opacity-70" />
              </Button>
              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-lg bg-white p-1.5 shadow-lg border border-slate-100 ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        window.location.href = `/api/export?format=csv&managerId=${currentUser.id}`;
                      }}
                      className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-700 rounded-md hover:bg-slate-50 transition-colors font-medium"
                    >
                      Achievement Report (CSV)
                    </button>
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        window.location.href = `/api/export?format=xlsx&managerId=${currentUser.id}`;
                      }}
                      className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-700 rounded-md hover:bg-slate-50 transition-colors font-medium"
                    >
                      Achievement Report (XLSX)
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        exportToCSV();
                      }}
                      className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-500 rounded-md hover:bg-slate-50 hover:text-slate-700 transition-colors font-medium"
                    >
                      Goals List (CSV) (existing)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search goals or owners..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="shared">Shared</SelectItem>
              </SelectContent>
            </Select>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b bg-slate-50/50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">Goal Owner</th>
                <th className="px-6 py-4">Title & Type</th>
                <th className="px-6 py-4">Target</th>
                <th className="px-6 py-4 text-right">Weight</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredGoals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <SlidersHorizontal className="h-8 w-8 mb-3 opacity-50" />
                      <p className="text-base font-medium text-slate-600">No goals found</p>
                      <p className="text-sm">Try adjusting your search or filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredGoals.map((goal) => {
                  const owner = teamMembers.find((u) => u.id === goal.ownerId);
                  const latestReview = reviews
                    .filter((r) => r.goalId === goal.id)
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
                  const isExpanded = expandedRows.has(goal.id);

                  return (
                    <React.Fragment key={goal.id}>
                      <tr 
                        className={cn("group transition-colors hover:bg-slate-50/80 cursor-pointer", isExpanded && "bg-slate-50")}
                        onClick={() => toggleRow(goal.id)}
                      >
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900">{owner?.name}</p>
                          <p className="text-xs text-slate-500">{owner?.department}</p>
                        </td>
                        <td className="px-6 py-4 max-w-[300px]">
                          <p className="font-medium text-slate-900 truncate" title={goal.title}>{goal.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase", 
                              goal.sharedGoalGroupId != null ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"
                            )}>
                              {goal.sharedGoalGroupId != null ? "shared" : "individual"}
                            </span>
                            <span className="text-slate-400 truncate">{goal.thrustArea}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-700 truncate max-w-[200px]" title={goal.target}>{goal.target}</p>
                          <p className="text-xs text-slate-400 capitalize">{goal.uom.replace("_", " ")}</p>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-slate-700">
                          {goal.weightage}%
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={goal.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 group-hover:text-slate-600">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50 border-b-0">
                          <td colSpan={6} className="px-6 pb-6 pt-2">
                            <div className="grid gap-6 md:grid-cols-2 rounded-xl bg-white p-5 border shadow-sm">
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Goal Description</h4>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{goal.description || "No description provided."}</p>
                              </div>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Target & Measures</h4>
                                  <p className="text-sm font-medium text-slate-900">{goal.target}</p>
                                </div>
                                {latestReview?.comment && (
                                  <div className="rounded-lg bg-blue-50/50 p-3 border border-blue-100">
                                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1">Latest Manager Comment</h4>
                                    <p className="text-sm text-slate-700">{latestReview.comment}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
