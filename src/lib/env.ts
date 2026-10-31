import { z } from "zod";

const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected HH:mm");

const schema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1),
  CRON_SECRET: z.string().min(1),
  DATABASE_URL: z.url(),
  // DIRECT_URL is only used by the Prisma CLI (prisma.config.ts), not at runtime.
  // Optional so the bot can boot and reveal the group's chat id during setup.
  GROUP_CHAT_ID: z.string().regex(/^-?\d+$/, "expected a numeric chat id").transform(BigInt).optional(),
  GROUP_TIMEZONE: z.string().default("Europe/London").refine(isValidTimeZone, "invalid IANA timezone"),
  REMINDER_CUTOFF: timeOfDay.default("21:30"),
  REPORT_TIME: timeOfDay.default("22:00"),
});

export type Env = z.infer<typeof schema>;

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

let cached: Env | undefined;

// Parsed lazily so `next build` works without runtime secrets.
export function env(): Env {
  if (!cached) {
    const result = schema.safeParse(process.env);
    if (!result.success) {
      throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
    }
    cached = result.data;
  }
  return cached;
}

/** Group scheduling settings for the core logic. */
export function scheduleConfig() {
  const e = env();
  return { timeZone: e.GROUP_TIMEZONE, cutoff: e.REMINDER_CUTOFF, reportTime: e.REPORT_TIME };
}
