import { afterEach, describe, expect, it, vi } from "vitest";

const valid = {
  TELEGRAM_BOT_TOKEN: "token",
  TELEGRAM_WEBHOOK_SECRET: "secret",
  CRON_SECRET: "cron",
  DATABASE_URL: "postgresql://u:p@host/db",
  DIRECT_URL: "postgresql://u:p@host/db",
  GROUP_CHAT_ID: "-1001234567890",
};

async function loadEnv(vars: Record<string, string>) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
  const { env } = await import("./env");
  return env;
}

afterEach(() => vi.unstubAllEnvs());

describe("env", () => {
  it("applies defaults and coerces the chat id", async () => {
    const env = await loadEnv(valid);
    expect(env()).toMatchObject({
      GROUP_CHAT_ID: -1001234567890n,
      GROUP_TIMEZONE: "Europe/London",
      REMINDER_CUTOFF: "21:30",
      REPORT_TIME: "22:00",
    });
  });

  it("rejects an unknown timezone", async () => {
    const env = await loadEnv({ ...valid, GROUP_TIMEZONE: "Mars/Olympus" });
    expect(() => env()).toThrow(/invalid IANA timezone/);
  });

  it("rejects a malformed cutoff time", async () => {
    const env = await loadEnv({ ...valid, REMINDER_CUTOFF: "25:00" });
    expect(() => env()).toThrow(/HH:mm/);
  });
});

describe("env during setup", () => {
  it("boots without GROUP_CHAT_ID and DIRECT_URL", async () => {
    const { GROUP_CHAT_ID, DIRECT_URL, ...rest } = valid;
    void GROUP_CHAT_ID;
    void DIRECT_URL;
    const env = await loadEnv(rest);
    expect(env().GROUP_CHAT_ID).toBeUndefined();
  });
});
