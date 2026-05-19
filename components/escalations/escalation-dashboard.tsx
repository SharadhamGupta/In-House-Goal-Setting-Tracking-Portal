"use client";

import { AlertTriangle, CheckCircle2, FileText, Filter, Info, RefreshCw, Search, ShieldAlert, TimerReset, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EscalationItem, EscalationStatus, EscalationType, User } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

type Props = {
  escalations: EscalationItem[];
  users: User[];
  syncing: boolean;
  resolvingId: string | null;
  onSync: () => Promise<void>;
  onResolve: (escalationId: string) => Promise<void>;
};

const typeLabels: Record<EscalationType, string> = {
  goal_submission_delay: "Goal Submission",
  approval_delay: "Manager Approval",
  quarterly_checkin_delay: "Quarterly Check-in"
};

const statusLabels: Record<EscalationStatus, string> = {
  pending: "Pending",
  escalated: "Escalated",
  overdue: "Overdue",
  resolved: "Resolved"
};

export function EscalationDashboard({ escalations, users, syncing, resolvingId, onSync, onResolve }: Props) {
  const [statusFilter, setStatusFilter] = useState<"all" | EscalationStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | EscalationType>("all");
  const [search, setSearch] = useState("");
  const activeEscalations = escalations.filter((item) => item.status !== "resolved");

  const filteredEscalations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return escalations.filter((item) => {
      const employee = findUser(users, item.employeeId);
      const manager = findUser(users, item.managerId);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesType = typeFilter === "all" || item.escalationType === typeFilter;
      const searchable = `${item.title} ${item.detail} ${employee?.name ?? ""} ${manager?.name ?? ""}`.toLowerCase();
      return matchesStatus && matchesType && (!query || searchable.includes(query));
    });
  }, [escalations, search, statusFilter, typeFilter, users]);

  const chartData = Object.entries(typeLabels).map(([type, label]) => ({
    type: label,
    count: activeEscalations.filter((item) => item.escalationType === type).length
  }));
  const criticalCount = activeEscalations.filter((item) => item.severity === "critical").length;
  const overdueCount = activeEscalations.filter((item) => item.status === "overdue").length;
  const resolvedCount = escalations.filter((item) => item.status === "resolved").length;

  return (
    <div className="grid gap-8">
      {/* Top Banner */}
      <Card className="overflow-hidden border-rose-200 shadow-sm">
        <CardHeader className="gap-4 border-b bg-gradient-to-r from-rose-50 to-white p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-3 text-2xl font-bold text-slate-900">
              <ShieldAlert className="h-7 w-7 text-rose-600" />
              Escalation Command Center
            </CardTitle>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Centralized governance for monitoring overdue submissions, manager approvals, and quarterly check-ins against defined SLAs.
            </p>
          </div>
          <Button 
            type="button" 
            className="bg-slate-900 text-white hover:bg-slate-800 shadow-sm gap-2"
            onClick={onSync} 
            disabled={syncing}
          >
            <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
            {syncing ? "Syncing..." : "Sync rules"}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-6 p-6 sm:grid-cols-2 xl:grid-cols-4">
          <EscalationKpi label="Active Escalations" value={activeEscalations.length} helper={`${criticalCount} critical`} icon={AlertTriangle} tone="risk" />
          <EscalationKpi label="Overdue Actions" value={overdueCount} helper="Needs immediate follow-up" icon={TimerReset} tone="warn" />
          <EscalationKpi label="Escalated Owners" value={new Set(activeEscalations.map((item) => item.employeeId).filter(Boolean)).size} helper="Employees impacted" icon={TrendingUp} tone="risk" />
          <EscalationKpi label="Resolved Issues" value={resolvedCount} helper="Historical resolutions" icon={CheckCircle2} tone="good" />
        </CardContent>
      </Card>

      <div className="grid gap-8 xl:grid-cols-[1fr_1.5fr]">
        {/* Escalation Rules Summary */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200">
          <CardHeader className="border-b bg-slate-50/50 p-5">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-900">
              <FileText className="h-5 w-5 text-indigo-500" />
              SLA Rules Summary
            </CardTitle>
            <p className="text-sm text-slate-500">Active Service Level Agreements enforcing goal compliance.</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <RuleItem 
                title="Goal Submission" 
                detail="Employees must draft and submit their initial goals within 14 days of the cycle opening." 
                severity="Medium"
              />
              <RuleItem 
                title="Manager Approval" 
                detail="Managers must review (approve or reject) submitted goals within 7 days of submission." 
                severity="High"
              />
              <RuleItem 
                title="Quarterly Check-in" 
                detail="Check-ins must be completed by the 15th of the month following the quarter end." 
                severity="Critical"
              />
            </div>
          </CardContent>
        </Card>

        {/* Escalation Chart */}
        <Card className="border-0 shadow-sm ring-1 ring-slate-200">
          <CardHeader className="border-b bg-slate-50/50 p-5">
            <CardTitle className="text-lg text-slate-900">Escalation Mix</CardTitle>
            <p className="text-sm text-slate-500">Volume of active rule hits across workflows.</p>
          </CardHeader>
          <CardContent className="h-72 p-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="type" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: '#64748b' }} dy={10} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} tick={{ fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#e11d48" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border-0 shadow-sm ring-1 ring-slate-200">
        <CardHeader className="gap-6 border-b bg-slate-50/50 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-xl text-slate-900">Escalation Register</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Monitor and manually resolve SLA breaches.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_160px_160px] lg:w-[600px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input 
                className="pl-9 h-10 bg-white" 
                value={search} 
                onChange={(event) => setSearch(event.target.value)} 
                placeholder="Search owner or details..." 
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | EscalationStatus)}>
              <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as "all" | EscalationType)}>
              <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="Workflow" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workflows</SelectItem>
                <SelectItem value="goal_submission_delay">Submission</SelectItem>
                <SelectItem value="approval_delay">Approval</SelectItem>
                <SelectItem value="quarterly_checkin_delay">Check-in</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <EscalationTable escalations={filteredEscalations} users={users} resolvingId={resolvingId} onResolve={onResolve} />
        </CardContent>
      </Card>
    </div>
  );
}

