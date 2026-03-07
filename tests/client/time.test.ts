import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { timeAgo } from "../../src/client/utils/time";

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-07T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for timestamps less than 1 minute ago", () => {
    const thirtySecondsAgo = new Date("2026-03-07T11:59:35Z").toISOString();
    expect(timeAgo(thirtySecondsAgo)).toBe("just now");
  });

  it("returns minutes ago for timestamps less than 1 hour ago", () => {
    const fiveMinutesAgo = new Date("2026-03-07T11:55:00Z").toISOString();
    expect(timeAgo(fiveMinutesAgo)).toBe("5m ago");
  });

  it("returns hours ago for timestamps less than 24 hours ago", () => {
    const threeHoursAgo = new Date("2026-03-07T09:00:00Z").toISOString();
    expect(timeAgo(threeHoursAgo)).toBe("3h ago");
  });

  it("returns days ago for timestamps 24+ hours ago", () => {
    const twoDaysAgo = new Date("2026-03-05T12:00:00Z").toISOString();
    expect(timeAgo(twoDaysAgo)).toBe("2d ago");
  });

  it("returns '1m ago' at exactly 60 seconds", () => {
    const oneMinuteAgo = new Date("2026-03-07T11:59:00Z").toISOString();
    expect(timeAgo(oneMinuteAgo)).toBe("1m ago");
  });

  it("returns '59m ago' at 59 minutes", () => {
    const fiftyNineMinutesAgo = new Date("2026-03-07T11:01:00Z").toISOString();
    expect(timeAgo(fiftyNineMinutesAgo)).toBe("59m ago");
  });

  it("returns '1h ago' at exactly 60 minutes", () => {
    const oneHourAgo = new Date("2026-03-07T11:00:00Z").toISOString();
    expect(timeAgo(oneHourAgo)).toBe("1h ago");
  });

  it("returns '23h ago' at 23 hours", () => {
    const twentyThreeHoursAgo = new Date("2026-03-06T13:00:00Z").toISOString();
    expect(timeAgo(twentyThreeHoursAgo)).toBe("23h ago");
  });

  it("returns '1d ago' at exactly 24 hours", () => {
    const oneDayAgo = new Date("2026-03-06T12:00:00Z").toISOString();
    expect(timeAgo(oneDayAgo)).toBe("1d ago");
  });
});
