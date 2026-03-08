/**
 * Status configuration map for sensor states.
 */
export const STATUS = {
  normal:   { dot: "#22c55e", bg: "rgba(34,197,94,.1)",  border: "rgba(34,197,94,.3)",  color: "#4ade80", label: "Normal"        },
  overload: { dot: "#ef4444", bg: "rgba(239,68,68,.1)",  border: "rgba(239,68,68,.3)",  color: "#f87171", label: "Overload"      },
  smoke:    { dot: "#f59e0b", bg: "rgba(245,158,11,.1)", border: "rgba(245,158,11,.3)", color: "#fbbf24", label: "Smoke Detected" },
};

/**
 * Toast background color map by type.
 */
export const TBGMAP = {
  error:   "#ef4444",
  warning: "#f59e0b",
  success: "#22c55e",
  info:    "#3b82f6",
};
