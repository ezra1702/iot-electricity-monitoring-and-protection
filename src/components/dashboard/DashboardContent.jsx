import { Zap, Activity, Power, BatteryCharging, Shield } from "lucide-react";
import { Pill } from "../ui/Pill";
import { Card } from "../ui/Card";
import { Gauge } from "../charts/Gauge";
import { ChartTip } from "../charts/ChartTip";
import { MetricCard } from "./MetricCard";
import { CostCard } from "./CostCard";
import { AlertCard } from "./AlertCard";
import { HistoryTable } from "./HistoryTable";
import { STATUS } from "../../constants/theme";
import { fmtDateTime } from "../../utils/formatters";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

/**
 * Main dashboard content — metrics, gauges, chart, and history table.
 */
export function DashboardContent({ sensor, chartData, history, alerts, onDismiss, settings }) {
  const sc = STATUS[sensor.status] || STATUS.normal;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Status bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "var(--t3)" }}>Status Sistem:</span>
          <Pill label={sc.label} dot={sc.dot} bg={sc.bg} color={sc.color} border={sc.border} />
        </div>
        <span className="mono" style={{ fontSize: 11, color: "var(--t4)" }}>{fmtDateTime(sensor.timestamp)}</span>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {alerts.map(t => <AlertCard key={t} type={t} onDismiss={onDismiss} />)}
        </div>
      )}

      {/* Cost cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 16 }}>
        <CostCard isDaily value={sensor.daily_cost} trend={2.4} />
        <CostCard isDaily={false} value={sensor.monthly_cost} trend={-1.8} />
      </div>

      {/* Metric cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 13 }}>
        <MetricCard style={{ flex: "1 1 165px" }} icon={<Zap size={16} />}             label="Voltage"      value={sensor.voltage}      unit="V"   accent="#f97316" barPct={(sensor.voltage / 250) * 100} />
        <MetricCard style={{ flex: "1 1 165px" }} icon={<Activity size={16} />}        label="Current"      value={sensor.current}      unit="A"   accent="#3b82f6" barPct={(sensor.current / (settings.maxCurrent || 10)) * 100} />
        <MetricCard style={{ flex: "1 1 165px" }} icon={<Power size={16} />}           label="Power"        value={sensor.power}        unit="W"   accent="#22c55e" barPct={(sensor.power / 2500) * 100} />
        <MetricCard style={{ flex: "1 1 165px" }} icon={<BatteryCharging size={16} />} label="Energy"       value={sensor.energy}       unit="kWh" accent="#eab308" barPct={(sensor.energy / 0.012) * 100} />
        <MetricCard style={{ flex: "1 1 165px" }} icon={<Shield size={16} />}          label="Power Factor" value={sensor.power_factor} unit="PF"  accent="#a855f7" barPct={sensor.power_factor * 100} />
      </div>

      {/* Gauges + Chart */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}>
        <Card style={{ padding: 24 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--t3)", marginBottom: 20 }}>Analog Meters</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 20, justifyItems: "center" }}>
            <Gauge value={sensor.voltage} max={250} label="Voltage" unit="V" accent="#f97316" />
            <Gauge value={sensor.current} max={settings.maxCurrent || 10} label="Current" unit="A" accent="#3b82f6" />
          </div>
        </Card>

        <Card style={{ padding: 24, minWidth: 0 }}>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--t3)" }}>Consumption Trends</p>
            <p style={{ fontSize: 11, color: "var(--t4)", marginTop: 2 }}>Real-time Power (W) &amp; Energy ×100 (kWh)</p>
          </div>
          <div style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                <defs>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#f97316" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--bd)" strokeDasharray="4 4" />
                <XAxis dataKey="time" tick={{ fill: "var(--t4)", fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "var(--t4)", fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTip />} />
                <Legend formatter={v => <span style={{ color: "var(--t3)", fontSize: 11 }}>{v}</span>} />
                <Area type="monotone" dataKey="power"  name="Power (W)"   stroke="#f97316" strokeWidth={2} fill="url(#gP)" dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="energy" name="Energy ×100" stroke="#3b82f6" strokeWidth={2} fill="url(#gE)" dot={false} strokeDasharray="5 3" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <HistoryTable data={history} />
    </div>
  );
}
