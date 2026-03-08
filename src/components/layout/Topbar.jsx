import { Clock, Menu, Moon, Sun, ChevronDown, Settings, LogOut, LayoutDashboard, Info } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { Pill } from "../ui/Pill";
import { STATUS } from "../../constants/theme";
import { fmtTime, fmtDate } from "../../utils/formatters";

const MENUS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "settings",  label: "Settings"  },
  { id: "sysinfo",   label: "System Info" },
];

/**
 * Top navigation bar with clock, status pill, dark mode toggle, and profile dropdown.
 */
export function Topbar({ menu, setMenu, sensor, device, now, darkMode, toggleDark, user, mobileOpen, setMobile, sbOpen, setSbOpen, profileOpen, setProf }) {
  const sc = STATUS[sensor?.status] || STATUS.normal;

  return (
    <header style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", background: "var(--topbar)", borderBottom: "1px solid var(--bd)", flexShrink: 0, zIndex: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button className="btn-mobile" onClick={() => setMobile(!mobileOpen)}
          style={{ padding: 7, borderRadius: 9, background: "var(--input)", border: "1px solid var(--bd)", cursor: "pointer", color: "var(--t2)", alignItems: "center", justifyContent: "center" }}>
          <Menu size={17} />
        </button>
        <button className="btn-desk" onClick={() => setSbOpen(!sbOpen)}
          style={{ padding: 7, borderRadius: 9, background: "var(--input)", border: "1px solid var(--bd)", cursor: "pointer", color: "var(--t2)", alignItems: "center", justifyContent: "center" }}>
          <Menu size={17} />
        </button>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--t1)", lineHeight: 1 }}>
            {MENUS.find(m => m.id === menu)?.label}
          </p>
          <p style={{ fontSize: 10, color: "var(--t3)", marginTop: 2 }}>{device?.id} · {device?.location}</p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        {/* Clock */}
        <div className="hide-sm" style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8, background: "var(--input)", border: "1px solid var(--bd)" }}>
          <Clock size={11} color="var(--t3)" style={{ marginRight: 4 }} />
          <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: "var(--t2)" }}>{fmtTime(now)}</span>
          <span style={{ fontSize: 10, color: "var(--t4)", marginLeft: 6 }}>{fmtDate(now)}</span>
        </div>

        {/* Status pill */}
        <div className="hide-sm">
          <Pill label={sc.label} dot={sc.dot} bg={sc.bg} color={sc.color} border={sc.border} />
        </div>

        {/* Dark mode toggle */}
        <button onClick={toggleDark} style={{ padding: 7, borderRadius: 9, background: "var(--input)", border: "1px solid var(--bd)", cursor: "pointer", color: "var(--t2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {darkMode ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Profile dropdown */}
        <div style={{ position: "relative" }}>
          <button onClick={() => setProf(!profileOpen)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", borderRadius: 10, background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}>
            <Avatar user={user} size={30} radius={9} fontSize={13} />
            <ChevronDown size={12} color="var(--t3)" />
          </button>

          {profileOpen && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setProf(false)} />
              <div style={{ position: "absolute", right: 0, top: 44, width: 230, background: "var(--card)", border: "1px solid var(--bd)", borderRadius: 16, zIndex: 50, boxShadow: "var(--shadow)", overflow: "hidden", animation: "fadeDown .2s ease" }}>
                {/* User header */}
                <div style={{ padding: "16px", borderBottom: "1px solid var(--bd)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar user={user} size={44} radius={13} fontSize={18} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name}</p>
                      <p style={{ fontSize: 10, color: "var(--t3)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email || "admin@iot.dev"}</p>
                      <span style={{ display: "inline-block", marginTop: 5, padding: "2px 8px", borderRadius: 99, fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, background: "rgba(249,115,22,.12)", color: "#f97316", border: "1px solid rgba(249,115,22,.25)" }}>{user?.email}</span>
                    </div>
                  </div>
                </div>

                {/* Settings link */}
                <button onClick={() => { setMenu("settings"); setProf(false); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", background: "none", border: "none", textAlign: "left", transition: "background .13s", color: "var(--t2)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <Settings size={14} /> Setting
                </button>

                <div style={{ height: 1, background: "var(--bd)", margin: "0 12px" }} />

                {/* Logout */}
                <button style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", background: "none", border: "none", textAlign: "left", transition: "background .13s", color: "#f87171" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,.06)"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <LogOut size={14} /> Keluar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
