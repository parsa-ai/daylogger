import { MAX_RECURRING_TASKS } from "@/core/recurring";
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
  taskLimit: `You can have at most ${MAX_RECURRING_TASKS} recurring tasks.`,

  // Text input prompts (reply-to-message flows)
  askTitle: (who: string) => `${who}, reply to this message with the task title.\n<i>Send "cancel" to stop.</i>`,
  askTime: (who: string, title: string) =>
    `${who}, what time should I ask about <b>${escapeHtml(title)}</b>?\n` +
    `Reply with a time like <code>10:00</code> or <code>21:15</code>.\n<i>Send "cancel" to stop.</i>`,
  invalidTime: "That isn't a valid time. Use HH:mm, e.g. 10:00.",
  timeAfterCutoff: (cutoff: string) => `Reminders stop at ${cutoff}, so pick a time no later than that.`,
  inputCancelled: "Cancelled.",

  taskAdded: (title: string, time: string) =>
    `Added <b>${escapeHtml(title)}</b> at ${time}.\nIt starts tomorrow.`,

  askNewTitle: (who: string, current: string) =>
    `${who}, reply with a new title for <b>${escapeHtml(current)}</b>.\n<i>Send "cancel" to stop.</i>`,
  askNewTime: (who: string, task: RecurringTask) =>
    `${who}, reply with a new time for <b>${escapeHtml(task.title)}</b> (now ${task.reminderTime}).\n` +
    `Use HH:mm, e.g. <code>10:00</code>.\n<i>Send "cancel" to stop.</i>`,
  titleUpdated: (title: string) => `Renamed to <b>${escapeHtml(title)}</b>.\n${appliesTomorrow}`,
  timeUpdated: (title: string, time: string) =>
    `<b>${escapeHtml(title)}</b> is now at ${time}.\n${appliesTomorrow}`,

  // Reminders (attempt 1 = initial, 2–3 = follow-ups)
  reminder: (who: string, title: string, attempt: number) => {
    const task = `<b>${escapeHtml(title)}</b>`;
    if (attempt <= 1) return `${who}, have you completed ${task} today?`;
    const label = attempt >= 3 ? "Last reminder" : "Reminder";
    return `🔔 ${label}: ${who}, have you done ${task} yet?`;
  },

  reminderCompleted: (who: string, title: string, at: string) =>
    `✅ ${who} completed <b>${escapeHtml(title)}</b> at ${at}.`,
  reminderNotYet: (who: string, title: string, nextAt: string | null) =>
    `⏳ ${who} hasn't done <b>${escapeHtml(title)}</b> yet.\n` +
    (nextAt ? `I'll check again at ${nextAt}.` : "No more reminders today."),

  notTaskOwner: (name: string) => `Only ${name} can answer this.`,
  toastCompleted: "Nice work! ✅",
  toastNotYet: "Okay, I'll check again later.",
  toastAlreadyCompleted: "Already completed ✅",
  toastTaskClosed: "This task is closed.",

  toastActivated: "Activated — from tomorrow.",
  toastPaused: "Paused — from tomorrow.",
  toastDeleted: "Deleted.",
};

