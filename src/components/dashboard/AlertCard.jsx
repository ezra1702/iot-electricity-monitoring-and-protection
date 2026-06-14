import { useState } from "react";
import { AlertTriangle, Flame, X } from "lucide-react";
import { Card } from "../ui/Card";





export function AlertCard({ type, onDismiss }) {
  const [confirm, setConfirm] = useState(false);
  const isOvl = type === "overload";
  const ac = isOvl ? "#ef4444" : "#f59e0b";

  return (
    <>
      <div style={{
        borderRadius: 14, padding: "15px 18px", animation: "fadeDown .3s ease",
        background: isOvl ? "rgba(239,68,68,.08)" : "rgba(245,158,11,.08)",
        border: `1px solid ${isOvl ? "rgba(239,68,68,.3)" : "rgba(245,158,11,.3)"}`,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ padding: 8, borderRadius: 10, background: ac, flexShrink: 0 }}>
            {isOvl ? <AlertTriangle size={16} color="#fff" /> : <Flame size={16} color="#fff" />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: 13.5, color: ac, marginBottom: 4 }}>
              {isOvl ? "Overload Terdeteksi!" : "Asap Terdeteksi!"}
            </p>
            <p style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.6 }}>
              {isOvl
                ? "Arus listrik melebihi batas maksimum. Periksa beban perangkat segera."
                : "Sensor mendeteksi asap di area perangkat. Periksa kondisi fisik instalasi."}
            </p>
          </div>
          <button
            onClick={() => setConfirm(true)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--t3)", flexShrink: 0, display: "flex", padding: 2 }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {confirm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.65)",
          backdropFilter: "blur(5px)", zIndex: 9999, display: "flex",
          alignItems: "center", justifyContent: "center", padding: 16, animation: "fadeIn .2s ease",
        }}>
          <Card style={{ width: "100%", maxWidth: 380, padding: 28, animation: "fadeDown .25s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ padding: 8, borderRadius: 10, background: "rgba(245,158,11,.15)" }}>
                <AlertTriangle size={20} color="#f59e0b" />
              </div>
              <p style={{ fontWeight: 700, fontSize: 15, color: "var(--t1)" }}>Konfirmasi</p>
            </div>
            <p style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.65, marginBottom: 22 }}>
              Apakah Anda sudah mengecek kondisi{" "}
              <strong style={{ color: "var(--t1)" }}>{isOvl ? "overload" : "asap"}</strong>{" "}
              dan memastikan situasi sudah aman?
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirm(false)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "var(--input)", border: "1px solid var(--bd)", color: "var(--t2)" }}
              >Belum</button>
              <button
                onClick={() => { setConfirm(false); onDismiss(type); }}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", background: "#f97316", border: "none", color: "#fff" }}
              >Ya, Tutup</button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
