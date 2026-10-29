import type { Context } from "grammy";
import { messages } from "../messages";

export async function helpCommand(ctx: Context) {
  await ctx.reply(messages.help, { parse_mode: "HTML" });
}
