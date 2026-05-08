import { useEffect, useRef } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { countUp, hoverLift, hoverReset } from '../../utils/animations'

export default function MetricCard({ label, value, unit, icon: Icon, accent = '#38BDF8', trend, decimals = 1 }) {
  const valRef  = useRef(null)
  const cardRef = useRef(null)
  const prevVal = useRef(0)

  useEffect(() => {
    const target = parseFloat(value) || 0
    if (Math.abs(target - prevVal.current) > 0.001) {
      countUp(valRef.current, target, { duration: 900, decimals })
      prevVal.current = target
    }
  }, [value, decimals])

  return (
    <div
      ref={cardRef}
      className="a-metric glass-card"
      style={{ padding: '1rem', cursor: 'default', transition: 'transform 0.2s, box-shadow 0.2s' }}
      onMouseEnter={() => hoverLift(cardRef.current)}
      onMouseLeave={() => hoverReset(cardRef.current)}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color={accent} />
        </div>
        {trend !== undefined && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: trend >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: trend >= 0 ? '#22C55E' : '#EF4444' }}>
            {trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>

      {/* Value */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 4 }}>
        <span ref={valRef} style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', lineHeight: 1, fontFamily: 'monospace' }}>
          {(+value).toFixed(decimals)}
        </span>
        <span style={{ fontSize: 12, color: accent, fontWeight: 600, marginBottom: 2 }}>{unit}</span>
      </div>

      <p style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{label}</p>

      {/* Bottom accent bar */}
      <div style={{ height: 2, borderRadius: 2, background: `linear-gradient(90deg, ${accent}, transparent)`, marginTop: 12, opacity: 0.4 }} />
    </div>
  )
}
