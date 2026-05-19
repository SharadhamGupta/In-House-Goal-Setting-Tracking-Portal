"use client";

import { usePathname } from "next/navigation";
import { WorkspaceProvider } from "@/components/providers/workspace-provider";
import { AppLayout } from "@/components/layout/app-layout";

import type { AuthProfile } from "@/lib/domain/types";

export function ClientRoot({ children, profile }: { children: React.ReactNode; profile?: AuthProfile }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/";
  
  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <WorkspaceProvider initialRole={profile?.role ?? "employee"} profile={profile}>
      <AppLayout>{children}</AppLayout>
    </WorkspaceProvider>
  );
}
