import { describe, expect, it } from "vitest";
import { cb, parseCallbackData } from "./callbackData";

describe("callback data", () => {
  it("round-trips list and task actions", () => {
    expect(parseCallbackData(cb.list("add", 123456789))).toEqual({
      scope: "list",
      action: "add",
      ownerId: 123456789,
    });
    expect(parseCallbackData(cb.task("toggle", "clx0abc123"))).toEqual({
      scope: "task",
      action: "toggle",
      taskId: "clx0abc123",
    });
    expect(parseCallbackData(cb.oneTime("in30", "clx0abc123"))).toEqual({
      scope: "oneTime",
      action: "in30",
      taskId: "clx0abc123",
    });
    expect(parseCallbackData(cb.daily("done", "clx0abc123"))).toEqual({
      scope: "daily",
      action: "done",
      taskId: "clx0abc123",
    });
  });

  it("stays within Telegram's 64-byte limit", () => {
    expect(cb.task("delok", "c".repeat(30)).length).toBeLessThanOrEqual(64);
    expect(cb.list("list", 9_999_999_999_999).length).toBeLessThanOrEqual(64);
  });

  it.each(["", "rt", "rt:open", "rt:nope:abc", "xx:open:abc", "rt:list:abc", "rt:open:a:b", "rt:open:a-b", "dt:open:abc", "rt:done:abc", "ot:done:abc"])(
    "rejects %j",
    (data) => {
      expect(parseCallbackData(data)).toBeNull();
    },
  );
});
