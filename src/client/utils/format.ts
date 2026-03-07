/**
 * Formats a byte count into a human-readable string (e.g. "1.5 KB", "3.2 GB").
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  if (bytes < 0) return `-${formatBytes(-bytes, decimals)}`;

  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const k = 1024;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const value = bytes / k ** i;

  return `${value.toFixed(decimals)} ${units[i]}`;
}

/**
 * Formats a size in GB into a human-readable string.
 */
export function formatSizeGb(gb: number): string {
  if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
  return `${gb.toFixed(1)} GB`;
}

/**
 * Formats a number with thousand separators (e.g. 1234567 -> "1,234,567").
 */
export function formatNumber(num: number): string {
  return num.toLocaleString("en-US");
}

/**
 * Formats a currency value in USD (e.g. 1234.56 -> "$1,234.56").
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats a percentage (e.g. 0.456 -> "45.6%", 85.3 -> "85.3%").
 * If the value is > 1, it's assumed to already be a percentage.
 */
export function formatPercent(value: number, decimals = 1): string {
  const pct = value > 1 ? value : value * 100;
  return `${pct.toFixed(decimals)}%`;
}
