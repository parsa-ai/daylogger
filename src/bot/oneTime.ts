import type { Context } from "grammy";
import type { Message } from "grammy/types";
import {
  createOneTimeTask,
  resolveReminder,
  setOneTimeReminder,
  type ReminderChoice,
  type ResolvedReminder,
} from "@/core/oneTime";
import { findDailyTask } from "@/core/tasks";
import type { DailyTask, User } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { env, scheduleConfig } from "@/lib/env";
import { parseCallbackData } from "./callbackData";
import { editCallbackMessage } from "./edit";
import { completeOnlyKeyboard, oneTimeChoiceKeyboard } from "./keyboards";
import { messages } from "./messages";

/** Create today's one-time task and ask when to remind (shared by `/add <title>` and the title prompt). */
export async function addOneTimeTask(ctx: Context, user: User, title: string, replyTo?: Message) {
  const reply = (text: string, extra: Parameters<Context["reply"]>[1] = {}) =>
    ctx.reply(text, {
      parse_mode: "HTML",
      ...(replyTo && { reply_parameters: { message_id: replyTo.message_id } }),
      ...extra,
    });

  const result = await createOneTimeTask(db(), user.id, title, new Date(), scheduleConfig());
  if (!result.ok) {
    await reply(result.reason === "afterReport" ? messages.oneTimeAfterReport : messages.oneTimeLimit);
    return;
  }
  await reply(messages.oneTimeAdded(title), { reply_markup: oneTimeChoiceKeyboard(result.task.id) });
}

/** Error text for a rejected reminder time. */
export function reminderError(result: Extract<ResolvedReminder, { ok: false }>): string {
  return result.reason === "past" ? messages.timeInPast : messages.timeAfterCutoff(env().REMINDER_CUTOFF);
}

/** The confirmation shown once a one-time task's reminder is chosen. */
export function scheduledText(task: Pick<DailyTask, "title">, reminderTime: string | null): string {
  return reminderTime ? messages.oneTimeScheduled(task.title, reminderTime) : messages.oneTimeNoReminder(task.title);
}

const choices: Record<string, ReminderChoice> = {
  in30: { kind: "in", minutes: 30 },
  in60: { kind: "in", minutes: 60 },
  none: { kind: "none" },
};

/** Router for one-time reminder choices (`ot:*`). Only the task owner can choose. */
export async function oneTimeCallback(ctx: Context) {
  const toast = await route(ctx);
  await ctx.answerCallbackQuery(toast ?? undefined);
}

async function route(ctx: Context): Promise<string | void> {
  const from = ctx.from;
  const data = parseCallbackData(ctx.callbackQuery?.data ?? "");
  if (!from || data?.scope !== "oneTime") return;

  const task = await findDailyTask(db(), data.taskId);
  if (!task) return messages.toastTaskClosed;
  if (task.user.telegramUserId !== BigInt(from.id)) return messages.notTaskOwner(task.user.displayName);

  const choice = choices[data.action];
  if (!choice) return; // "at" is added with the specific-time flow

  const resolved = resolveReminder(choice, new Date(), scheduleConfig());
  if (!resolved.ok) return reminderError(resolved);
  if (!(await setOneTimeReminder(db(), task, resolved))) return messages.toastReminderAlreadySet;

  await editCallbackMessage(ctx, scheduledText(task, resolved.reminderTime), completeOnlyKeyboard(task.id));
}
