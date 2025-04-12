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

const chartRef = ref(null)
const loading = ref(true)
const error = ref(null)

// Konfigurationsvariablen
const API_KEY = 'glsa_GaGhf7j1QWHbvuMvagcnoSmxPJsEKmFc_1927fb96' // Ersetze durch deinen tatsächlichen API-Schlüssel
const TIMESTREAM_UID = 'ceindnz3ytf5sc' // Ersetze durch deine tatsächliche Timestream-UID
const GRAFANA_HOST = 'http://3.124.186.35:3000' // Ersetze durch deinen tatsächlichen Grafana-Host

// Zeitbereich: letzte 5 Minuten
const rangeFrom = new Date(Date.now() - 5 * 60 * 1000).toISOString()
const rangeTo = new Date().toISOString()

// SQL-Query für Distanzmessungen
const QUERY = `
  SELECT time, measure_value::double as distance
  FROM "distanceTimestreamDB"."temperaturDB"
  WHERE measure_name = 'distance'
  ORDER BY time DESC
  LIMIT 20
`

const formatTimestamp = ts => new Date(ts).toLocaleTimeString()

onMounted(async () => {
  try {
    const res = await fetch(`${GRAFANA_HOST}/api/ds/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        queries: [
          {
            refId: 'A',
            datasource: { uid: TIMESTREAM_UID },
            rawSql: QUERY,
            format: 'table',
            intervalMs: 10000,
            maxDataPoints: 100
          }
        ],
        range: { from: rangeFrom, to: rangeTo }
      })
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }

    const json = await res.json()
    const values = json.results.A.frames[0].data.values
    const times = values[0]
    const distances = values[1]

    new Chart(chartRef.value, {
      type: 'line',
      data: {
        labels: times.map(formatTimestamp),
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
