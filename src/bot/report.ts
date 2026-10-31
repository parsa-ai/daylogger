import { percent, type MemberReport, type ReportData } from "@/core/report";
import type { TaskStatus } from "@/generated/prisma/client";
import { escapeHtml, fa, persianDate, progressBar } from "./format";

/** Telegram allows 4096 characters per message; keep a margin. */
export const MESSAGE_LIMIT = 4000;

const statusLabel: Record<TaskStatus, string> = {
  COMPLETED: "✅ انجام شد",
  INCOMPLETE: "❌ انجام نشد",
  PENDING: "⏳ در انتظار",
  CANCELLED: "🚫 لغو شد",
};

function memberBlock(m: MemberReport): string {
  const head = `👤 <b>${escapeHtml(m.name)}</b>`;
  if (m.tasks.length === 0) return `${head}\n🍃 امروز کاری نداشت.`;
  const lines = m.tasks.map((t) => `• ${escapeHtml(t.title)} — ${statusLabel[t.status]}`);
  const pct = percent(m.completed, m.total);
  const progress =
    pct === null
      ? "کار فعالی نداشت."
      : `${progressBar(pct)}\n📈 پیشرفت: ${fa(m.completed)} از ${fa(m.total)} — ${fa(pct)}٪`;
  return [head, ...lines, progress].join("\n");
}

function cheer(pct: number): string {
  if (pct >= 80) return "🎉 عالی بودید! همین‌طور ادامه بدید.";
  if (pct >= 50) return "💪 خوب بود؛ فردا بهتر!";
  return "🌱 فردا یه روز تازه‌ست!";
}

function groupBlock(data: ReportData, kind: "final" | "snapshot"): string {
  const head = "🌟 <b>پیشرفت گروه</b>";
  const pct = percent(data.completed, data.total);
  if (pct === null) return `${head}\n🍃 امروز کاری ثبت نشده.`;
  const lines = [
    head,
    `${fa(data.completed)} کار از ${fa(data.total)} کار انجام شد.`,
    `${progressBar(pct)}  ${fa(pct)}٪`,
  ];
  if (kind === "final") lines.push("", cheer(pct));
  return lines.join("\n");
}

/**
 * The report as one or more HTML messages. `final` is the evening report;
 * otherwise it's the `/report` snapshot of the day so far.
 */
export function formatReport(data: ReportData, kind: "final" | "snapshot"): string[] {
  const title = kind === "final" ? "گزارش روزانه‌ی گروه" : "وضعیت امروز تا این لحظه";
  const blocks = [
    `📊 <b>${title}</b>\n🗓 ${persianDate(data.date)}`,
    ...(data.members.length === 0
      ? ["هنوز کسی عضو نشده؛ با /start شروع کنید 🌱"]
      : data.members.map(memberBlock)),
    groupBlock(data, kind),
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
