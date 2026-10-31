import type { DailyTask, PrismaClient, TaskStatus, User } from "@/generated/prisma/client";
import { toDbDate } from "./time";

type Db = Pick<PrismaClient, "user" | "dailyTask">;

export interface MemberReport {
  name: string;
  tasks: { title: string; status: TaskStatus }[];
  completed: number;
  /** Tasks that count towards progress (everything except CANCELLED). */
  total: number;
}

export interface ReportData {
  date: string;
  members: MemberReport[];
  completed: number;
  total: number;
}

/** Whole-number percentage; null when there is nothing to measure (shown as an empty state, not 0%). */
export function percent(completed: number, total: number): number | null {
  return total === 0 ? null : Math.round((completed / total) * 100);
}

/**
 * Group tasks per member. Every active member appears (with an empty task list
 * if they have none); inactive members appear only if they had tasks that day.
 */
export function buildReportData(
  date: string,
  users: Pick<User, "id" | "displayName" | "isActive">[],
  tasks: Pick<DailyTask, "userId" | "title" | "status" | "reminderTime" | "createdAt">[],
): ReportData {
  const byUser = new Map<string, typeof tasks>();
  for (const task of tasks) byUser.set(task.userId, [...(byUser.get(task.userId) ?? []), task]);

  const members = users
    .filter((u) => u.isActive || byUser.has(u.id))
    .map((u): MemberReport => {
      const own = [...(byUser.get(u.id) ?? [])].sort(
        (a, b) =>
          (a.reminderTime ?? "99:99").localeCompare(b.reminderTime ?? "99:99") ||
          a.createdAt.getTime() - b.createdAt.getTime(),
      );
      const counted = own.filter((t) => t.status !== "CANCELLED");
      return {
        name: u.displayName,
        tasks: own.map((t) => ({ title: t.title, status: t.status })),
        completed: counted.filter((t) => t.status === "COMPLETED").length,
        total: counted.length,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    date,
    members,
    completed: members.reduce((sum, m) => sum + m.completed, 0),
    total: members.reduce((sum, m) => sum + m.total, 0),
  };
}

export async function loadReport(db: Db, date: string): Promise<ReportData> {
  const [users, tasks] = await Promise.all([
    db.user.findMany({ select: { id: true, displayName: true, isActive: true } }),
    db.dailyTask.findMany({
      where: { date: toDbDate(date) },
      select: { userId: true, title: true, status: true, reminderTime: true, createdAt: true },
    }),
  ]);
  return buildReportData(date, users, tasks);
}
