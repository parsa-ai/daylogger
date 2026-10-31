import type { Context } from "grammy";
import {
  MAX_RECURRING_TASKS,
  deleteRecurringTask,
  findRecurringTask,
  isOwner,
  listRecurringTasks,
  setRecurringTaskActive,
  type TaskWithOwner,
} from "@/core/recurring";
import { findUser } from "@/core/users";
import type { User } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { parseCallbackData } from "./callbackData";
import { editCallbackMessage } from "./edit";
import { promptForInput } from "./prompt";
import { confirmDeleteKeyboard, taskDetailKeyboard, taskListKeyboard } from "./keyboards";
import { messages } from "./messages";

const edit = editCallbackMessage;

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
      case "add": {
        const tasks = await listRecurringTasks(db(), owner.id);
        if (tasks.length >= MAX_RECURRING_TASKS) return messages.taskLimit;
        return promptForInput(ctx, owner, { kind: "addRecurringTitle" }, messages.askTitle);
      }
    }
    return;
  }

  if (data.scope !== "task") return;

  const task = await findRecurringTask(db(), data.taskId);
  if (!task) return messages.taskGone;
  if (!isOwner(task, from.id)) return messages.notOwner(task.user.displayName);

  const userId = task.user.id;
  switch (data.action) {
    case "open":
      return showTask(ctx, task);

    case "title":
      return promptForInput(ctx, task.user, { kind: "editTitle", taskId: task.id }, (who) =>
        messages.askNewTitle(who, task.title),
      );

    case "time":
      return promptForInput(ctx, task.user, { kind: "editTime", taskId: task.id }, (who) =>
        messages.askNewTime(who, task),
      );

    case "toggle": {
      const isActive = !task.isActive;
      if (!(await setRecurringTaskActive(db(), task.id, userId, isActive))) return messages.taskGone;
      await showTask(ctx, { ...task, isActive });
      return isActive ? messages.toastActivated : messages.toastPaused;
    }

    case "del":
      return edit(ctx, messages.confirmDelete(task), confirmDeleteKeyboard(task));

    case "delok":
      if (!(await deleteRecurringTask(db(), task.id, userId))) return messages.taskGone;
      await showList(ctx, task.user);
      return messages.toastDeleted;
  }
}
