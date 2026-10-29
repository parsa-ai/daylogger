import { Bot } from "grammy";
import { env } from "@/lib/env";

let bot: Bot | undefined;
let ready: Promise<void> | undefined;

// One bot per serverless instance; init (getMe) runs once per cold start.
export async function getBot(): Promise<Bot> {
  if (!bot) {
    bot = new Bot(env().TELEGRAM_BOT_TOKEN);
    ready = bot.init();
  }
  await ready;
  return bot;
}
