import { useMemo } from 'react'
import ReactApexChart from 'react-apexcharts'

const CHART_OPTIONS = (categories) => ({
  chart: { type: 'area', background: 'transparent', toolbar: { show: false }, sparkline: { enabled: false }, animations: { enabled: true, easing: 'easeinout', speed: 600, dynamicAnimation: { enabled: true, speed: 500 } } },
  colors: ['#38BDF8', '#22D3EE'],
  fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.01, stops: [0, 100] } },
  stroke: { curve: 'smooth', width: 2 },
  grid: { borderColor: 'rgba(255,255,255,0.04)', strokeDashArray: 4, xaxis: { lines: { show: false } } },
  xaxis: {
    categories,
    labels: { style: { colors: '#475569', fontSize: '10px' }, rotate: 0 },
    axisBorder: { show: false }, axisTicks: { show: false },
    tickAmount: 6,
  },
  yaxis: [
    { labels: { style: { colors: '#475569', fontSize: '10px' }, formatter: v => v.toFixed(0) + 'V' } },
    { opposite: true, labels: { style: { colors: '#22D3EE', fontSize: '10px' }, formatter: v => v.toFixed(1) + 'A' } },
  ],
  tooltip: { theme: 'dark', shared: true, intersect: false },
  legend: { labels: { colors: '#94A3B8' }, fontSize: '11px' },
  dataLabels: { enabled: false },
  markers: { size: 0 },
})

export default function VoltageLineChart({ logs = [] }) {
  // Ambil maksimal 15 data terakhir dan balikkan agar urutannya kronologis (kiri ke kanan)
  const chartData = useMemo(() => {
    return [...logs].reverse().slice(-15)
  }, [logs])

  const categories = chartData.map(d => d.time || '')
  const series = [
    { name: 'Voltage (V)', data: chartData.map(d => parseFloat(d.voltage) || 0) },
    { name: 'Current (A)', data: chartData.map(d => parseFloat(d.current) || 0), yAxisIndex: 1 },
  ]

  return <ReactApexChart type="area" series={series} options={CHART_OPTIONS(categories)} height={220} />
}
