import { TrendingUp, TrendingDown, Wallet, CalendarDays } from "lucide-react";
import { Rp, clamp } from "../../utils/formatters";




export function CostCard({ isDaily, value, trend }) {
  return (
    <div style={{
      borderRadius: 18, padding: "50px 28px", position: "relative", overflow: "hidden",
      background: isDaily ? "linear-gradient(135deg,#f97316 0%,#c2410c 100%)" : "var(--card)",
      border: isDaily ? "none" : "1px solid var(--bd)",
      boxShadow: isDaily ? "var(--shadowcost)" : "var(--shadow)",
    }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
          {isDaily ? <Wallet size={13} color="rgba(255,255,255,.8)" /> : <CalendarDays size={13} color="#f97316" />}
          <span style={{
            fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.1,
            color: isDaily ? "rgba(255,255,255,.8)" : "var(--t3)",
          }}>Estimasi Biaya {isDaily ? "Harian" : "Bulanan"}</span>
        </div>
        <div className="mono" style={{
          fontSize: clamp(24, 28), fontWeight: 700, lineHeight: 1.15,
          color: isDaily ? "#fff" : "#f97316", marginBottom: 14, wordBreak: "break-all",
        }}>
          {Rp(value)}
        </div>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700,
          padding: "4px 12px", borderRadius: 99,
          background: isDaily ? "rgba(255,255,255,.2)" : "rgba(249,115,22,.1)",
          color: isDaily ? "#fff" : "#f97316",
        }}>
          {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {trend >= 0 ? "+" : ""}{trend}% vs kemarin
        </span>
      </div>
      <div style={{ position: "absolute", right: -16, bottom: -16, opacity: 0.07 }}>
        {isDaily ? <Wallet size={130} color="#fff" /> : <CalendarDays size={130} color="#f97316" />}
      </div>
    </div>
  );
}
