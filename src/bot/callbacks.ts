import { GrammyError, type Context, type InlineKeyboard } from "grammy";
import { findRecurringTask, isOwner, listRecurringTasks, type TaskWithOwner } from "@/core/recurring";
import { findUser } from "@/core/users";
import type { User } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { parseCallbackData } from "./callbackData";
import { taskDetailKeyboard, taskListKeyboard } from "./keyboards";
import { messages } from "./messages";

/** Edit the button's message in place; "not modified" (e.g. double tap) is fine. */
async function edit(ctx: Context, text: string, keyboard?: InlineKeyboard) {
  try {
    await ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard });
  } catch (error) {
    if (error instanceof GrammyError && error.description.includes("message is not modified")) return;
    throw error;
  }
}

async function showList(ctx: Context, owner: User) {
  const tasks = await listRecurringTasks(db(), owner.id);
  const ownerId = Number(owner.telegramUserId);
  await edit(ctx, messages.taskList(owner.displayName, tasks), taskListKeyboard(ownerId, tasks));
}

export async function showTask(ctx: Context, task: TaskWithOwner) {
  await edit(ctx, messages.taskDetail(task), taskDetailKeyboard(Number(task.user.telegramUserId), task));
}

/** Router for recurring-task buttons (`rt:*`). Every action checks ownership first. */
export async function recurringTaskCallback(ctx: Context) {
  const toast = await route(ctx);
  await ctx.answerCallbackQuery(toast ?? undefined);
}

/** Handles the button and returns an optional toast for the callback answer. */
async function route(ctx: Context): Promise<string | void> {
  const from = ctx.from;
  const data = parseCallbackData(ctx.callbackQuery?.data ?? "");
  if (!from || !data) return;

  if (data.scope === "list") {
    const owner = await findUser(db(), data.ownerId);
    if (!owner) return messages.notRegistered;
    if (from.id !== data.ownerId) return messages.notOwner(owner.displayName);

    switch (data.action) {
      case "list":
        return showList(ctx, owner);
    }
    return;
  }

  const task = await findRecurringTask(db(), data.taskId);
  if (!task) return messages.taskGone;
  if (!isOwner(task, from.id)) return messages.notOwner(task.user.displayName);

  switch (data.action) {
    case "open":
      return showTask(ctx, task);
  }
}
