import { Card } from "../ui/Card";




export function MetricCard({ icon, label, value, unit, accent, barPct, style }) {
  return (
    <Card style={{ padding: "24px 22px", ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ color: accent }}>{icon}</span>
        <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--t3)" }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 20 }}>
        <span className="mono" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, color: "var(--t1)" }}>{value}</span>
        <span style={{ fontSize: 12, color: "var(--t3)" }}>{unit}</span>
      </div>
      <div style={{ height: 3, borderRadius: 99, background: "var(--gtrack)" }}>
        <div style={{ height: "100%", borderRadius: 99, background: accent, width: `${Math.min(100, Math.max(0, barPct || 0))}%`, transition: "width .8s ease" }} />
      </div>
    </Card>
  );
}
