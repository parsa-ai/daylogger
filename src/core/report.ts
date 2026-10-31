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

/** Sends a finished report to the group; returns the first message id. */
export interface ReportSender {
  sendReport(data: ReportData): Promise<number>;
}

/**
 * Publish the final report for `date` at most once. The DailyReport row is
 * inserted *before* sending (primary key on date), so racing ticks can't both
 * send. If sending fails the row is removed so the next tick retries.
 * Returns whether this call published it.
 */
export async function publishReportOnce(
  db: Pick<PrismaClient, "user" | "dailyTask" | "dailyReport">,
  sender: ReportSender,
  date: string,
): Promise<boolean> {
  const key = toDbDate(date);
  const { count } = await db.dailyReport.createMany({ data: [{ date: key }], skipDuplicates: true });
  if (count !== 1) return false;

  let messageId: number;
  try {
    messageId = await sender.sendReport(await loadReport(db, date));
  } catch (error) {
    console.error("Failed to publish report", date, error);
    await db.dailyReport.deleteMany({ where: { date: key, messageId: null } });
    return false;
  }
  // Sent: keep the row even if recording the id fails, so it's never sent twice.
  await db.dailyReport.update({ where: { date: key }, data: { messageId } }).catch((error: unknown) => {
    console.error("Failed to record report message id", date, error);
  });
  return true;
}

/** A day that had tasks but never got its report (e.g. the evening ticks were missed). */
export async function hasMissedReport(db: Pick<PrismaClient, "dailyTask" | "dailyReport">, date: string) {
  const key = toDbDate(date);
  const report = await db.dailyReport.findUnique({ where: { date: key }, select: { date: true } });
  if (report) return false;
  return (await db.dailyTask.count({ where: { date: key } })) > 0;
}
