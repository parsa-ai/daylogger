import { describe, expect, it } from "vitest";
import { displayNameOf } from "./users";

describe("displayNameOf", () => {
  it("joins first and last name", () => {
    expect(displayNameOf({ id: 1, first_name: "Parsa", last_name: "A" })).toBe("Parsa A");
  });

  it("falls back to username, then id", () => {
    expect(displayNameOf({ id: 1, first_name: " ", username: "parsa" })).toBe("parsa");
    expect(displayNameOf({ id: 7, first_name: "" })).toBe("User 7");
  });
});
