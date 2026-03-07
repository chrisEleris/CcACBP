import { describe, expect, it } from "vitest";
import { getMonthAbbr } from "../../src/server/routes/aws";

describe("AWS helper functions", () => {
  describe("getMonthAbbr", () => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    for (let i = 0; i < 12; i++) {
      it(`returns ${months[i]} for month index ${i}`, () => {
        expect(getMonthAbbr(new Date(2024, i, 1))).toBe(months[i]);
      });
    }
  });
});
