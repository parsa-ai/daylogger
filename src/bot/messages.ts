import type { RecurringTask } from "@/generated/prisma/client";
import { escapeHtml } from "./format";

const appliesTomorrow = "<i>Changes apply from tomorrow.</i>";

export const messages = {
  welcome: (name: string) =>
    `Welcome, <b>${escapeHtml(name)}</b>! 👋\n\n` +
    `I'll ask about your daily tasks here in the group and post a report every evening.\n\n` +
    `Start by setting up your recurring tasks with /tasks.`,

  help:
    `<b>How it works</b>\n` +
    `Set your recurring daily tasks once. Every day I ask you about each one at its time, ` +
    `follow up twice if needed, and post a group report in the evening.\n\n` +
    `/start — join the bot\n` +
    `/tasks — view and manage your recurring tasks\n` +
    `/add &lt;title&gt; — add a one-time task for today\n` +
    `/report — show today's group progress\n` +
    `/help — show this message`,

  privateChat: "I work inside the accountability group. Please use me there 🙂",

  unknownGroup: (chatId: number) =>
    `This group isn't configured yet.\nSet <code>GROUP_CHAT_ID=${chatId}</code> and redeploy.`,

  notRegistered: "Please send /start first so I know you.",

  // /tasks
  taskList: (name: string, tasks: RecurringTask[]) => {
    const header = `<b>${escapeHtml(name)}'s recurring tasks</b>\n\n`;
    if (tasks.length === 0) return header + "No recurring tasks yet. Tap ➕ Add task to create one.";
    const lines = tasks.map(
      (t) => `• ${t.reminderTime} — ${escapeHtml(t.title)}${t.isActive ? "" : " <i>(paused)</i>"}`,
    );
    return header + lines.join("\n") + `\n\nTap a task to manage it. ${appliesTomorrow}`;
  },

  taskDetail: (task: RecurringTask) =>
    `<b>${escapeHtml(task.title)}</b>\n` +
    `Time: ${task.reminderTime}\n` +
    `Status: ${task.isActive ? "Active" : "Paused"}\n\n` +
    appliesTomorrow,

  confirmDelete: (task: RecurringTask) =>
    `Delete <b>${escapeHtml(task.title)}</b> (${task.reminderTime})?\n` +
    `Past days and reports are kept.`,

  notOwner: (name: string) => `Only ${name} can manage these tasks.`,
  taskGone: "This task no longer exists.",
};

