import type { Context } from "grammy";
import type { Message } from "grammy/types";
import { setPendingAction, type PendingAction, type PendingInput } from "@/core/pending";
import type { User } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { mention } from "./format";

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
