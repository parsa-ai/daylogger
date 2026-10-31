import { describe, expect, it } from "vitest";
import type { ReportData } from "@/core/report";
import { chunk, formatReport } from "./report";

const data: ReportData = {
  date: "2026-07-01",
  members: [
    {
      name: "Ali",
      tasks: [
        { title: "Study university subjects", status: "COMPLETED" },
        { title: "Exercise", status: "COMPLETED" },
        { title: "Work on project", status: "INCOMPLETE" },
      ],
      completed: 2,
      total: 3,
    },
    {
      name: "Parsa <3",
      tasks: [
        { title: "Study English", status: "COMPLETED" },
        { title: "Work on project", status: "COMPLETED" },
        { title: "Exercise", status: "INCOMPLETE" },
        { title: "Buy a charger", status: "COMPLETED" },
      ],
      completed: 3,
      total: 4,
    },
    { name: "Sara", tasks: [], completed: 0, total: 0 },
  ],
  completed: 5,
  total: 7,
};

describe("formatReport", () => {
  it("renders the final report like the spec", () => {
    const [text, ...rest] = formatReport(data, "final");
    expect(rest).toEqual([]);
    expect(text).toBe(
      [
        "📊 <b>Daily Group Report</b> — Wed 1 Jul",
        "<b>Ali</b>\n• Study university subjects: ✅ Completed\n• Exercise: ✅ Completed\n• Work on project: ❌ Incomplete\nProgress: 2/3 — 67%",
        "<b>Parsa &lt;3</b>\n• Study English: ✅ Completed\n• Work on project: ✅ Completed\n• Exercise: ❌ Incomplete\n• Buy a charger: ✅ Completed\nProgress: 3/4 — 75%",
        "<b>Sara</b>\nNo tasks today.",
        "<b>Group progress</b>\n5 completed tasks out of 7 total tasks.\n71% completion.",
      ].join("\n\n"),
    );
  });

  it("labels the snapshot and shows pending tasks", () => {
    const [text] = formatReport(
      { ...data, members: [{ name: "A", tasks: [{ title: "T", status: "PENDING" }], completed: 0, total: 1 }], completed: 0, total: 1 },
      "snapshot",
    );
    expect(text).toContain("📊 <b>Today so far</b>");
    expect(text).toContain("• T: ⏳ Pending\nProgress: 0/1 — 0%");
    expect(text).toContain("0 completed tasks out of 1 total task.");
  });

  it("uses empty states instead of 0%", () => {
    const [text] = formatReport({ date: "2026-07-01", members: [], completed: 0, total: 0 }, "final");
    expect(text).toContain("No members yet");
    expect(text).toContain("<b>Group progress</b>\nNo tasks today.");
    expect(text).not.toContain("%");
  });
});

describe("chunk", () => {
  it("packs blocks into messages under the limit", () => {
    expect(chunk(["aaaa", "bbbb", "cccc"], 10)).toEqual(["aaaa\n\nbbbb", "cccc"]);
  });

  it("splits an oversized block by line", () => {
    const parts = chunk(["head", "l1xxxxx\nl2xxxxx\nl3xxxxx"], 16);
    expect(parts.every((p) => p.length <= 16)).toBe(true);
    expect(parts.join("\n\n")).toContain("l3xxxxx");
  });
});
