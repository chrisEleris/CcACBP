import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatSizeGb,
} from "../../src/client/utils/format";

describe("formatBytes", () => {
  it("returns '0 B' for zero bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats bytes correctly", () => {
    expect(formatBytes(500)).toBe("500.0 B");
  });

  it("formats kilobytes correctly", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats megabytes correctly", () => {
    expect(formatBytes(1048576)).toBe("1.0 MB");
    expect(formatBytes(5242880)).toBe("5.0 MB");
  });

  it("formats gigabytes correctly", () => {
    expect(formatBytes(1073741824)).toBe("1.0 GB");
  });

  it("formats terabytes correctly", () => {
    expect(formatBytes(1099511627776)).toBe("1.0 TB");
  });

  it("handles negative values", () => {
    expect(formatBytes(-1024)).toBe("-1.0 KB");
  });

  it("respects decimal parameter", () => {
    expect(formatBytes(1536, 2)).toBe("1.50 KB");
    expect(formatBytes(1536, 0)).toBe("2 KB");
  });
});

describe("formatSizeGb", () => {
  it("returns GB for values under 1000", () => {
    expect(formatSizeGb(5)).toBe("5.0 GB");
    expect(formatSizeGb(123.4)).toBe("123.4 GB");
  });

  it("returns TB for values 1000+", () => {
    expect(formatSizeGb(1000)).toBe("1.0 TB");
    expect(formatSizeGb(2500)).toBe("2.5 TB");
  });

  it("handles zero", () => {
    expect(formatSizeGb(0)).toBe("0.0 GB");
  });
});

describe("formatNumber", () => {
  it("formats small numbers without separators", () => {
    expect(formatNumber(42)).toBe("42");
  });

  it("formats large numbers with thousand separators", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("handles zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("handles negative numbers", () => {
    expect(formatNumber(-1234)).toBe("-1,234");
  });
});

describe("formatCurrency", () => {
  it("formats USD amounts correctly", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("rounds to 2 decimal places", () => {
    expect(formatCurrency(99.999)).toBe("$100.00");
  });

  it("handles negative amounts", () => {
    expect(formatCurrency(-42.5)).toBe("-$42.50");
  });
});

describe("formatPercent", () => {
  it("formats decimal values as percentages", () => {
    expect(formatPercent(0.456)).toBe("45.6%");
  });

  it("formats values > 1 as already being percentages", () => {
    expect(formatPercent(85.3)).toBe("85.3%");
  });

  it("handles zero", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });

  it("handles 100%", () => {
    expect(formatPercent(100)).toBe("100.0%");
  });

  it("respects decimal parameter", () => {
    expect(formatPercent(0.4567, 2)).toBe("45.67%");
  });
});
