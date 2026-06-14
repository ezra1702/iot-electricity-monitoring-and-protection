import { useState, useEffect, useRef, useCallback } from "react";
import { genSensor, nextStatus } from "../data/sensorSimulator";
import { fmtTime } from "../utils/formatters";








export function useSensorData(settings, addToast) {
  const [sensor, setSensor]   = useState(() => genSensor(settings, "normal"));
  const [chartData, setChart] = useState(() =>
    Array.from({ length: 22 }, (_, i) => {
      const d = genSensor(settings);
      return { time: fmtTime(new Date(Date.now() - (21 - i) * 2000)), power: d.power, energy: +(d.energy * 100).toFixed(2) };
    })
  );
  const [history, setHistory] = useState(() => Array.from({ length: 40 }, () => genSensor(settings)));
  const [alerts, setAlerts]   = useState([]);

  const prevSt   = useRef("normal");
  const epId     = useRef(0);
  const dismissed = useRef(new Map());

  useEffect(() => {
    const t = setInterval(() => {
      const st = nextStatus();
      const d  = genSensor(settings, st);

      setSensor(d);
      setChart(p => [...p.slice(-29), { time: fmtTime(new Date()), power: d.power, energy: +(d.energy * 100).toFixed(2) }]);
      setHistory(p => [d, ...p].slice(0, 120));

      const prev = prevSt.current;
      if (st !== "normal") {
        if (prev === "normal") {
          epId.current++;
          setAlerts(p => p.includes(st) ? p : [...p, st]);
          addToast(
            st === "overload" ? "Overload! Arus melebihi batas maksimum." : "Asap terdeteksi! Periksa instalasi.",
            st === "overload" ? "error" : "warning"
          );
        } else if (dismissed.current.get(st) !== epId.current) {
          setAlerts(p => p.includes(st) ? p : [...p, st]);
        }
      } else if (prev !== "normal") {
        setAlerts([]);
        dismissed.current.clear();
      }
      prevSt.current = st;
    }, 2000);

    return () => clearInterval(t);
  }, [settings, addToast]);

  const dismissAlert = useCallback((type) => {
    dismissed.current.set(type, epId.current);
    setAlerts(p => p.filter(a => a !== type));
  }, []);

  return { sensor, chartData, history, alerts, dismissAlert };
}
