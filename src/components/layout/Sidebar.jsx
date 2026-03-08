import { useState } from "react";
import { Zap, Cpu, LayoutDashboard, Settings, Info, ChevronLeft } from "lucide-react";
import { Pill } from "../ui/Pill";
import { STATUS } from "../../constants/theme";

const MENUS = [
  { id: "dashboard", label: "Dashboard",   icon: <LayoutDashboard size={16} /> },
  { id: "settings",  label: "Settings",    icon: <Settings size={16} /> },
  { id: "sysinfo",   label: "System Info", icon: <Info size={16} /> },
];

/**
 * Collapsible sidebar with navigation menu, device info, and watermark.
 */
export function Sidebar({ sbOpen, mobile = false, menu, setMenu, sensor, device, onBack, onMobileClose }) {
  const SB  = "var(--sidebar)";
  const SBB = "var(--bd)";
  const SBT = "var(--t3)";
  const SBH = "var(--hover)";
  const sc  = STATUS[sensor?.status] || STATUS.normal;

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%", background: SB,
      borderRight: `1px solid ${SBB}`,
      width: mobile ? 220 : sbOpen ? 220 : 56,
      transition: "width .3s ease", overflow: "hidden", flexShrink: 0,
      position: "relative",
    }}>
      {/* Watermark */}
      <div style={{ position: "absolute", bottom: -40, left: -50, opacity: 0.03, pointerEvents: "none", zIndex: 0 }}>
        <Cpu size={280} color="var(--t1)" />
      </div>

      {/* Brand header */}
      <div style={{ height: 56, display: "flex", alignItems: "center", gap: 10, padding: "0 16px", borderBottom: `1px solid ${SBB}`, flexShrink: 0, position: "relative", zIndex: 1 }}>
        <div style={{ flexShrink: 0, padding: 8, borderRadius: 12, background: "#f97316" }}><Zap size={16} color="#fff" /></div>
        {(sbOpen || mobile) && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)", lineHeight: 1 }}>IoT Energy</p>
            <p style={{ fontSize: 9.5, color: "var(--t3)", marginTop: 2 }}>Monitor Console</p>
          </div>
        )}
      </div>

      {/* Device info */}
      {(sbOpen || mobile) && (
        <div style={{ margin: "14px 12px 4px", padding: "10px 12px", borderRadius: 12, background: "rgba(249,115,22,.08)", border: "1px solid rgba(249,115,22,.18)", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: sc.dot }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: 0.8 }}>{sc.label}</span>
          </div>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--t1)", lineHeight: 1.3 }}>{device?.name}</p>
          <p className="mono" style={{ fontSize: 10, color: "#f97316", marginTop: 2 }}>{device?.id}</p>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 6, position: "relative", zIndex: 1 }}>
        {MENUS.map(m => {
          const active = menu === m.id;
          return (
            <button key={m.id} onClick={() => { setMenu(m.id); if (mobile) onMobileClose?.(); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: sbOpen || mobile ? "9px 12px" : "9px 0",
                justifyContent: sbOpen || mobile ? "flex-start" : "center",
                borderRadius: 12, border: "none", cursor: "pointer", transition: "all .15s",
                background: active ? "#f97316" : SBH, color: active ? "#fff" : SBT,
                boxShadow: active ? "0 4px 14px rgba(249,115,22,.28)" : undefined,
              }}>
              <span style={{ flexShrink: 0 }}>{m.icon}</span>
              {(sbOpen || mobile) && <span style={{ fontSize: 13, fontWeight: 500 }}>{m.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Back button */}
      {(sbOpen || mobile) && (
        <div style={{ padding: "10px 8px", borderTop: `1px solid ${SBB}`, position: "relative", zIndex: 1 }}>
          <button
            onClick={() => { onBack(); if (mobile) onMobileClose?.(); }}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer", background: "transparent", color: SBT, fontSize: 12, fontWeight: 500, transition: "background .15s" }}
            onMouseEnter={e => e.currentTarget.style.background = SBH}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <ChevronLeft size={14} /> Ganti Perangkat
          </button>
        </div>
      )}
    </div>
  );
}
