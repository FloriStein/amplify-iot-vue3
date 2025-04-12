<template>
  <div>
    <canvas v-if="!loading && !error" ref="chartRef" width="1000" height="400"></canvas>
    <div v-if="loading">Lade Daten...</div>
    <div v-if="error" style="color: red">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

// Amplify
import { API, graphqlOperation } from 'aws-amplify';
import { listDistances } from '@/graphql/queries' // Stelle sicher, dass dies korrekt generiert wurde

const chartRef = ref(null)
const loading = ref(true)
const error = ref(null)

const formatTimestamp = ts => new Date(ts).toLocaleTimeString()

onMounted(async () => {
  try {
    const result = await API.graphql(graphqlOperation(listDistances, {
      limit: 20, // letzte 20 Werte
      sortDirection: "DESC" // optional, je nach Schema
    }))

    const items = result.data.listDistances.items.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    )

    const times = items.map(d => formatTimestamp(d.timestamp))
    const distances = items.map(d => parseFloat(d.distance))

    new Chart(chartRef.value, {
      type: 'line',
      data: {
        labels: times,
        datasets: [
          {
            label: 'Distanz (m)',
            data: distances,
            borderColor: '#4caf50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Distanz (m)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Zeit'
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true }
        }
      }
    })
  } catch (err) {
    error.value = err.message
    console.error(err)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
canvas {
  border: 1px solid #ccc;
  border-radius: 8px;
}
</style>
