import type { Context, NextFunction } from "grammy";
import type { Message } from "grammy/types";
import {
  clearPendingAction,
  parsePendingAction,
  setPendingAction,
  type PendingAction,
  type PendingInput,
} from "@/core/pending";
import {
  createRecurringTask,
  findRecurringTask,
  renameRecurringTask,
  rescheduleRecurringTask,
} from "@/core/recurring";
import { findUser } from "@/core/users";
import { parseTime, parseTitle } from "@/core/validation";
import type { User } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { mention } from "./format";
import { backToListKeyboard } from "./keyboards";
import { messages } from "./messages";

/**
 * Ask the user for text and remember what the answer is for. The prompt uses a
 * selective force-reply so only that user's client opens a reply, and replies to
 * the bot reach it even with privacy mode on.
 */
export async function promptForInput(
  ctx: Context,
  user: User,
  action: PendingInput,
  text: (who: string) => string,
  replyTo?: Message,
): Promise<void> {
  const sent = await ctx.reply(text(mention(user.telegramUserId, user.displayName)), {
    parse_mode: "HTML",
    reply_markup: { force_reply: true, selective: true },
    ...(replyTo && { reply_parameters: { message_id: replyTo.message_id } }),
  });
  await setPendingAction(db(), user.id, { ...action, promptMessageId: sent.message_id } as PendingAction);
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
      const time = parseTime(text);
      if (!time) {
        return promptForInput(
          ctx,
          user,
          action,
          (who) => `${messages.invalidTime}\n${messages.askTime(who, action.title)}`,
          message,
        );
      }
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
            (who) => `${title.error}
${messages.askNewTitle(who, task.title)}`,
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

      const time = parseTime(text);
      if (!time) {
        return promptForInput(
          ctx,
          user,
          action,
          (who) => `${messages.invalidTime}
${messages.askNewTime(who, task)}`,
          message,
        );
      }
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
