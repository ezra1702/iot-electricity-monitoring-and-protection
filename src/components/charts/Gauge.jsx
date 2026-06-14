


export function Gauge({ value, max, label, unit, accent = "#f97316" }) {
  const pct = Math.min(1, Math.max(0, value / max));
  const color = pct < 0.6 ? accent : pct < 0.85 ? "#f59e0b" : "#ef4444";
  const R = 60, cx = 75, cy = 75, arcLen = Math.PI * R;
  const trackD = `M${cx - R},${cy} A${R},${R} 0 0 1 ${cx + R},${cy}`;
  const filled = arcLen * pct, empty = arcLen * (1 - pct);
  const nr = (-180 + pct * 180) * Math.PI / 180;
  const nx = cx + (R - 10) * Math.cos(nr), ny = cy + (R - 10) * Math.sin(nr);

  const ticks = Array.from({ length: 9 }, (_, i) => {
    const a = -Math.PI + (i / 8) * Math.PI, r0 = R + 3, r1 = i % 4 === 0 ? R + 11 : R + 7;
    return { x0: cx + r0 * Math.cos(a), y0: cy + r0 * Math.sin(a), x1: cx + r1 * Math.cos(a), y1: cy + r1 * Math.sin(a), major: i % 4 === 0 };
  });

  const axLabels = [[0, 0], [0.5, max / 2], [1, max]].map(([p, v]) => {
    const a = -Math.PI + p * Math.PI;
    return { x: cx + (R + 20) * Math.cos(a), y: cy + (R + 20) * Math.sin(a) + 3, v };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", width: 150, height: 92 }}>
        <svg width="150" height="92" viewBox="0 0 150 92" style={{ overflow: "visible" }}>
          <defs>
            <filter id={`gl${label}`}>
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <path d={trackD} fill="none" stroke="var(--gtrack)" strokeWidth="9" strokeLinecap="round" />
          <path d={trackD} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={`${filled} ${empty}`} filter={`url(#gl${label})`}
            style={{ transition: "stroke-dasharray .7s ease,stroke .35s ease" }} />
          {ticks.map((tk, i) => (
            <line key={i} x1={tk.x0} y1={tk.y0} x2={tk.x1} y2={tk.y1}
              stroke={tk.major ? "var(--t3)" : "var(--gtrack)"}
              strokeWidth={tk.major ? 1.5 : 1} strokeLinecap="round" />
          ))}
          {axLabels.map((lb, i) => (
            <text key={i} x={lb.x} y={lb.y} textAnchor="middle"
              fontSize="8" fill="var(--t4)" fontFamily="'IBM Plex Mono',monospace">{lb.v}</text>
          ))}
          <circle cx={cx} cy={cy} r={5} fill={color} style={{ transition: "fill .35s" }} />
          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="2.5" strokeLinecap="round"
            style={{ transition: "x2 .7s ease,y2 .7s ease" }} />
          <circle cx={cx} cy={cy} r={2.5} fill="var(--card)" />
        </svg>
        <div style={{ position: "absolute", bottom: -15, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "flex-end" }}>
          <span className="mono" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color, transition: "color .35s" }}>{value}</span>
        </div>
      </div>
      <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.1, color: "var(--t3)", marginTop: 22 }}>
        {label} <span style={{ color: "var(--t4)" }}>({unit})</span>
      </p>
      <div style={{ width: 120, height: 3, borderRadius: 99, background: "var(--gtrack)", marginTop: 8, overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 99, background: color, width: `${pct * 100}%`, transition: "width .7s ease,background .35s ease" }} />
      </div>
    </div>
  );
}
