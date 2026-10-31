import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];
let missedYesterday = false;

vi.mock("./finalize", () => ({
  finalizePastDays: vi.fn(async () => (calls.push("pastDays"), 0)),
  finalizeDue: vi.fn(async () => (calls.push("due"), 0)),
  finalizeDay: vi.fn(async () => (calls.push("day"), 0)),
}));
vi.mock("./generation", () => ({ ensureTodayInstances: vi.fn(async () => (calls.push("generate"), 0)) }));
vi.mock("./delivery", () => ({
  processDueReminders: vi.fn(async () => (calls.push("remind"), { sent: 0, skipped: 0, failed: 0 })),
}));
vi.mock("./report", () => ({
  hasMissedReport: vi.fn(async () => missedYesterday),
  publishReportOnce: vi.fn(async (_db, _sender, date: string) => (calls.push(`report ${date}`), true)),
}));

const { runTick } = await import("./tick");
const config = { timeZone: "Europe/London", cutoff: "21:30", reportTime: "22:00" };

beforeEach(() => {
  calls.length = 0;
  missedYesterday = false;
});

describe("runTick", () => {
  it("does not close the day or report before report time", async () => {
    const result = await runTick({} as never, {} as never, new Date("2026-07-01T20:55:00Z"), config); // 21:55 BST
    expect(calls).toEqual(["pastDays", "generate", "due", "remind"]);
    expect(result.reported).toEqual([]);
  });

  it("closes the day and reports at report time, before sending any reminder", async () => {
    const result = await runTick({} as never, {} as never, new Date("2026-07-01T21:00:00Z"), config); // 22:00 BST
    expect(calls).toEqual(["pastDays", "generate", "due", "day", "report 2026-07-01", "remind"]);
    expect(result.reported).toEqual(["2026-07-01"]);
  });

  it("catches up on a missed report for yesterday", async () => {
    missedYesterday = true;
    await runTick({} as never, {} as never, new Date("2026-07-02T06:00:00Z"), config);
    expect(calls.slice(0, 2)).toEqual(["pastDays", "report 2026-07-01"]);
  });
});
