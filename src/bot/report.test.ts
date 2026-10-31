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
        { title: "مطالعه‌ی زبان", status: "COMPLETED" },
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
  it("renders the final report in Persian", () => {
    const [text, ...rest] = formatReport(data, "final");
    expect(rest).toEqual([]);
    expect(text).toBe(
      [
        "📊 <b>گزارش روزانه‌ی گروه</b>\n🗓 چهارشنبه ۱۰ تیر",
        "👤 <b>Ali</b>\n• Study university subjects — ✅ انجام شد\n• Exercise — ✅ انجام شد\n• Work on project — ❌ انجام نشد\n" +
          "🟩🟩🟩🟩🟩🟩🟩⬜⬜⬜\n📈 پیشرفت: ۲ از ۳ — ۶۷٪",
        "👤 <b>Parsa &lt;3</b>\n• مطالعه‌ی زبان — ✅ انجام شد\n• Work on project — ✅ انجام شد\n• Exercise — ❌ انجام نشد\n• Buy a charger — ✅ انجام شد\n" +
          "🟩🟩🟩🟩🟩🟩🟩🟩⬜⬜\n📈 پیشرفت: ۳ از ۴ — ۷۵٪",
        "👤 <b>Sara</b>\n🍃 امروز کاری نداشت.",
        "🌟 <b>پیشرفت گروه</b>\n۵ کار از ۷ کار انجام شد.\n🟩🟩🟩🟩🟩🟩🟩⬜⬜⬜  ۷۱٪\n\n💪 خوب بود؛ فردا بهتر!",
      ].join("\n\n"),
    );
  });

  it("labels the snapshot, shows pending tasks and skips the cheer", () => {
    const [text] = formatReport(
      {
        ...data,
        members: [{ name: "A", tasks: [{ title: "T", status: "PENDING" }], completed: 0, total: 1 }],
        completed: 0,
        total: 1,
      },
      "snapshot",
    );
    expect(text).toContain("📊 <b>وضعیت امروز تا این لحظه</b>");
    expect(text).toContain("• T — ⏳ در انتظار");
    expect(text).toContain("۰ کار از ۱ کار انجام شد.");
    expect(text).not.toContain("فردا");
  });

  it("uses empty states instead of 0%", () => {
    const [text] = formatReport({ date: "2026-07-01", members: [], completed: 0, total: 0 }, "final");
    expect(text).toContain("هنوز کسی عضو نشده");
    expect(text).toContain("🍃 امروز کاری ثبت نشده.");
    expect(text).not.toContain("٪");
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
