import { Api } from "grammy";
import type { GroupSender } from "@/core/delivery";
import { env } from "@/lib/env";
import { mention } from "./format";
import { completeOnlyKeyboard, reminderKeyboard } from "./keyboards";
import { messages } from "./messages";
import { formatReport } from "./report";

/** Posts reminders and reports to the configured group (used by the cron, outside any update). */
export function telegramGroupSender(): GroupSender {
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
    async sendReport(data) {
      let firstId: number | undefined;
      for (const text of formatReport(data, "final")) {
        const sent = await api.sendMessage(chatId, text, { parse_mode: "HTML" });
        firstId ??= sent.message_id;
      }
      return firstId!;
    },
    async markIncomplete(task, messageId) {
      const who = mention(task.user.telegramUserId, task.user.displayName);
      await api.editMessageText(chatId, messageId, messages.reminderIncomplete(who, task.title), {
        parse_mode: "HTML",
        reply_markup: completeOnlyKeyboard(task.id),
      });
    },
  };
}
