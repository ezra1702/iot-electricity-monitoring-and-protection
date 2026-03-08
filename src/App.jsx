import { useState } from "react";
import { DEVICES } from "./constants/devices";
import { LoginPage } from "./pages/LoginPage";
import { DeviceListPage } from "./pages/DeviceListPage";
import { DashboardShell } from "./components/layout/DashboardShell";
import { Toast } from "./components/ui/Toast";
import { useToast } from "./hooks/useToast";

/**
 * Root application component.
 * Manages top-level state: auth, theme (dark/light), selected device, and toasts.
 */
export default function App() {
  const [page, setPage]     = useState("login");
  const [dark, setDark]     = useState(true);
  const [device, setDevice] = useState(null);
  const [user, setUser]     = useState({ name: "Alex Thompson", email: "alex@iot.dev", photo: null });

  const { toasts, addToast, removeToast } = useToast();

  const handleLogin  = (email) => { setUser(u => ({ ...u, email })); setPage("devices"); };
  const handleSelect = (dev)   => { setDevice(dev); setPage("dashboard"); };

  return (
    <>
      <div data-theme={dark ? "dark" : "light"} style={{ minHeight: "100vh" }}>
        {/* Toast container */}
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
          {toasts.map(t => (
            <div key={t.id} style={{ pointerEvents: "all" }}>
              <Toast t={t} onClose={removeToast} />
            </div>
          ))}
        </div>

        {page === "login"     && <LoginPage onLogin={handleLogin} />}
        {page === "devices"   && <DeviceListPage devices={DEVICES} onSelect={handleSelect} user={user} />}
        {page === "dashboard" && (
          <DashboardShell
            device={device}
            darkMode={dark}
            toggleDark={() => setDark(d => !d)}
            user={user}
            onUpdateUser={setUser}
            onBack={() => setPage("devices")}
            addToast={addToast}
          />
        )}
      </div>
    </>
  );
}