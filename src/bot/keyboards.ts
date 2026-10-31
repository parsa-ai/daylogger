import { InlineKeyboard } from "grammy";
import type { RecurringTask } from "@/generated/prisma/client";
import { cb } from "./callbackData";

const MAX_LABEL = 40;

function label(task: RecurringTask): string {
  const title = task.title.length > MAX_LABEL ? `${task.title.slice(0, MAX_LABEL - 1)}…` : task.title;
  return `${task.isActive ? "" : "⏸ "}${task.reminderTime} · ${title}`;
}

export function taskListKeyboard(ownerId: number, tasks: RecurringTask[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const task of tasks) kb.text(label(task), cb.task("open", task.id)).row();
  return kb.text("➕ Add task", cb.list("add", ownerId));
}

export function taskDetailKeyboard(ownerId: number, task: RecurringTask): InlineKeyboard {
  return new InlineKeyboard()
    .text("✏️ Edit title", cb.task("title", task.id))
    .text("🕒 Change time", cb.task("time", task.id))
    .row()
    .text(task.isActive ? "⏸ Deactivate" : "▶️ Activate", cb.task("toggle", task.id))
    .text("🗑 Delete", cb.task("del", task.id))
    .row()
    .text("⬅️ Back", cb.list("list", ownerId));
}

export function confirmDeleteKeyboard(task: RecurringTask): InlineKeyboard {
  return new InlineKeyboard()
    .text("🗑 Yes, delete", cb.task("delok", task.id))
    .text("Cancel", cb.task("open", task.id));
}

export function reminderKeyboard(dailyTaskId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Completed", cb.daily("done", dailyTaskId))
    .text("⏳ Not yet", cb.daily("later", dailyTaskId));
}

/** After "Not yet" or finalization: completing is still possible today. */
export function completeOnlyKeyboard(dailyTaskId: string): InlineKeyboard {
  return new InlineKeyboard().text("✅ Completed", cb.daily("done", dailyTaskId));
}

export function oneTimeChoiceKeyboard(dailyTaskId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("In 30 min", cb.oneTime("in30", dailyTaskId))
    .text("In 1 hour", cb.oneTime("in60", dailyTaskId))
    .row()
    .text("At a specific time", cb.oneTime("at", dailyTaskId))
    .text("No reminder", cb.oneTime("none", dailyTaskId));
}

export function backToListKeyboard(ownerId: number): InlineKeyboard {
  return new InlineKeyboard().text("📋 My tasks", cb.list("list", ownerId));
}
