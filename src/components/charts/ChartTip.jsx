


export function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--bd)", borderRadius: 10, padding: "9px 13px", fontSize: 11 }}>
      <p className="mono" style={{ color: "var(--t3)", marginBottom: 5 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontWeight: 700, color: p.color, marginBottom: 1 }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
}
