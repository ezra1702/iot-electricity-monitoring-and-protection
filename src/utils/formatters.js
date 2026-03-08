/**
 * Format number as Indonesian Rupiah currency.
 * @param {number} n
 * @returns {string}
 */
export const Rp = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

/**
 * Format Date to time string HH:MM:SS (24h, id-ID locale).
 * @param {Date} d
 * @returns {string}
 */
export const fmtTime = (d) => d.toLocaleTimeString("id-ID", { hour12: false });

/**
 * Format Date to short date string (id-ID locale).
 * @param {Date} d
 * @returns {string}
 */
export const fmtDate = (d) =>
  d.toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

/**
 * Format Date to full datetime string (id-ID locale).
 * @param {Date} d
 * @returns {string}
 */
export const fmtDateTime = (d) =>
  d.toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

/**
 * CSS clamp() helper for responsive font/size.
 * @param {number} mn - min px
 * @param {number} mx - max px
 * @returns {string}
 */
export const clamp = (mn, mx) => `clamp(${mn}px, 4vw, ${mx}px)`;
