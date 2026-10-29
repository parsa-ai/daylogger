// Usage: pnpm bot:set-webhook https://your-app.vercel.app
// Reads TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET from the environment / .env.
import "dotenv/config";

const baseUrl = process.argv[2];
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!baseUrl || !token || !secret) {
  console.error("Usage: pnpm bot:set-webhook <base-url> (needs TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET)");
  process.exit(1);
}

async function call(method: string, body: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  console.log(method, json);
  if (!json.ok) process.exit(1);
}

await call("setWebhook", {
  url: new URL("/api/telegram", baseUrl).toString(),
  secret_token: secret,
  allowed_updates: ["message", "callback_query"],
  drop_pending_updates: true,
});

await call("setMyCommands", {
  commands: [
    { command: "start", description: "Join the bot" },
    { command: "tasks", description: "Manage your recurring tasks" },
    { command: "add", description: "Add a one-time task for today" },
    { command: "report", description: "Show today's group progress" },
    { command: "help", description: "How the bot works" },
  ],
});
