import type { GoalCycle } from "@/lib/domain/types";

export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

export function getOpenQuarter(cycle: GoalCycle | null): Quarter | null {
  if (!cycle) return null;
  const now = new Date();
  const windows: [Quarter, string, string][] = [
    ["Q1", cycle.q1OpensAt, cycle.q1ClosesAt],
    ["Q2", cycle.q2OpensAt, cycle.q2ClosesAt],
    ["Q3", cycle.q3OpensAt, cycle.q3ClosesAt],
    ["Q4", cycle.q4OpensAt, cycle.q4ClosesAt]
  ];
  for (const [q, opens, closes] of windows) {
    if (now >= new Date(opens) && now <= new Date(closes)) return q;
  }
  return null;
}

export function isQuarterOpen(cycle: GoalCycle | null, quarter: Quarter): boolean {
  if (!cycle) return true; // safe dev fallback
  const map: Record<Quarter, [string, string]> = {
    Q1: [cycle.q1OpensAt, cycle.q1ClosesAt],
    Q2: [cycle.q2OpensAt, cycle.q2ClosesAt],
    Q3: [cycle.q3OpensAt, cycle.q3ClosesAt],
    Q4: [cycle.q4OpensAt, cycle.q4ClosesAt]
  };
  const [opens, closes] = map[quarter];
  const now = new Date();
  return now >= new Date(opens) && now <= new Date(closes);
}
