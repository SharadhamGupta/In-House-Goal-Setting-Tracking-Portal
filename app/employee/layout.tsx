import { requireProfile } from "@/lib/auth";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  await requireProfile("employee");
  return children;
}
