import type { Context } from "grammy";
import { MAX_REMINDERS } from "@/core/reminders";
import { completeTask, findDailyTask } from "@/core/tasks";
import { localDate, localTime } from "@/core/time";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { parseCallbackData } from "./callbackData";
import { editCallbackMessage } from "./edit";
import { mention } from "./format";
import { completeOnlyKeyboard } from "./keyboards";
import { messages } from "./messages";

/** Router for reminder buttons (`dt:*`). Only the task owner can answer. */
export async function reminderCallback(ctx: Context) {
  const toast = await route(ctx);
  await ctx.answerCallbackQuery(toast ?? undefined);
}

async function route(ctx: Context): Promise<string | void> {
  const from = ctx.from;
  const data = parseCallbackData(ctx.callbackQuery?.data ?? "");
  if (!from || data?.scope !== "daily") return;

  const task = await findDailyTask(db(), data.taskId);
  if (!task) return messages.toastTaskClosed;
  if (task.user.telegramUserId !== BigInt(from.id)) return messages.notTaskOwner(task.user.displayName);

  const { GROUP_TIMEZONE: timeZone } = env();
  const now = new Date();
  const who = mention(task.user.telegramUserId, task.user.displayName);

  if (data.action === "done") {
    const result = await completeTask(db(), task, now, localDate(now, timeZone));
    if (result === "already") return messages.toastAlreadyCompleted;
    if (result === "closed") return messages.toastTaskClosed;

    await editCallbackMessage(ctx, messages.reminderCompleted(who, task.title, localTime(now, timeZone)));
    // A newer reminder may still show buttons; clear them too.
    const clickedId = ctx.callbackQuery?.message?.message_id;
    if (ctx.chat && task.reminderMessageId !== null && task.reminderMessageId !== clickedId) {
      await ctx.api.editMessageReplyMarkup(ctx.chat.id, task.reminderMessageId).catch(() => {});
    }
    return messages.toastCompleted;
  }

  // "Not yet": nothing to write — the next reminder is already scheduled and
  // the count only grows when one is sent. Keep a Completed button.
  if (task.status === "COMPLETED") return messages.toastAlreadyCompleted;
  if (task.status !== "PENDING") return messages.toastTaskClosed;
  const moreToCome = task.nextReminderAt !== null && task.reminderCount < MAX_REMINDERS;
  const nextAt = moreToCome ? localTime(task.nextReminderAt!, timeZone) : null;
  await editCallbackMessage(ctx, messages.reminderNotYet(who, task.title, nextAt), completeOnlyKeyboard(task.id));
  return messages.toastNotYet;
}
