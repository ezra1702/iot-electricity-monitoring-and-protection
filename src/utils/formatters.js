




export const Rp = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);






export const fmtTime = (d) => d.toLocaleTimeString("id-ID", { hour12: false });






export const fmtDate = (d) =>
  d.toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });






export const fmtDateTime = (d) =>
  d.toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });







export const clamp = (mn, mx) => `clamp(${mn}px, 4vw, ${mx}px)`;
