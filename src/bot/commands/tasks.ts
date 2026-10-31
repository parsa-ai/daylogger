import type { Context } from "grammy";
import { listRecurringTasks } from "@/core/recurring";
import { findUser } from "@/core/users";
import { db } from "@/lib/db";
import { taskListKeyboard } from "../keyboards";
import { messages } from "../messages";

export async function tasksCommand(ctx: Context) {
  if (!ctx.from) return;
  const user = await findUser(db(), ctx.from.id);
  if (!user) {
    await ctx.reply(messages.notRegistered);
    return;
  }
  const tasks = await listRecurringTasks(db(), user.id);
  await ctx.reply(messages.taskList(user.displayName, tasks), {
    parse_mode: "HTML",
    reply_markup: taskListKeyboard(ctx.from.id, tasks),
  });
}
