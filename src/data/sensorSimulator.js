/**
 * Sensor data simulator — mimics MQTT data from ESP32.
 * Cycles through: normal → overload/smoke → normal with random timing.
 */

const _ds = { s: "normal", n: 0, t: 22 };

/**
 * Advance the internal state machine and return the current status.
 * @returns {"normal" | "overload" | "smoke"}
 */
export const nextStatus = () => {
  _ds.n++;
  if (_ds.n >= _ds.t) {
    _ds.s = _ds.s === "normal"
      ? (Math.random() < 0.65 ? "overload" : "smoke")
      : "normal";
    _ds.n = 0;
    _ds.t = _ds.s === "normal" ? 18 + ~~(Math.random() * 18) : 4 + ~~(Math.random() * 5);
  }
  return _ds.s;
};

/**
 * Generate a realistic sensor data object.
 * @param {{ tariff?: number, maxCurrent?: number }} cfg - system settings
 * @param {"normal" | "overload" | "smoke"} [status] - force a status
 * @returns {object}
 */
export const genSensor = (cfg = {}, status) => {
  const tariff  = cfg.tariff      || 1444;
  const maxA    = cfg.maxCurrent  || 10;
  const s       = status          || "normal";

  const v   = 210 + Math.random() * 25;
  const i   = s === "overload" ? maxA * (1.1 + Math.random() * 0.45) : 0.4 + Math.random() * maxA * 0.6;
  const pf  = Math.min(0.99, 0.85 + Math.random() * 0.13);
  const p   = v * i * pf;
  const e   = 0.001 + Math.random() * 0.006;
  const dc  = ~~(e * 24 * tariff);

  return {
    voltage:      +v.toFixed(1),
    current:      +i.toFixed(2),
    power:        +p.toFixed(0),
    energy:       +e.toFixed(4),
    power_factor: +pf.toFixed(2),
    daily_cost:   dc,
    monthly_cost: dc * 30,
    status:       s,
    timestamp:    new Date(),
  };
};
