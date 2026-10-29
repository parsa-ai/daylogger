import type { Context } from "grammy";
import { upsertUser } from "@/core/users";
import { db } from "@/lib/db";
import { messages } from "../messages";

export async function startCommand(ctx: Context) {
  if (!ctx.from || !ctx.chat) return;
  const user = await upsertUser(db(), ctx.from, BigInt(ctx.chat.id));
  await ctx.reply(messages.welcome(user.displayName), { parse_mode: "HTML" });
}
