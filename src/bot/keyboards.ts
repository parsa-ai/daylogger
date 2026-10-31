import { InlineKeyboard } from "grammy";
import type { RecurringTask } from "@/generated/prisma/client";
import { cb } from "./callbackData";
import { fa } from "./format";

// Colors use Telegram's button styles: success = green, danger = red,
// primary = blue (clients without support show the default style).

const MAX_LABEL = 40;

function label(task: RecurringTask): string {
  const title = task.title.length > MAX_LABEL ? `${task.title.slice(0, MAX_LABEL - 1)}…` : task.title;
  return `${task.isActive ? "🟢" : "⏸"} ${fa(task.reminderTime)} · ${title}`;
}

export function taskListKeyboard(ownerId: number, tasks: RecurringTask[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const task of tasks) kb.text(label(task), cb.task("open", task.id)).row();
  return kb.text("➕ کار جدید", cb.list("add", ownerId)).success();
}

export function taskDetailKeyboard(ownerId: number, task: RecurringTask): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text("✏️ تغییر اسم", cb.task("title", task.id))
    .text("⏰ تغییر ساعت", cb.task("time", task.id))
    .row();
  if (task.isActive) kb.text("⏸ توقف", cb.task("toggle", task.id));
  else kb.text("▶️ فعال‌سازی", cb.task("toggle", task.id)).success();
  return kb
    .text("🗑 حذف", cb.task("del", task.id))
    .danger()
    .row()
    .text("↩️ برگشت به لیست", cb.list("list", ownerId))
    .primary();
}

export function confirmDeleteKeyboard(task: RecurringTask): InlineKeyboard {
  return new InlineKeyboard()
    .text("🗑 آره، حذف کن", cb.task("delok", task.id))
    .danger()
    .text("نه، بی‌خیال", cb.task("open", task.id));
}

export function reminderKeyboard(dailyTaskId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ انجام دادم", cb.daily("done", dailyTaskId))
    .success()
    .text("⏳ هنوز نه", cb.daily("later", dailyTaskId));
}

/** After "Not yet" or finalization: completing is still possible today. */
export function completeOnlyKeyboard(dailyTaskId: string): InlineKeyboard {
  return new InlineKeyboard().text("✅ انجام دادم", cb.daily("done", dailyTaskId)).success();
}

export function oneTimeChoiceKeyboard(dailyTaskId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("⏱ ۳۰ دقیقه دیگه", cb.oneTime("in30", dailyTaskId))
    .primary()
    .text("⏰ یک ساعت دیگه", cb.oneTime("in60", dailyTaskId))
    .primary()
    .row()
    .text("🕰 ساعت دلخواه", cb.oneTime("at", dailyTaskId))
    .text("🔕 بدون یادآوری", cb.oneTime("none", dailyTaskId));
}

export function backToListKeyboard(ownerId: number): InlineKeyboard {
  return new InlineKeyboard().text("🗂 کارهای من", cb.list("list", ownerId)).primary();
}
