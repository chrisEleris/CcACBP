import { describe, expect, it } from "vitest";
import { formatDuration } from "../../src/client/pages/jenkins/jenkins-helpers";

describe("formatDuration", () => {
  it("returns '-' for zero ms", () => {
    expect(formatDuration(0)).toBe("-");
  });

  it("returns seconds only when under 60s", () => {
    expect(formatDuration(5000)).toBe("5s");
    expect(formatDuration(45000)).toBe("45s");
  });

  it("returns minutes and seconds for 60s+", () => {
    expect(formatDuration(60000)).toBe("1m 0s");
    expect(formatDuration(90000)).toBe("1m 30s");
    expect(formatDuration(125000)).toBe("2m 5s");
  });

  it("handles large durations", () => {
    expect(formatDuration(3600000)).toBe("60m 0s");
  });

  it("handles sub-second values", () => {
    expect(formatDuration(500)).toBe("0s");
  });
});
