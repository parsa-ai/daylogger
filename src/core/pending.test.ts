import { describe, expect, it } from "vitest";
import { parsePendingAction } from "./pending";

describe("parsePendingAction", () => {
  it("accepts known actions", () => {
    const action = { kind: "addRecurringTime", title: "Study", promptMessageId: 42 };
    expect(parsePendingAction(action)).toEqual(action);
  });

  it.each([null, undefined, {}, { kind: "nope", promptMessageId: 1 }, { kind: "editTitle", promptMessageId: 1 }])(
    "treats %j as no action",
    (value) => {
      expect(parsePendingAction(value)).toBeNull();
    },
  );
});
