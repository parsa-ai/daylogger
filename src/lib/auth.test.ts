import { describe, expect, it } from "vitest";
import { safeEqual } from "./auth";

describe("safeEqual", () => {
  it("compares strings", () => {
    expect(safeEqual("Bearer abc", "Bearer abc")).toBe(true);
    expect(safeEqual("Bearer abc", "Bearer abd")).toBe(false);
    expect(safeEqual("Bearer abc", "Bearer abcd")).toBe(false);
    expect(safeEqual("", "x")).toBe(false);
  });
});
