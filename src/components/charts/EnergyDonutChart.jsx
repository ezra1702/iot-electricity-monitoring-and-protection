import ReactApexChart from 'react-apexcharts'
import { LOAD_DISTRIBUTION } from '../../utils/mockData'

export default function EnergyDonutChart() {
  const { labels, series } = LOAD_DISTRIBUTION
  const total = series.reduce((a, b) => a + b, 0)

  const options = {
    chart: { type: 'donut', background: 'transparent', animations: { enabled: true, easing: 'easeinout', speed: 800 } },
    colors: ['#38BDF8', '#22D3EE', '#60A5FA', '#0EA5E9'],
    labels,
    legend: {
      position: 'bottom',
      labels: { colors: '#94A3B8' },
      fontSize: '11px',
      markers: { width: 8, height: 8, radius: 4 },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            name:  { color: '#94A3B8', fontSize: '11px' },
            value: { color: '#38BDF8', fontSize: '20px', fontWeight: 700 },
            total: {
              show: true, label: 'Total',
              color: '#94A3B8',
              formatter: () => `${total} kWh`,
            },
          },
        },
      },
    },
    stroke: { width: 0 },
    dataLabels: { enabled: false },
    tooltip: {
      theme: 'dark',
      y: { formatter: v => `${v}% (${((v / 100) * total).toFixed(1)} kWh)` },
    },
  }

  return (
    <ReactApexChart type="donut" series={series} options={options} height={230} />
  )
}
