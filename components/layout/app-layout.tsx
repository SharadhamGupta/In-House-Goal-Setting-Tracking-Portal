"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/login/actions";
import { NotificationMenu } from "@/components/notifications/notification-menu";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { cn } from "@/lib/utils";
import { Role } from "@/lib/domain/types";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Goals", href: "/goals", icon: ClipboardList },
  { label: "Reviews", href: "/reviews", icon: CheckCircle2 },
  { label: "Tracking", href: "/tracking", icon: Users },
  { label: "Governance", href: "/governance", icon: ShieldCheck },
  { label: "Escalations", href: "/escalations", icon: AlertCircle }
];

const roleCopy: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Overview of workspace activity." },
  "/goals": { title: "My Goals", subtitle: "Draft, validate, and submit measurable goals for approval." },
  "/reviews": { title: "Team Review Queue", subtitle: "Monitor submitted plans, tune targets, and complete approvals." },
  "/tracking": { title: "Tracking", subtitle: "Quarterly check-ins and achievement tracking." },
  "/governance": { title: "Governance Console", subtitle: "View goal health across users and unlock approved goals when needed." },
  "/escalations": { title: "Escalations", subtitle: "Monitor compliance and resolve automated escalation alerts." }
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const { currentUser, role, notifications, markRead } = useWorkspace();
  const filteredNavItems = navItems.filter(item => !["/governance", "/escalations"].includes(item.href) || role === "admin");

  const currentPathCopy = roleCopy[pathname] || { title: "AtomBerg GoalHub", subtitle: "" };
  const userDisplayName = currentUser ? `${currentUser.name} - ${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}` : "Vikram Singh - Manager";

  return (
    <div className="min-h-screen bg-slate-50/50 flex">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-white shadow-[2px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300 ease-out lg:flex",
          sidebarCollapsed ? "w-20" : "w-72"
        )}
      >
        <div className={cn("flex items-center pt-8 pb-6 px-6", sidebarCollapsed ? "justify-center px-0" : "justify-between")}>
          <div className={cn("flex items-center gap-3", sidebarCollapsed && "flex-col gap-4")}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="font-bold text-slate-900 tracking-tight text-lg">GoalHub</p>
                <p className="text-xs font-medium text-blue-600">AtomBerg</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto mt-4">
          {filteredNavItems.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 group",
                  sidebarCollapsed ? "justify-center px-0" : "",
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold shadow-sm"
                    : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-900 font-medium"
                )}
                title={sidebarCollapsed ? label : undefined}
              >
                <Icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                {!sidebarCollapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto">
          <Button
            type="button"
            variant="ghost"
            className={cn("w-full text-slate-400 hover:text-slate-600 hover:bg-slate-100", sidebarCollapsed ? "px-0 justify-center" : "justify-start gap-3")}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!sidebarCollapsed && <span>Collapse Sidebar</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900 tracking-tight text-lg">GoalHub</p>
              <p className="text-xs font-medium text-blue-600">AtomBerg</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5 text-slate-500" />
          </Button>
        </div>
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto mt-2">
          {filteredNavItems.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3.5 transition-colors font-medium",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "text-blue-600" : "text-slate-400")} />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className={cn("flex-1 min-w-0 flex flex-col transition-all duration-300 ease-out", sidebarCollapsed ? "lg:pl-20" : "lg:pl-72")}>
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5 text-slate-600" />
              </Button>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{currentPathCopy.title}</h1>
                {currentPathCopy.subtitle && <p className="text-sm font-medium text-slate-500">{currentPathCopy.subtitle}</p>}
              </div>
            </div>

            <div className="flex items-center gap-4 sm:gap-6">
              <NotificationMenu notifications={notifications} onMarkRead={markRead} />

              <div className="hidden sm:flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  {userDisplayName.charAt(0)}
                </div>
                <span className="text-sm font-semibold text-slate-700">{userDisplayName}</span>
              </div>

              <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>

              <form action={logoutAction}>
                <Button type="submit" variant="ghost" className="text-slate-500 hover:text-red-600 hover:bg-red-50 gap-2 font-medium transition-colors">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </form>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
