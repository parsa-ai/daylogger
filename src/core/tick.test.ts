import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];
vi.mock("./finalize", () => ({
  finalizePastDays: vi.fn(async () => (calls.push("pastDays"), 0)),
  finalizeDue: vi.fn(async () => (calls.push("due"), 0)),
  finalizeDay: vi.fn(async () => (calls.push("day"), 0)),
}));
vi.mock("./generation", () => ({ ensureTodayInstances: vi.fn(async () => (calls.push("generate"), 0)) }));
vi.mock("./delivery", () => ({
  processDueReminders: vi.fn(async () => (calls.push("remind"), { sent: 0, skipped: 0, failed: 0 })),
}));

const { runTick } = await import("./tick");
const config = { timeZone: "Europe/London", cutoff: "21:30", reportTime: "22:00" };

beforeEach(() => {
  calls.length = 0;
});

describe("runTick", () => {
  it("does not close the day before report time", async () => {
    await runTick({} as never, {} as never, new Date("2026-07-01T20:55:00Z"), config); // 21:55 BST
    expect(calls).toEqual(["pastDays", "generate", "due", "remind"]);
  });

  it("closes the day at report time, before sending any reminder", async () => {
    await runTick({} as never, {} as never, new Date("2026-07-01T21:00:00Z"), config); // 22:00 BST
    expect(calls).toEqual(["pastDays", "generate", "due", "day", "remind"]);
  });
});
