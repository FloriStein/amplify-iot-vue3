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
const API_KEY = 'glsa_vpYDpZnczc792OpaQr8AaCS1H7bgZjO1_5b8acc2e' // Ersetze durch deinen tatsächlichen API-Schlüssel
//const API_KEY = 'glsa_GaGhf7j1QWHbvuMvagcnoSmxPJsEKmFc_1927fb96' // Ersetze durch deinen tatsächlichen API-Schlüssel
const TIMESTREAM_UID = 'aehli3wxgge80c' // Ersetze durch deine tatsächliche Timestream-UID
const GRAFANA_HOST = 'http://3.124.186.35/api/ds/query/' // Ersetze durch deinen tatsächlichen Grafana-Host

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
//https://g-36c53baaa0.grafana-workspace.eu-central-1.amazonaws.com/api/ds/query
onMounted(async () => {
  try {
    const res = await fetch(`${GRAFANA_HOST}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "queries": [
          {
            "database": "\"distanceTimestreamDB\"",
            "datasource": {
              "type": "grafana-timestream-datasource",
              "uid": "aehli3wxgge80c"
            },
            "format": 1,
            "measure": "",
              "rawQuery": "SELECT time, measure_value::bigint as distance\r\nFROM \"distanceTimestreamDB\".\"distanceTimestreamDBTable\"\r\nWHERE measure_name = 'distance'\r\nORDER BY time DESC\r\nLIMIT 100",
            "refId": "A",
            "table": "\"distanceTimestreamDBTable\"",
            "datasourceId": 1,
            "intervalMs": 30000,
            "maxDataPoints": 819
          }
        ],
        "from": "1744466996092",
        "to": "1744488596092"
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
