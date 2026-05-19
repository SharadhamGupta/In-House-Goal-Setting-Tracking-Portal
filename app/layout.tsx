import type { Metadata } from "next";
import { ClientRoot } from "@/components/layout/client-root";
import "./globals.css";

export const metadata: Metadata = {
  title: "AtomBerg GoalHub",
  description: "Enterprise goal setting and tracking portal"
};

import { getCurrentProfile } from "@/lib/auth";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  return (
    <html lang="en">
      <body>
        <ClientRoot profile={profile ?? undefined}>{children}</ClientRoot>
      </body>
    </html>
  );
}
