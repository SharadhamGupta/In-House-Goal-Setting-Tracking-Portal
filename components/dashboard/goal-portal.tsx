"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  Users,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GoalFormDialog } from "@/components/goals/goal-form-dialog";
import { logoutAction } from "@/app/login/actions";
import { AchievementTracking } from "@/components/dashboard/achievement-tracking";
import { EscalationDashboard } from "@/components/escalations/escalation-dashboard";
import { NotificationMenu } from "@/components/notifications/notification-menu";
import { VisualDashboard } from "@/components/dashboard/visual-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Toast, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { MAX_GOALS, isEmployeeEditableStatus, validateGoalSet } from "@/lib/domain/goal-validation";
import type { AchievementFormValues, AchievementUpdate, AuthProfile, EscalationItem, Goal, GoalCycle, GoalFormValues, ManagerReview, NotificationItem, Quarter, Role, User } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import {
  decideGoals,
  deleteGoal,
  insertGoal,
  loadWorkspace,
  markNotificationsRead,
  pushSharedGoal,
  resolveEscalation,
  sendQuarterlyCheckInReminders,
  submitGoals as submitWorkspaceGoals,
  syncEscalations,
  unlockGoal,
  updateGoal,
  updateGoalFields,
  upsertAchievement
} from "@/lib/services/workspace-api-client";
import { StatusBadge } from "./status-badge";

const roleCopy: Record<Role, { title: string; subtitle: string }> = {
  employee: {
    title: "My Goals",
    subtitle: "Draft, validate, and submit measurable goals for approval."
  },
  manager: {
    title: "Team Review Queue",
    subtitle: "Monitor submitted plans, tune targets, and complete approvals."
  },
  admin: {
    title: "Governance Console",
    subtitle: "View goal health across users and unlock approved goals when needed."
  }
};

type GoalPortalProps = {
  initialRole?: Role;
  profile?: AuthProfile;
};

import { useRouter } from "next/navigation";

export function GoalPortal({ initialRole = "employee", profile }: GoalPortalProps) {
  const router = useRouter();
  useEffect(() => {
    router.push("/dashboard");
  }, [router]);
  return null;
}

