import { CheckCircle, AlertTriangle, X } from "lucide-react";
import { TBGMAP } from "../../constants/theme";

/**
 * Single toast notification item.
 */
export function Toast({ t, onClose }) {
  return (
    <div
      style={{
        background: TBGMAP[t.type] || "#6b7280",
        borderRadius: 12, animation: "slideRight .3s ease",
        display: "flex", alignItems: "center", gap: 12,
        padding: "11px 14px", color: "#fff", fontSize: 12, fontWeight: 500,
        boxShadow: "0 8px 24px rgba(0,0,0,.3)",
        minWidth: 260, maxWidth: 320, lineHeight: 1.45,
      }}
    >
      {t.type === "success" ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
      <span style={{ flex: 1 }}>{t.message}</span>
      <button
        onClick={() => onClose(t.id)}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#fff".7, display: "flex" }}
      >
        <X size={13} />
      </button>
    </div>
  );
}
