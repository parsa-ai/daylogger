import { Bot } from "grammy";
import { env } from "@/lib/env";
import { recurringTaskCallback } from "./callbacks";
import { helpCommand } from "./commands/help";
import { startCommand } from "./commands/start";
import { tasksCommand } from "./commands/tasks";
import { pendingInputHandler } from "./input";
import { messages } from "./messages";

let bot: Bot | undefined;
let ready: Promise<void> | undefined;

function createBot(): Bot {
  const b = new Bot(env().TELEGRAM_BOT_TOKEN);
  const groupId = env().GROUP_CHAT_ID;

  // Private chats only get a pointer to the group.
  b.chatType("private").command(["start", "help"], (ctx) => ctx.reply(messages.privateChat));

  // Setup aid: in any other group, /start reveals the chat id to put in GROUP_CHAT_ID.
  b.chatType(["group", "supergroup"])
    .filter((ctx) => BigInt(ctx.chat.id) !== groupId)
    .command("start", (ctx) => ctx.reply(messages.unknownGroup(ctx.chat.id), { parse_mode: "HTML" }));

  // Everything else must come from the configured group; other chats are ignored.
  const group = b.filter((ctx) => ctx.chat !== undefined && BigInt(ctx.chat.id) === groupId);

  group.command("start", startCommand);
  group.command("help", helpCommand);
  group.command("tasks", tasksCommand);
  group.callbackQuery(/^rt:/, recurringTaskCallback);
  // Replies to the bot's input prompts (task titles, times). Keep last.
  group.on("message:text", pendingInputHandler);

  return b;
}

// One bot per serverless instance; init (getMe) runs once per cold start.
export async function getBot(): Promise<Bot> {
  if (!bot) {
    bot = createBot();
    ready = bot.init();
  }
  await ready;
  return bot;
}