function RuleItem({ title, detail, severity }: { title: string; detail: string; severity: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="mt-1 rounded-full bg-slate-100 p-2">
        <Info className="h-4 w-4 text-slate-500" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-slate-900">{title}</h4>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">{severity} SLA</span>
        </div>
        <p className="mt-1 text-sm text-slate-600 leading-relaxed">{detail}</p>
      </div>
    </div>
  );
}

function EscalationKpi({ label, value, helper, icon: Icon, tone }: { label: string; value: number; helper: string; icon: typeof AlertTriangle; tone: "good" | "warn" | "risk" }) {
  const toneClass = {
    good: "bg-emerald-50 text-emerald-600",
    warn: "bg-amber-50 text-amber-600",
    risk: "bg-rose-50 text-rose-600"
  }[tone];

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{helper}</p>
        </div>
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", toneClass)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function EscalationTable({ escalations, users, resolvingId, onResolve }: { escalations: EscalationItem[]; users: User[]; resolvingId: string | null; onResolve: (id: string) => Promise<void> }) {
  if (!escalations.length) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center bg-slate-50/50">
        <Filter className="mb-4 h-10 w-10 text-slate-300" />
        <p className="text-lg font-semibold text-slate-900">No escalations match</p>
        <p className="mt-1 text-sm text-slate-500">Run sync or adjust filters to review history.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1000px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-6 py-4">Workflow Type</th>
            <th className="px-6 py-4">Owner & Manager</th>
            <th className="px-6 py-4">Details</th>
            <th className="px-6 py-4">Due Date</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {escalations.map((item) => {
            const employee = findUser(users, item.employeeId);
            const manager = findUser(users, item.managerId);
            return (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors align-top">
                <td className="px-6 py-5">
                  <span className="font-medium text-slate-900">{typeLabels[item.escalationType]}</span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
                      {employee?.name ? employee.name.charAt(0) : "?"}
                    </div>
                    <span className="font-medium text-slate-900">{employee?.name ?? "Unknown"}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">Manager: {manager?.name ?? "Not assigned"}</p>
                </td>
                <td className="px-6 py-5">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="mt-1 max-w-[280px] text-xs text-slate-500 leading-relaxed">{item.detail}</p>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <span className="text-slate-600">{formatDate(item.dueAt)}</span>
                </td>
                <td className="px-6 py-5 space-y-2">
                  <div><SeverityBadge severity={item.severity} /></div>
                  <div><EscalationStatusBadge status={item.status} /></div>
                </td>
                <td className="px-6 py-5 text-right">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-white shadow-sm hover:bg-slate-50"
                    disabled={item.status === "resolved" || resolvingId === item.id} 
                    onClick={() => onResolve(item.id)}
                  >
                    {resolvingId === item.id ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    {item.status === "resolved" ? "Resolved" : "Resolve"}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EscalationStatusBadge({ status }: { status: EscalationStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
        status === "resolved" && "bg-emerald-100 text-emerald-700",
        status === "pending" && "bg-slate-100 text-slate-600",
        status === "overdue" && "bg-amber-100 text-amber-700",
        status === "escalated" && "bg-rose-100 text-rose-700"
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: EscalationItem["severity"] }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
        severity === "medium" && "bg-amber-50 text-amber-700",
        severity === "high" && "bg-orange-50 text-orange-700",
        severity === "critical" && "bg-rose-50 text-rose-700"
      )}
    >
      {severity}
    </span>
  );
}

function findUser(users: User[], id: string | null) {
  return id ? users.find((user) => user.id === id) : undefined;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
