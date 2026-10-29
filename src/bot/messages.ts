import { escapeHtml } from "./format";

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

  notRegistered: "Please send /start first so I know you.",
};
