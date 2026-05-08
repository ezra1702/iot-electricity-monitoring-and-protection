import ReactApexChart from 'react-apexcharts'
import { RADAR_MAX } from '../../utils/mockData'

export default function PowerRadarChart({ voltage = 228, current = 3.8, power = 840, powerFactor = 0.93, frequency = 50, energy = 4.2 }) {
  const normalized = [
    ((voltage  - 180) / (RADAR_MAX.voltage - 180)) * 100,
    (current   / RADAR_MAX.current)      * 100,
    (power     / RADAR_MAX.power)        * 100,
    powerFactor * 100,
    ((frequency - 48) / 4)               * 100,
    (energy    / RADAR_MAX.energy)       * 100,
  ].map(v => Math.min(100, Math.max(0, +v.toFixed(1))))

  const options = {
    chart: { type: 'radar', background: 'transparent', toolbar: { show: false }, animations: { enabled: true, easing: 'easeinout', speed: 700 } },
    colors: ['#38BDF8'],
    fill:   { opacity: 0.18 },
    stroke: { width: 2, colors: ['#38BDF8'], dashArray: 0 },
    markers: { size: 4, colors: ['#020617'], strokeColors: '#38BDF8', strokeWidth: 2 },
    xaxis: {
      categories: ['Voltage', 'Current', 'Power', 'Power Factor', 'Frequency', 'Energy'],
      labels: { style: { colors: Array(6).fill('#94A3B8'), fontSize: '10px', fontWeight: 500 } },
    },
    yaxis: { show: false, min: 0, max: 100 },
    grid: { show: false },
    plotOptions: {
      radar: {
        polygons: {
          strokeColors: 'rgba(255,255,255,0.06)',
          fill: { colors: ['rgba(15,23,42,0.6)', 'rgba(30,41,59,0.4)'] },
        },
      },
    },
    tooltip: {
      theme: 'dark',
      y: { formatter: v => `${v.toFixed(1)}%` },
    },
    dataLabels: { enabled: false },
  }

  return (
    <ReactApexChart
      type="radar"
      series={[{ name: 'Nilai Sensor', data: normalized }]}
      options={options}
      height={230}
    />
  )
}
