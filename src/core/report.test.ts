import { describe, expect, it } from "vitest";
import { buildReportData, percent } from "./report";

const created = new Date("2026-07-01T00:00:00Z");
const task = (userId: string, title: string, status: string, reminderTime: string | null = null) => ({
  userId,
  title,
  status: status as "COMPLETED",
  reminderTime,
  createdAt: created,
});

describe("percent", () => {
  it("rounds to whole numbers", () => {
    expect(percent(3, 4)).toBe(75);
    expect(percent(2, 3)).toBe(67);
    expect(percent(5, 7)).toBe(71);
    expect(percent(1, 3)).toBe(33);
  });

  it("is null when there are no tasks", () => {
    expect(percent(0, 0)).toBeNull();
  });
});

describe("buildReportData", () => {
  const users = [
    { id: "u2", displayName: "Parsa", isActive: true },
    { id: "u1", displayName: "Ali", isActive: true },
    { id: "u3", displayName: "Sara", isActive: true },
    { id: "u4", displayName: "Old", isActive: false },
  ];

  it("matches the spec example", () => {
    const data = buildReportData("2026-07-01", users, [
      task("u2", "Exercise", "INCOMPLETE", "19:00"),
      task("u2", "Study English", "COMPLETED", "10:00"),
      task("u2", "Buy a charger", "COMPLETED"),
      task("u2", "Work on project", "COMPLETED", "14:00"),
      task("u1", "Study university subjects", "COMPLETED", "21:00"),
      task("u1", "Exercise", "COMPLETED", "19:00"),
      task("u1", "Work on project", "INCOMPLETE", "14:00"),
    ]);

    expect(data.members.map((m) => m.name)).toEqual(["Ali", "Parsa", "Sara"]);
    const parsa = data.members[1];
    expect(parsa.tasks.map((t) => t.title)).toEqual(["Study English", "Work on project", "Exercise", "Buy a charger"]);
    expect([parsa.completed, parsa.total]).toEqual([3, 4]);
    expect([data.members[0].completed, data.members[0].total]).toEqual([2, 3]);
    expect([data.completed, data.total]).toEqual([5, 7]);
  });

  it("lists active members without tasks and drops inactive ones without tasks", () => {
    const data = buildReportData("2026-07-01", users, [task("u4", "Leftover", "PENDING")]);
    expect(data.members.find((m) => m.name === "Sara")).toEqual({ name: "Sara", tasks: [], completed: 0, total: 0 });
    expect(data.members.map((m) => m.name)).toContain("Old");
    expect(buildReportData("2026-07-01", users, []).members.map((m) => m.name)).not.toContain("Old");
  });

  it("shows cancelled tasks but leaves them out of progress", () => {
    const data = buildReportData("2026-07-01", users, [task("u3", "A", "COMPLETED"), task("u3", "B", "CANCELLED")]);
    const sara = data.members.find((m) => m.name === "Sara")!;
    expect(sara.tasks).toHaveLength(2);
    expect([sara.completed, sara.total]).toEqual([1, 1]);
  });
});
