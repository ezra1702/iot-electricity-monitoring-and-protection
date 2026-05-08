import ReactApexChart from 'react-apexcharts'
import { genEnergyHistory } from '../../utils/mockData'

export default function EnergyBarChart({ days = 14 }) {
  const data = genEnergyHistory(days)

  const options = {
    chart: { type: 'bar', background: 'transparent', toolbar: { show: false }, animations: { enabled: true, easing: 'easeinout', speed: 700 } },
    colors: ['#38BDF8'],
    fill: {
      type: 'gradient',
      gradient: { shade: 'dark', type: 'vertical', gradientToColors: ['#22D3EE'], shadeIntensity: 0.4, stops: [0, 100] },
    },
    plotOptions: {
      bar: { borderRadius: 5, columnWidth: '55%', dataLabels: { position: 'top' } },
    },
    dataLabels: { enabled: false },
    grid: { borderColor: 'rgba(255,255,255,0.04)', strokeDashArray: 4, xaxis: { lines: { show: false } } },
    xaxis: {
      categories: data.map(d => d.date),
      labels: { style: { colors: '#475569', fontSize: '9px' }, rotate: -35 },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: '#475569', fontSize: '10px' }, formatter: v => v.toFixed(1) + ' kWh' },
    },
    tooltip: {
      theme: 'dark',
      y: { formatter: (v, { dataPointIndex }) => `${v} kWh  (Rp ${data[dataPointIndex].cost.toLocaleString('id-ID')})` },
    },
  }

  return (
    <ReactApexChart
      type="bar"
      series={[{ name: 'Energi (kWh)', data: data.map(d => d.kwh) }]}
      options={options}
      height={210}
    />
  )
}
