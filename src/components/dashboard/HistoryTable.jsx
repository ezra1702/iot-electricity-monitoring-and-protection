import { useState } from "react";
import { Download, Search } from "lucide-react";
import { Card } from "../ui/Card";
import { fmtDateTime } from "../../utils/formatters";

const statusBadge = (s) => ({
  normal:   { bg: "rgba(34,197,94,.1)",  color: "#4ade80", border: "rgba(34,197,94,.28)"  },
  overload: { bg: "rgba(239,68,68,.1)",  color: "#f87171", border: "rgba(239,68,68,.28)"  },
  smoke:    { bg: "rgba(245,158,11,.1)", color: "#fbbf24", border: "rgba(245,158,11,.28)" },
}[s] || { bg: "var(--input)", color: "var(--t3)", border: "var(--bd)" });




export function HistoryTable({ data }) {
  const [q, setQ]       = useState("");
  const [page, setPage] = useState(1);
  const [pp, setPp]     = useState(5);

  const filtered = data.filter(r => r.status.includes(q.toLowerCase()) || fmtDateTime(r.timestamp).includes(q));
  const total    = Math.max(1, Math.ceil(filtered.length / pp));
  const rows     = filtered.slice((page - 1) * pp, page * pp);

  const downloadCSV = () => {
    if (!filtered.length) return;
    const headers  = ["Timestamp", "Voltage (V)", "Current (A)", "Power (W)", "Energy (kWh)", "Power Factor", "Status"];
    const csvRows  = filtered.map(r => [
      `"${fmtDateTime(r.timestamp)}"`, r.voltage, r.current, r.power, r.energy, r.power_factor, r.status,
    ].join(","));
    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Data_Sensor_IoT_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLS = ["Timestamp", "Voltage (V)", "Current (A)", "Power (W)", "Energy (kWh)", "Power Factor", "Status"];

  return (
    <Card>
      {}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--bd)", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--t3)" }}>Riwayat Monitoring</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button onClick={downloadCSV}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", background: "#10b981", border: "none", color: "#fff", boxShadow: "0 2px 8px rgba(16,185,129,.25)" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <Download size={13} /> Ekspor CSV
          </button>
          <select value={pp} onChange={e => { setPp(+e.target.value); setPage(1); }}
            style={{ fontSize: 11, padding: "5px 10px", borderRadius: 8, cursor: "pointer", background: "var(--input)", border: "1px solid var(--bdinput)", color: "var(--t1)", outline: "none" }}>
            {[5, 10, 25].map(n => <option key={n} value={n}>Tampilkan {n}</option>)}
          </select>
          <div style={{ position: "relative" }}>
            <Search size={12} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--t3)", pointerEvents: "none" }} />
            <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Cari..."
              style={{ fontSize: 11, padding: "5px 10px 5px 28px", borderRadius: 8, width: 150, background: "var(--input)", border: "1px solid var(--bdinput)", color: "var(--t1)", outline: "none" }} />
          </div>
        </div>
      </div>

      {}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--card2)" }}>
              {COLS.map(h => (
                <th key={h} style={{ padding: "11px 16px", fontSize: 9.5, fontWeight: 700, textAlign: "left", textTransform: "uppercase", letterSpacing: 0.9, color: "var(--t3)", borderBottom: "1px solid var(--bd)", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0
              ? <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", fontSize: 13, color: "var(--t3)", borderBottom: "1px solid var(--bd)" }}>Tidak ada data</td></tr>
              : rows.map((r, i) => {
                  const b = statusBadge(r.status);
                  return (
                    <tr key={i} style={{ background: i % 2 === 1 ? "var(--stripe)" : undefined }}>
                      <td className="mono" style={{ padding: "10px 16px", fontSize: 11, color: "var(--t2)", borderBottom: "1px solid var(--bd)", whiteSpace: "nowrap" }}>{fmtDateTime(r.timestamp)}</td>
                      {[r.voltage, r.current, r.power, r.energy, r.power_factor].map((v, j) => (
                        <td key={j} style={{ padding: "10px 16px", fontSize: 12, fontWeight: 600, color: "var(--t1)", borderBottom: "1px solid var(--bd)" }}>{v}</td>
                      ))}
                      <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--bd)" }}>
                        <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 99, fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", background: b.bg, color: b.color, border: `1px solid ${b.border}` }}>{r.status}</span>
                      </td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
      </div>

      {}
      <div style={{ padding: "12px 20px", borderTop: "1px solid var(--bd)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 11, color: "var(--t3)" }}>
          {filtered.length === 0 ? 0 : (page - 1) * pp + 1}–{Math.min(page * pp, filtered.length)} dari {filtered.length}
        </span>
        <div style={{ display: "flex", gap: 3 }}>
          {[
            { l: "←", fn: () => setPage(p => Math.max(1, p - 1)), dis: page === 1 },
            ...Array.from({ length: Math.min(5, total) }, (_, i) => ({ l: String(i + 1), fn: () => setPage(i + 1), act: page === i + 1 })),
            { l: "→", fn: () => setPage(p => Math.min(total, p + 1)), dis: page === total },
          ].map((b, i) => (
            <button key={i} onClick={b.fn} disabled={b.dis}
              style={{ padding: "4px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: b.dis ? "not-allowed" : "pointer", opacity: b.dis ? 0.35 : 1, transition: "all .15s", background: b.act ? "#f97316" : "var(--input)", border: `1px solid ${b.act ? "#f97316" : "var(--bdinput)"}`, color: b.act ? "#fff" : "var(--t2)" }}>
              {b.l}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
