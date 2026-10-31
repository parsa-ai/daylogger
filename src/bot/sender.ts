import { Api } from "grammy";
import type { ReminderSender } from "@/core/delivery";
import { env } from "@/lib/env";
import { mention } from "./format";
import { reminderKeyboard } from "./keyboards";
import { messages } from "./messages";

/** Posts reminders to the configured group (used by the cron, outside any update). */
export function telegramReminderSender(): ReminderSender {
  const api = new Api(env().TELEGRAM_BOT_TOKEN);
  const groupId = env().GROUP_CHAT_ID;
  if (groupId === undefined) throw new Error("GROUP_CHAT_ID is not configured");
  const chatId = Number(groupId);

  return {
    async sendReminder(task, attempt) {
      const who = mention(task.user.telegramUserId, task.user.displayName);
      const sent = await api.sendMessage(chatId, messages.reminder(who, task.title, attempt), {
        parse_mode: "HTML",
        reply_markup: reminderKeyboard(task.id),
      });
      return sent.message_id;
    },
    async clearButtons(messageId) {
      await api.editMessageReplyMarkup(chatId, messageId);
    },
  };
}
