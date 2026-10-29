import type { Update } from "grammy/types";
import { getBot } from "@/bot/bot";
import { claimUpdate, releaseUpdate } from "@/core/updates";
import { db } from "@/lib/db";
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

  // Telegram retries on non-2xx and may deliver duplicates; handle each update once.
  if (!(await claimUpdate(db(), update.update_id))) {
    return new Response("OK");
  }

  try {
    const bot = await getBot();
    await bot.handleUpdate(update);
  } catch (error) {
    console.error("Failed to handle update", update.update_id, error);
    await releaseUpdate(db(), update.update_id);
    return new Response("Error", { status: 500 });
  }
  return new Response("OK");
}
