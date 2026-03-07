import { describe, expect, it } from "vitest";
import { getMonthAbbr } from "../../src/server/routes/aws";

describe("AWS helper functions", () => {
  describe("getMonthAbbr", () => {
    it("returns Jan for January", () => {
      expect(getMonthAbbr(new Date(2024, 0, 1))).toBe("Jan");
    });
    it("returns Jun for June", () => {
      expect(getMonthAbbr(new Date(2024, 5, 15))).toBe("Jun");
    });
    it("returns Dec for December", () => {
      expect(getMonthAbbr(new Date(2024, 11, 25))).toBe("Dec");
    });
  });
});
