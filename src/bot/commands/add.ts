import type { CommandContext, Context } from "grammy";
import { findUser } from "@/core/users";
import { parseTitle } from "@/core/validation";
import { db } from "@/lib/db";
import { messages } from "../messages";
import { addOneTimeTask } from "../oneTime";
import { promptForInput } from "../prompt";

/** `/add <title>` — a one-time task for today; without a title, ask for one. */
export async function addCommand(ctx: CommandContext<Context>) {
  if (!ctx.from || !ctx.message) return;
  const user = await findUser(db(), ctx.from.id);
  if (!user) {
    await ctx.reply(messages.notRegistered);
    return;
  }

  if (!ctx.match.trim()) {
    await promptForInput(ctx, user, { kind: "addOneTimeTitle" }, messages.askOneTimeTitle, ctx.message);
    return;
  }

  const title = parseTitle(ctx.match);
  if (!title.ok) {
    await ctx.reply(messages.titleError(title.reason), { reply_parameters: { message_id: ctx.message.message_id } });
    return;
  }
  await addOneTimeTask(ctx, user, title.title, ctx.message);
}
