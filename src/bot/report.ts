import { format, parseISO } from "date-fns";
import { percent, type MemberReport, type ReportData } from "@/core/report";
import type { TaskStatus } from "@/generated/prisma/client";
import { escapeHtml } from "./format";

/** Telegram allows 4096 characters per message; keep a margin. */
export const MESSAGE_LIMIT = 4000;

const statusLabel: Record<TaskStatus, string> = {
  COMPLETED: "✅ Completed",
  INCOMPLETE: "❌ Incomplete",
  PENDING: "⏳ Pending",
  CANCELLED: "🚫 Cancelled",
};

function memberBlock(m: MemberReport): string {
  const head = `<b>${escapeHtml(m.name)}</b>`;
  if (m.tasks.length === 0) return `${head}\nNo tasks today.`;
  const lines = m.tasks.map((t) => `• ${escapeHtml(t.title)}: ${statusLabel[t.status]}`);
  const pct = percent(m.completed, m.total);
  const progress = pct === null ? "No active tasks." : `Progress: ${m.completed}/${m.total} — ${pct}%`;
  return [head, ...lines, progress].join("\n");
}

function groupBlock(data: ReportData): string {
  const pct = percent(data.completed, data.total);
  if (pct === null) return "<b>Group progress</b>\nNo tasks today.";
  return (
    `<b>Group progress</b>\n` +
    `${data.completed} completed task${data.completed === 1 ? "" : "s"} out of ${data.total} total task${data.total === 1 ? "" : "s"}.\n` +
    `${pct}% completion.`
  );
}

/**
 * The report as one or more HTML messages. `final` is the 22:00 report;
 * otherwise it's the `/report` snapshot of the day so far.
 */
export function formatReport(data: ReportData, kind: "final" | "snapshot"): string[] {
  const day = format(parseISO(data.date), "EEE d MMM");
  const title = kind === "final" ? "Daily Group Report" : "Today so far";
  const blocks = [
    `📊 <b>${title}</b> — ${day}`,
    ...(data.members.length === 0 ? ["No members yet. Send /start to join."] : data.members.map(memberBlock)),
    groupBlock(data),
  ];
  return chunk(blocks, MESSAGE_LIMIT);
}

/** Pack blocks (separated by blank lines) into messages; oversized blocks are split by line. */
export function chunk(blocks: string[], limit: number): string[] {
  const pieces = blocks.flatMap((b) => (b.length <= limit ? [b] : b.split("\n")));
  const messages: string[] = [];
  let current = "";
  for (const piece of pieces) {
    const next = current ? `${current}\n\n${piece}` : piece;
    if (next.length <= limit) {
      current = next;
      continue;
    }
    if (current) messages.push(current);
    current = piece.slice(0, limit);
  }
  if (current) messages.push(current);
  return messages;
}
