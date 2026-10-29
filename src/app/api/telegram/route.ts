import type { Update } from "grammy/types";
import { getBot } from "@/bot/bot";
import { env } from "@/lib/env";

export const maxDuration = 30;

export async function POST(request: Request) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== env().TELEGRAM_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let update: Update;
  try {
    update = (await request.json()) as Update;
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const bot = await getBot();
  await bot.handleUpdate(update);
  return new Response("OK");
}