function SidebarContent({
  role,
  collapsed,
  onNavigate,
  onToggleCollapse
}: {
  role: Role;
  collapsed: boolean;
  onNavigate: (sectionId: string) => void;
  onToggleCollapse?: () => void;
}) {
  const navItems = [
    { label: "Dashboard", sectionId: "dashboard", icon: LayoutDashboard },
    { label: "Goals", sectionId: role === "employee" ? "goals" : "dashboard", icon: ClipboardList },
    { label: "Reviews", sectionId: role === "manager" ? "reviews" : "tracking", icon: CheckCircle2 },
    { label: "Tracking", sectionId: "tracking", icon: Users },
    { label: "Governance", sectionId: role === "admin" ? "governance" : "dashboard", icon: ShieldCheck },
    { label: "Escalations", sectionId: role === "admin" ? "escalations" : "dashboard", icon: AlertCircle }
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn("mb-8 flex items-center gap-3 px-2", collapsed && "flex-col px-0")}>
        <div className={cn("flex min-w-0 items-center gap-3", collapsed && "flex-col")}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <div className={cn("min-w-0", collapsed && "hidden")}>
            <p className="font-semibold">AtomBerg GoalHub</p>
            <p className="text-xs text-muted-foreground">Hackathon MVP</p>
          </div>
        </div>
        {onToggleCollapse ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn("ml-auto h-8 w-8 shrink-0", collapsed && "ml-0")}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={onToggleCollapse}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        ) : null}
      </div>

      <nav className="grid gap-1 text-sm">
        {navItems.map(({ label, sectionId, icon: Icon }) => (
          <button
            type="button"
            key={`${label}-${sectionId}`}
            title={collapsed ? label : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              collapsed && "justify-center px-0"
            )}
            onClick={() => onNavigate(sectionId)}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className={cn(collapsed && "sr-only")}>{label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto grid gap-3">
        <div className={cn("rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground", collapsed && "p-2 text-center")}>
          <p className={cn("font-medium text-foreground", collapsed && "sr-only")}>Current role</p>
          <p className={cn("mt-1 capitalize", collapsed && "mt-0 text-[10px]")}>{role === "admin" ? (collapsed ? "HR" : "Admin / HR") : role}</p>
        </div>
      </div>
    </div>
  );
}

export function EmployeeDashboard({
  goals,
  reviews,
  validation,
  onCreate,
  onEdit,
  onDelete,
  onSubmit,
  isSubmitting,
  activeCycle
}: {
  goals: Goal[];
  reviews: ManagerReview[];
  validation: ReturnType<typeof validateGoalSet>;
  onCreate: () => void;
  onEdit: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  activeCycle: GoalCycle | null;
}) {
  const hasSubmittedGoals = goals.some((goal) => goal.status === "submitted");
  const editableGoalCount = goals.filter((goal) => isEmployeeEditableStatus(goal.status) && !goal.locked).length;

  let bannerEl = null;
  let isWindowOpen = true;

  if (activeCycle) {
    const now = new Date();
    const opens = new Date(activeCycle.goalSettingOpensAt);
    const closes = new Date(activeCycle.goalSettingClosesAt);

    if (now < opens) {
      isWindowOpen = false;
      bannerEl = (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>Goal submission opens on <span className="font-semibold">{opens.toDateString()}</span>. You can still create and edit drafts.</span>
        </div>
      );
    } else if (now > closes) {
      isWindowOpen = false;
      bannerEl = (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>Goal submission window has closed for this cycle.</span>
        </div>
      );
    } else {
      bannerEl = (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>Goal submission window is open until <span className="font-semibold">{closes.toDateString()}</span>.</span>
        </div>
      );
    }
  }

  const canSubmit = validation.canSubmit && editableGoalCount > 0 && !hasSubmittedGoals && isWindowOpen;
  return (
    <div className="space-y-4">
      {bannerEl}
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Goal plan</CardTitle>
              <p className="text-sm text-muted-foreground">Up to 8 goals, each with at least 10% weightage.</p>
            </div>
            <Button onClick={onCreate} disabled={goals.length >= MAX_GOALS}>
              <Plus className="h-4 w-4" />
              New Goal
            </Button>
          </CardHeader>
          <CardContent>
            <GoalTable goals={goals} reviews={reviews} onEdit={onEdit} onDelete={onDelete} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submission health</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Active submission weightage</span>
                <span className={cn("font-medium", validation.totalWeightage === 100 ? "text-emerald-700" : "text-slate-700")}>
                  {validation.totalWeightage}%
                </span>
              </div>
              <Progress value={Math.min(validation.totalWeightage, 100)} />
            </div>
            {validation.issues.length ? (
              <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                {validation.issues.map((issue) => (
                  <p key={issue}>{issue}</p>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Ready for manager approval.</div>
            )}
            {hasSubmittedGoals ? (
              <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
                Submitted goals are with your manager. Returned goals can be edited and resubmitted.
              </div>
            ) : null}
            <div className="flex flex-col gap-2">
              <Button 
                disabled={!canSubmit || isSubmitting} 
                onClick={onSubmit}
                title={!isWindowOpen ? "Goal submission window is not currently open" : undefined}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Submit goals
              </Button>
              {!isWindowOpen && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium text-center">
                  Submission locked outside the cycle window.
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Approved goals stay visible but locked. Admins can unlock exceptions.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function GoalTable({
  goals,
  reviews,
  onEdit,
  onDelete
}: {
  goals: Goal[];
  reviews?: ManagerReview[];
  onEdit?: (goal: Goal) => void;
  onDelete?: (goalId: string) => void;
}) {
  if (!goals.length) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 p-8 text-center">
        <ClipboardList className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="font-medium">No goals yet</p>
        <p className="text-sm text-muted-foreground">Create draft goals to begin the approval workflow.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="border-b text-xs uppercase text-muted-foreground">
          <tr>
            <th className="py-3 pr-4">Goal</th>
            <th className="py-3 pr-4">UoM</th>
            <th className="py-3 pr-4">Target</th>
            <th className="py-3 pr-4">Weight</th>
            <th className="py-3 pr-4">Status</th>
            <th className="py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {goals.map((goal) => {
            const latestReview = reviews
              ?.filter((review) => review.goalId === goal.id)
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
            return (
              <tr key={goal.id} className="align-top">
                <td className="py-4 pr-4">
                  <p className="font-medium">{goal.title}</p>
                  <p className="text-xs text-muted-foreground">{goal.thrustArea}</p>
                  <p className="mt-1 line-clamp-2 max-w-md text-xs text-muted-foreground">{goal.description}</p>
                  {latestReview?.comment ? (
                    <p className="mt-2 rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground">
                      Manager comment: {latestReview.comment}
                    </p>
                  ) : null}
                </td>
                <td className="py-4 pr-4 capitalize">{goal.uom.replace("_", " ")}</td>
                <td className="py-4 pr-4">
                  <div className="flex flex-col gap-1">
                    <span>{goal.target}</span>
                    <span className="w-fit rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium uppercase text-muted-foreground">
                      {goal.goalType}
                    </span>
                  </div>
                </td>
                <td className="py-4 pr-4">{goal.weightage}%</td>
                <td className="py-4 pr-4"><StatusBadge status={goal.status} /></td>
                <td className="py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={goal.locked || !isEmployeeEditableStatus(goal.status)}
                      onClick={() => onEdit?.(goal)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={goal.locked || !isEmployeeEditableStatus(goal.status)}
                      onClick={() => onDelete?.(goal.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ManagerDashboard({
  goals,
  users,
  currentUser,
  setGoals,
  reviews,
  setReviews,
  notify,
  onNotificationsChanged,
  onPushSharedGoal
}: {
  goals: Goal[];
  users: User[];
  currentUser: User;
  setGoals: (goals: Goal[]) => void;
  reviews: ManagerReview[];
  setReviews: (reviews: ManagerReview[]) => void;
  notify: (title: string, description: string) => void;
  onNotificationsChanged: () => Promise<void>;
  onPushSharedGoal: (ownerIds: string[]) => Promise<void>;
}) {
  const submittedOwners = useMemo(() => {
    const ownerIds = new Set(goals.filter((goal) => goal.status === "submitted").map((goal) => goal.ownerId));
    return users.filter((user) => ownerIds.has(user.id) && user.managerId === currentUser.id);
  }, [currentUser.id, goals, users]);
  const [comment, setComment] = useState("Looks aligned to the quarter priorities.");
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
    if (status === "rejected" && comment.trim().length < 3) {
      notify("Comment required", "Add a short rework comment before returning goals.");
      return;
    }
    setDecidingOwnerId(ownerId);
    try {
      const result = await decideGoals(ownerId, status, comment.trim());
      const decidedGoals = result.goals;
      setGoals(goals.map((goal) => decidedGoals.find((decidedGoal) => decidedGoal.id === goal.id) ?? goal));
      setReviews([...reviews, ...result.reviews]);
      await onNotificationsChanged();
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
      <div className="grid gap-6">
        <SharedGoalPanel users={users} currentUser={currentUser} goals={goals} onPushSharedGoal={onPushSharedGoal} />
        <EmptyPanel icon={Users} title="No submitted goals" text="Team submissions will appear here for manager review." />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <SharedGoalPanel users={users} currentUser={currentUser} goals={goals} onPushSharedGoal={onPushSharedGoal} />
      {submittedOwners.map((owner) => {
        const ownerGoals = goals.filter((goal) => goal.ownerId === owner.id && goal.status === "submitted");
        const reviewValidation = validateGoalSet(ownerGoals);
        return (
          <Card key={owner.id}>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>{owner.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{owner.department} · {owner.title}</p>
              </div>
              <StatusBadge status="submitted" />
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-3 pr-4">Goal</th>
                      <th className="py-3 pr-4">Type</th>
                      <th className="py-3 pr-4">Target</th>
                      <th className="py-3 pr-4">Weightage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ownerGoals.map((goal) => (
                      <tr key={goal.id}>
                        <td className="py-3 pr-4">
                          <p className="font-medium">{goal.title}</p>
                          <p className="text-xs text-muted-foreground">{goal.thrustArea}</p>
                        </td>
                        <td className="py-3 pr-4 uppercase">{goal.goalType}</td>
                        <td className="py-3 pr-4">
                          <Input value={goal.target} onChange={(event) => updateInline(goal.id, { target: event.target.value })} />
                        </td>
                        <td className="py-3 pr-4">
                          <Input
                            type="number"
                            min={10}
                            value={goal.weightage}
                            onChange={(event) => updateInline(goal.id, { weightage: Number(event.target.value) })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="rounded-xl border bg-muted/30 p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Submitted weightage</span>
                  <span className={cn("font-medium", reviewValidation.canSubmit ? "text-emerald-700" : "text-amber-700")}>
                    {reviewValidation.totalWeightage}%
                  </span>
                </div>
                <Progress value={Math.min(reviewValidation.totalWeightage, 100)} />
                {reviewValidation.issues.length ? (
                  <div className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{reviewValidation.issues.join(" ")}</span>
                  </div>
                ) : null}
              </div>
              <Textarea
                aria-label={`Manager review comment for ${owner.name}`}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Add review comments for the employee."
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" disabled={decidingOwnerId === owner.id} onClick={() => decide(owner.id, "rejected")}>
                  {decidingOwnerId === owner.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Reject
                </Button>
                <Button disabled={!reviewValidation.canSubmit || decidingOwnerId === owner.id} onClick={() => decide(owner.id, "approved")}>
                  {decidingOwnerId === owner.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Approve
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function SharedGoalPanel({
  users,
  currentUser,
  goals,
  onPushSharedGoal
}: {
  users: User[];
  currentUser: User;
  goals: Goal[];
  onPushSharedGoal: (ownerIds: string[], goalData: any) => Promise<void>;
}) {
  const teamMembers = useMemo(() => {
    return users.filter((user) => user.managerId === currentUser.id);
  }, [users, currentUser.id]);

  // Dynamic Goal States
  const [title, setTitle] = useState("");
  const [thrustArea, setThrustArea] = useState("");
  const [uomType, setUomType] = useState("numeric");
  const [goalType, setGoalType] = useState("max");
  const [target, setTarget] = useState("");
  const [weightage, setWeightage] = useState(10);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isPushing, setIsPushing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastSyncedTitle, setLastSyncedTitle] = useState("");

  // Compute pending owners dynamically based on typed title
  const pendingOwners = useMemo(() => {
    const alreadyAssigned = new Set(
      goals
        .filter((goal) => goal.title.toLowerCase() === title.toLowerCase().trim() && title.trim().length >= 3)
        .map((goal) => goal.ownerId)
    );
    return teamMembers.filter((user) => !alreadyAssigned.has(user.id)).map((user) => user.id);
  }, [goals, teamMembers, title]);

  // Sync selected users when pending list changes
  useEffect(() => {
    if (title.trim() !== lastSyncedTitle.trim()) {
      setSelectedUserIds(pendingOwners);
      setLastSyncedTitle(title);
    }
  }, [pendingOwners, title, lastSyncedTitle]);

  async function handlePush() {
    if (!title || title.trim().length < 3) {
      setFormError("Goal title must be at least 3 characters.");
      return;
    }
    if (!thrustArea) {
      setFormError("Thrust area is required.");
      return;
    }
    if (!target) {
      setFormError("Target is required.");
      return;
    }
    if (weightage < 10 || weightage > 100) {
      setFormError("Default weightage must be between 10 and 100.");
      return;
    }
    if (!selectedUserIds.length) {
      setFormError("Please select at least one direct report.");
      return;
    }

    setFormError(null);
    setIsPushing(true);

    try {
      await onPushSharedGoal(selectedUserIds, {
        title: title.trim(),
        thrustArea: thrustArea.trim(),
        uomType,
        goalType: uomType === "timeline" || uomType === "zero_based" ? "min" : goalType,
        target: target.trim(),
        weightage
      });
      
      // Reset form fields
      setTitle("");
      setLastSyncedTitle("");
      setThrustArea("");
      setTarget("");
      setWeightage(10);
      setFormError(null);
      setSelectedUserIds([]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to push shared goal.");
    } finally {
      setIsPushing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Push Shared Departmental KPI</CardTitle>
        <p className="text-sm text-muted-foreground">
          Define a shared KPI and push it to direct reports. Recipients can adjust weightage only.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form fields above employee selector */}
        <div className="grid gap-4 border-b pb-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-slate-700 font-medium">Goal Title</Label>
              <Input
                required
                minLength={3}
                placeholder="e.g. Complete operational excellence training"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isPushing}
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-slate-700 font-medium">Thrust Area</Label>
              <Input
                required
                placeholder="e.g. Capability Building"
                value={thrustArea}
                onChange={(e) => setThrustArea(e.target.value)}
                disabled={isPushing}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label className="text-slate-700 font-medium">UoM Type</Label>
              <Select value={uomType} onValueChange={(val) => {
                setUomType(val);
                if (val === "timeline" || val === "zero_based") {
                  setGoalType("min");
                }
              }} disabled={isPushing}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="numeric">Numeric</SelectItem>
                  <SelectItem value="percentage">%</SelectItem>
                  <SelectItem value="timeline">Timeline</SelectItem>
                  <SelectItem value="zero_based">Zero-based</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(uomType !== "timeline" && uomType !== "zero_based") && (
              <div className="grid gap-2">
                <Label className="text-slate-700 font-medium">Goal Type</Label>
                <Select value={goalType} onValueChange={setGoalType} disabled={isPushing}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="max">Max</SelectItem>
                    <SelectItem value="min">Min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label className="text-slate-700 font-medium">Target</Label>
              <Input
                type={uomType === "timeline" ? "date" : "text"}
                placeholder={uomType === "percentage" ? "100%" : uomType === "timeline" ? "" : "e.g. 10 incidents"}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                required
                disabled={isPushing}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-slate-700 font-medium">Default Weightage (%)</Label>
              <Input
                type="number"
                min={10}
                max={100}
                value={weightage}
                onChange={(e) => setWeightage(Number(e.target.value))}
                required
                disabled={isPushing}
              />
            </div>
          </div>

          {formError && (
            <p className="text-sm font-medium text-destructive">{formError}</p>
          )}
        </div>

        {/* Employee selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-slate-900 font-semibold">Select Direct Reports</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-medium hover:bg-slate-100"
                onClick={() => setSelectedUserIds(pendingOwners)}
                disabled={isPushing || !pendingOwners.length}
              >
                Select All Ready
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-medium hover:bg-slate-100"
                onClick={() => setSelectedUserIds([])}
                disabled={isPushing}
              >
                Clear Selection
              </Button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {teamMembers.map((user) => {
              const alreadyHasAnyShared = goals.some(
                (goal) =>
                  goal.ownerId === user.id &&
                  goal.sharedGoalGroupId != null &&
                  goal.title.toLowerCase() === title.toLowerCase().trim() &&
                  title.trim().length >= 3
              );
              const isSelected = selectedUserIds.includes(user.id);

              return (
                <div
                  key={user.id}
                  onClick={() => {
                    if (alreadyHasAnyShared || isPushing) return;
                    setSelectedUserIds((prev) =>
                      prev.includes(user.id)
                        ? prev.filter((id) => id !== user.id)
                        : [...prev, user.id]
                    );
                  }}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm transition-all flex flex-col justify-between min-h-[72px]",
                    alreadyHasAnyShared
                      ? "bg-slate-50 border-slate-200/50 opacity-60 cursor-not-allowed"
                      : isPushing
                      ? "opacity-80 cursor-not-allowed"
                      : isSelected
                      ? "border-primary bg-primary/5 shadow-[0_0_10px_rgba(59,130,246,0.1)] cursor-pointer"
                      : "bg-white hover:bg-slate-50 border-slate-200 cursor-pointer"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">{user.name}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        alreadyHasAnyShared
                          ? "bg-emerald-50 text-emerald-700"
                          : isSelected
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {alreadyHasAnyShared ? "Assigned" : isSelected ? "Selected" : "Ready"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{user.department ?? "Team member"}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            disabled={isPushing || !selectedUserIds.length}
            onClick={handlePush}
            className="w-full sm:w-auto font-medium"
          >
            {isPushing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Push shared goal to {selectedUserIds.length} recipient{selectedUserIds.length === 1 ? "" : "s"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminDashboard({
  goals,
  users,
  reviews,
  setGoals,
  notify
}: {
  goals: Goal[];
  users: User[];
  reviews: ManagerReview[];
  setGoals: (goals: Goal[]) => void;
  notify: (title: string, description: string) => void;
}) {
  async function unlock(goalId: string) {
    try {
      const unlockedGoal = await unlockGoal(goalId);
      setGoals(goals.map((goal) => (goal.id === unlockedGoal.id ? unlockedGoal : goal)));
      notify("Goal unlocked", "The employee can edit and resubmit this goal.");
    } catch (error) {
      notify("Unlock failed", error instanceof Error ? error.message : "Please try again.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All goals and users</CardTitle>
        <p className="text-sm text-muted-foreground">Administrative view for Phase 1 governance and exception handling.</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-3 pr-4">User</th>
                <th className="py-3 pr-4">Department</th>
                <th className="py-3 pr-4">Goal</th>
                <th className="py-3 pr-4">Weight</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Locked</th>
                <th className="py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {goals.map((goal) => {
                const owner = users.find((user) => user.id === goal.ownerId);
                const latestReview = reviews
                  .filter((review) => review.goalId === goal.id)
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
                return (
                  <tr key={goal.id}>
                    <td className="py-4 pr-4 font-medium">{owner?.name}</td>
                    <td className="py-4 pr-4 text-muted-foreground">{owner?.department}</td>
                    <td className="py-4 pr-4">
                      <p>{goal.title}</p>
                      {latestReview?.comment ? (
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{latestReview.comment}</p>
                      ) : null}
                    </td>
                    <td className="py-4 pr-4">{goal.weightage}%</td>
                    <td className="py-4 pr-4"><StatusBadge status={goal.status} /></td>
                    <td className="py-4 pr-4">{goal.locked ? "Yes" : "No"}</td>
                    <td className="py-4 text-right">
                      <Button size="sm" variant="outline" disabled={!goal.locked} onClick={() => unlock(goal.id)}>
                        Unlock
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyPanel({ icon: Icon, title, text }: { icon: typeof Users; title: string; text: string }) {
  return (
    <Card>
      <CardContent className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
        <Icon className="mb-3 h-9 w-9 text-muted-foreground" />
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
