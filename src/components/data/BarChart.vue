<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  LinearScale,
  TimeScale
} from 'chart.js'
import 'chartjs-adapter-date-fns'
import { computed } from 'vue'

ChartJS.register(Title, Tooltip, Legend, BarElement, LinearScale, TimeScale)

const props = withDefaults(
  defineProps<{
    data: { timestamp: number, value: number }[],
    metric: string,
    timeframe: string,
    unit: string,
    title?: string,
    unitShort?: string
  }>(),
  {
    title: '',
    unitShort: ''
  }
)

const primaryColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--primary')
  .trim() || '#3b82f6'
const textColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--card-foreground')
  .trim() || '#ffffff'

const chartData = computed(() => {
  console.log("Displaying Data: ", props.data);
  return {
  datasets: [
    {
      label: `${props.metric} (${props.unit})`,
      data: props.data.map(d => ({
        x: d.timestamp,
        y: d.value
      })),
      backgroundColor: primaryColor
    }
  ]
}});

const chartOptions = computed(() => ({
  responsive: true,
  plugins: {
    legend: {
      labels: {
        color: textColor
      },
      display: true
    },
    tooltip: { enabled: true },
    title: {
      display: true,
      text: props.title,
      font: {
        size: 18
      },
      color: textColor
    }
  },
  scales: {
    x: {
      type: 'time',
      time: {
        unit: props.timeframe.substring(0, props.timeframe.length -1).toLowerCase(),
        tooltipFormat: 'dd.MM.yyyy HH:mm',
        displayFormats: {
          day: 'dd.MM.'
        }
      },
      ticks: {
        color: textColor
      }
    },
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: props.unitShort
      },
      ticks: {
        color: textColor
      }
    }
  },
  locale: 'de'
}))
</script>

<template>
  <div class="text-foreground bg-card border border-border rounded w-full h-full rounded-lg p-4">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>
