


export function Pill({ label, dot, bg, color, border }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "3px 10px", borderRadius: 99, fontSize: 9.5, fontWeight: 700,
        letterSpacing: 0.8, textTransform: "uppercase",
        background: bg, color, border: `1px solid ${border}`,
      }}
    >
      {dot && <span style={{ width: 5, height: 5, borderRadius: "50%", background: dot, flexShrink: 0 }} />}
      {label}
    </span>
  );
}
