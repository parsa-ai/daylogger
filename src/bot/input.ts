import type { Context, NextFunction } from "grammy";
import { clearPendingAction, parsePendingAction } from "@/core/pending";
import {
  createRecurringTask,
  findRecurringTask,
  renameRecurringTask,
  rescheduleRecurringTask,
} from "@/core/recurring";
import { findUser } from "@/core/users";
import { isTimeAfter } from "@/core/time";
import { parseTime, parseTitle } from "@/core/validation";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { backToListKeyboard } from "./keyboards";
import { messages } from "./messages";
import { addOneTimeTask } from "./oneTime";
import { promptForInput } from "./prompt";

/** A reminder time for a recurring task, or the error to show. */
function parseTaskTime(text: string): { ok: true; time: string } | { ok: false; error: string } {
  const time = parseTime(text);
  if (!time) return { ok: false, error: messages.invalidTime };
  const cutoff = env().REMINDER_CUTOFF;
  if (isTimeAfter(time, cutoff)) return { ok: false, error: messages.timeAfterCutoff(cutoff) };
  return { ok: true, time };
}

/** Handles a text reply to the user's latest prompt; anything else passes through. */
export async function pendingInputHandler(ctx: Context, next: NextFunction) {
  const message = ctx.message;
  const replyTo = message?.reply_to_message;
  if (!message?.text || !ctx.from || !replyTo || replyTo.from?.id !== ctx.me.id) return next();
  if (message.text.startsWith("/")) return next();

  const user = await findUser(db(), ctx.from.id);
  const action = parsePendingAction(user?.pendingAction);
  if (!user || !action || action.promptMessageId !== replyTo.message_id) return next();

  const text = message.text;
  const reply = (html: string, extra: Parameters<Context["reply"]>[1] = {}) =>
    ctx.reply(html, { parse_mode: "HTML", reply_parameters: { message_id: message.message_id }, ...extra });

  if (text.trim().toLowerCase() === "cancel") {
    await clearPendingAction(db(), user.id);
    await reply(messages.inputCancelled);
    return;
  }

  switch (action.kind) {
    case "addOneTimeTitle": {
      const title = parseTitle(text);
      if (!title.ok) {
        return promptForInput(ctx, user, action, (who) => `${title.error}\n${messages.askOneTimeTitle(who)}`, message);
      }
      await clearPendingAction(db(), user.id);
      return addOneTimeTask(ctx, user, title.title, message);
    }

    case "addRecurringTitle": {
      const title = parseTitle(text);
      if (!title.ok) {
        return promptForInput(ctx, user, action, (who) => `${title.error}\n${messages.askTitle(who)}`, message);
      }
      return promptForInput(
        ctx,
        user,
        { kind: "addRecurringTime", title: title.title },
        (who) => messages.askTime(who, title.title),
        message,
      );
    }

    case "addRecurringTime": {
      const parsed = parseTaskTime(text);
      if (!parsed.ok) {
        return promptForInput(
          ctx,
          user,
          action,
          (who) => `${parsed.error}\n${messages.askTime(who, action.title)}`,
          message,
        );
      }
      const { time } = parsed;
      const result = await createRecurringTask(db(), user.id, action.title, time);
      await clearPendingAction(db(), user.id);
      if (!result.ok) {
        await reply(messages.taskLimit);
        return;
      }
      await reply(messages.taskAdded(action.title, time), {
        reply_markup: backToListKeyboard(ctx.from.id),
      });
      return;
    }

    case "editTitle":
    case "editTime": {
      const task = await findRecurringTask(db(), action.taskId);
      if (!task || task.userId !== user.id) {
        await clearPendingAction(db(), user.id);
        await reply(messages.taskGone);
        return;
      }

      if (action.kind === "editTitle") {
        const title = parseTitle(text);
        if (!title.ok) {
          return promptForInput(
            ctx,
            user,
            action,
            (who) => `${title.error}\n${messages.askNewTitle(who, task.title)}`,
            message,
          );
        }
        const updated = await renameRecurringTask(db(), task.id, user.id, title.title);
        await clearPendingAction(db(), user.id);
        await reply(updated ? messages.titleUpdated(title.title) : messages.taskGone, {
          reply_markup: backToListKeyboard(ctx.from.id),
        });
        return;
      }

      const parsed = parseTaskTime(text);
      if (!parsed.ok) {
        return promptForInput(
          ctx,
          user,
          action,
          (who) => `${parsed.error}\n${messages.askNewTime(who, task)}`,
          message,
        );
      }
      const { time } = parsed;
      const updated = await rescheduleRecurringTask(db(), task.id, user.id, time);
      await clearPendingAction(db(), user.id);
      await reply(updated ? messages.timeUpdated(task.title, time) : messages.taskGone, {
        reply_markup: backToListKeyboard(ctx.from.id),
      });
      return;
    }
  }
  return next();
}
