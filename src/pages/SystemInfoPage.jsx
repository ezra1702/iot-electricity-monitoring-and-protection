import { Card } from "../components/ui/Card";

/**
 * System info page — displays ESP32 hardware details,
 * sensor input table, and output system table.
 */
export function SystemInfoPage({ device }) {
  const inputs = [
    [1, "Analog",   "Voltage AC",   "ZMPT101B", "Mengukur tegangan RMS jaringan PLN"],
    [2, "Analog",   "Arus Beban",   "SCT-013",  "Mengukur arus AC menggunakan CT sensor"],
    [3, "Digital",  "Deteksi Asap", "MQ-2",     "Mendeteksi gas/asap berbahaya di area"],
    [4, "Computed", "Daya Aktif (W)", "V × I × PF", "Kalkulasi konsumsi daya nyata"],
    [5, "Computed", "Energi (kWh)",  "∫P dt",   "Akumulasi konsumsi energi per satuan waktu"],
  ];
  const outputs = [
    [1, "MQTT Publish", "Kirim payload JSON ke broker setiap 2 detik"],
    [2, "LCD 16×2 I2C", "Tampilkan V, I, P secara real-time pada layar"],
    [3, "LED RGB",      "Hijau = Normal · Merah = Overload · Kuning = Asap"],
    [4, "Buzzer",       "Alarm akustik saat overload atau asap terdeteksi"],
    [5, "REST API",     "Endpoint HTTP GET/POST untuk data historis"],
  ];

  const TH = ({ ch }) => (
    <th style={{ padding: "11px 16px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.9, color: "var(--t3)", textAlign: "left", background: "var(--card2)", borderBottom: "1px solid var(--bd)", whiteSpace: "nowrap" }}>{ch}</th>
  );

  const SysTable = ({ title, heads, rows }) => (
    <Card>
      <div style={{ padding: "15px 20px", borderBottom: "1px solid var(--bd)" }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--t3)" }}>{title}</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{heads.map(h => <TH key={h} ch={h} />)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? "var(--stripe)" : undefined }}>
                {r.map((cell, ci) => (
                  <td key={ci} style={{ padding: "10px 16px", fontSize: 12, color: "var(--t2)", borderBottom: "1px solid var(--bd)" }}>
                    {ci === 0
                      ? <span style={{ fontWeight: 700, color: "var(--t3)" }}>{cell}</span>
                      : ci === 1
                        ? <span className="mono" style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: "var(--input)", border: "1px solid var(--bdinput)", color: "#f97316" }}>{cell}</span>
                        : <span>{cell}</span>
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--t1)", marginBottom: 4 }}>Informasi Sistem</h3>
        <p style={{ fontSize: 13, color: "var(--t3)" }}>Detail hardware dan topologi perangkat ESP32</p>
      </div>

      {/* Device info card */}
      <Card style={{ padding: 24 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--t3)", marginBottom: 16 }}>Info Perangkat</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(155px,1fr))", gap: 16 }}>
          {[
            ["Device ID",  device?.id],
            ["Firmware",   device?.fw || "v2.1.4"],
            ["Lokasi",     device?.location],
            ["Protocol",   "MQTT / HTTP"],
            ["Broker",     "mqtt.example.io:1883"],
            ["Topic",      "iot/energy-monitor/data"],
          ].map(([k, v]) => (
            <div key={k}>
              <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--t4)", marginBottom: 4 }}>{k}</p>
              <p className="mono" style={{ fontSize: 12, fontWeight: 600, color: "#f97316", wordBreak: "break-all" }}>{v}</p>
            </div>
          ))}
        </div>
      </Card>

      <SysTable title="Tabel Input Sensor" heads={["No", "Jenis Input", "Parameter", "Sumber", "Fungsi"]} rows={inputs} />
      <SysTable title="Tabel Output Sistem" heads={["No", "Jenis Output", "Keterangan"]} rows={outputs} />
    </div>
  );
}
