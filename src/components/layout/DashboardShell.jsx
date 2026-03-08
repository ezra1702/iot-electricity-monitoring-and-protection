import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { DashboardContent } from "../dashboard/DashboardContent";
import { ProfileSettingsPage } from "../../pages/ProfileSettingsPage";
import { SystemInfoPage } from "../../pages/SystemInfoPage";
import { useSensorData } from "../../hooks/useSensorData";

/**
 * Main dashboard shell — wires together sidebar, topbar, content area,
 * sensor data hook, and settings state.
 */
export function DashboardShell({ device, darkMode, toggleDark, user, onUpdateUser, onBack, addToast }) {
  const [sbOpen, setSbOpen]       = useState(true);
  const [mobileOpen, setMobile]   = useState(false);
  const [menu, setMenu]           = useState("dashboard");
  const [profileOpen, setProf]    = useState(false);
  const [now, setNow]             = useState(new Date());
  const [settings, setSettings]   = useState({ tariff: 1444, maxCurrent: 10 });

  const { sensor, chartData, history, alerts, dismissAlert } = useSensorData(settings, addToast);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      <style>{`
        .sb-desktop { display:flex!important } .btn-mobile { display:none!important }
        .btn-desk   { display:flex!important } .hide-sm    { display:flex!important }
        @media(max-width:768px){
          .sb-desktop { display:none!important }  .btn-mobile { display:flex!important }
          .btn-desk   { display:none!important }  .hide-sm    { display:none!important }
        }
      `}</style>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={() => setMobile(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 190, backdropFilter: "blur(3px)", animation: "fadeIn .2s ease" }} />
      )}
      {mobileOpen && (
        <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 220, zIndex: 200, animation: "fadeDown .2s ease" }}>
          <Sidebar mobile sbOpen={sbOpen} menu={menu} setMenu={setMenu} sensor={sensor} device={device} onBack={onBack} onMobileClose={() => setMobile(false)} />
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="sb-desktop">
        <Sidebar sbOpen={sbOpen} menu={menu} setMenu={setMenu} sensor={sensor} device={device} onBack={onBack} />
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <Topbar
          menu={menu} setMenu={setMenu}
          sensor={sensor} device={device}
          now={now} darkMode={darkMode} toggleDark={toggleDark}
          user={user}
          mobileOpen={mobileOpen} setMobile={setMobile}
          sbOpen={sbOpen} setSbOpen={setSbOpen}
          profileOpen={profileOpen} setProf={setProf}
        />

        <main style={{ flex: 1, overflowY: "auto", padding: "20px 20px 36px" }}>
          {menu === "dashboard" && (
            <DashboardContent sensor={sensor} chartData={chartData} history={history} alerts={alerts} onDismiss={dismissAlert} settings={settings} />
          )}
          {menu === "settings" && (
            <ProfileSettingsPage settings={settings} onSave={setSettings} user={user} onUpdateUser={onUpdateUser} addToast={addToast} />
          )}
          {menu === "sysinfo" && (
            <SystemInfoPage device={device} />
          )}
        </main>
      </div>
    </div>
  );
}
