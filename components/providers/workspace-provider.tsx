"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { loadWorkspace, markNotificationsRead } from "@/lib/services/workspace-api-client";
import type { AchievementUpdate, AuthProfile, EscalationItem, Goal, GoalCycle, ManagerReview, NotificationItem, Role, User } from "@/lib/domain/types";

interface WorkspaceContextType {
  role: Role;
  setRole: (role: Role) => void;
  users: User[];
  goals: Goal[];
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
  reviews: ManagerReview[];
  setReviews: React.Dispatch<React.SetStateAction<ManagerReview[]>>;
  achievements: AchievementUpdate[];
  setAchievements: React.Dispatch<React.SetStateAction<AchievementUpdate[]>>;
  notifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  escalations: EscalationItem[];
  setEscalations: React.Dispatch<React.SetStateAction<EscalationItem[]>>;
  loaded: boolean;
  startupError: string | null;
  refreshNotifications: () => Promise<void>;
  markRead: (notificationIds: string[]) => Promise<void>;
  currentUser?: User;
  employee?: User;
  activeCycle: GoalCycle | null;
  goalCycles: GoalCycle[];
  setGoalCycles: React.Dispatch<React.SetStateAction<GoalCycle[]>>;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children, initialRole = "employee", profile }: { children: ReactNode; initialRole?: Role; profile?: AuthProfile }) {
  const [role, setRole] = useState<Role>(initialRole);
  const [users, setUsers] = useState<User[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reviews, setReviews] = useState<ManagerReview[]>([]);
  const [achievements, setAchievements] = useState<AchievementUpdate[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [escalations, setEscalations] = useState<EscalationItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [activeCycle, setActiveCycle] = useState<GoalCycle | null>(null);
  const [goalCycles, setGoalCycles] = useState<GoalCycle[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadDatabaseWorkspace() {
      try {
        const workspace = await loadWorkspace();
        if (!isMounted) return;
        setGoals(workspace.goals);
        setReviews(workspace.reviews);
        setAchievements(workspace.achievements);
        setUsers(workspace.users);
        setNotifications(workspace.notifications);
        setEscalations(workspace.escalations);
        setActiveCycle(workspace.activeCycle ?? null);
        setGoalCycles(workspace.goalCycles ?? []);
      } catch (error) {
        if (!isMounted) return;
        setGoals([]);
        setUsers([]);
        setReviews([]);
        setAchievements([]);
        setNotifications([]);
        setEscalations([]);
        setActiveCycle(null);
        setGoalCycles([]);
        setStartupError(error instanceof Error ? error.message : "Unable to load workspace data.");
      } finally {
        if (isMounted) setLoaded(true);
      }
    }
    loadDatabaseWorkspace();
    return () => { isMounted = false; };
  }, []);

  const refreshNotifications = useCallback(async () => {
    const workspace = await loadWorkspace();
    setNotifications(workspace.notifications);
    setActiveCycle(workspace.activeCycle ?? null);
    setGoalCycles(workspace.goalCycles ?? []);
  }, []);

  const markRead = useCallback(async (notificationIds: string[]) => {
    const updatedNotifications = await markNotificationsRead(notificationIds);
    const updatedById = new Map(updatedNotifications.map((notification) => [notification.id, notification]));
    setNotifications((current) => current.map((notification) => updatedById.get(notification.id) ?? notification));
  }, []);

  const currentUser = profile ?? users.find((user) => user.role === role);
  const employee = role === "employee" ? currentUser : users.find((user) => user.role === "employee");

  return (
    <WorkspaceContext.Provider
      value={{
        role,
        setRole,
        users,
        goals,
        setGoals,
        reviews,
        setReviews,
        achievements,
        setAchievements,
        notifications,
        setNotifications,
        escalations,
        setEscalations,
        loaded,
        startupError,
        refreshNotifications,
        markRead,
        currentUser,
        employee,
        activeCycle,
        goalCycles,
        setGoalCycles,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
