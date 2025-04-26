<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Chart } from 'chart.js/auto'
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth'

const chartRef = ref(null)
let chartInstance = null
let intervalId = null

const apiUrl = 'https://fxxok2wf3d.execute-api.eu-central-1.amazonaws.com/dev/data'

const fetchDataAndUpdateChart = async () => {
  try {
    const user = await getCurrentUser()
    const session = await fetchAuthSession()
    const token = session.tokens?.idToken

    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: { Authorization: token }
    })

    const data = await res.json()
    if (!Array.isArray(data)) {
      console.error('API liefert kein Array:', data)
      return
    }

    const reversed = [...data].reverse()
    const labels = reversed.map(entry =>
        new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    )
    const values = reversed.map(entry =>
        entry.value !== null ? entry.value / 10 : null
    )

    if (chartInstance) {
      chartInstance.data.labels = labels
      chartInstance.data.datasets[0].data = values
      chartInstance.update()
    } else {
      chartInstance = new Chart(chartRef.value, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Distanz (cm)',
            data: values,
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)'
          }]
        },
        options: {
          responsive: true,
          animation: false,
          scales: {
            x: {
              title: { display: true, text: 'Zeit' }
            },
            y: {
              title: { display: true, text: 'Distanz (cm)' }
            }
          },
          plugins: {
            legend: {
              labels: {
                font: { size: 14 }
              }
            }
          }
        }
      })
    }
  } catch (error) {
    console.error('❌ Fehler bei fetchDataAndUpdateChart:', error)
  }
}


onMounted(() => {
  fetchDataAndUpdateChart()
  intervalId = setInterval(fetchDataAndUpdateChart, 60_000)
})

onBeforeUnmount(() => {
  clearInterval(intervalId)
  if (chartInstance) chartInstance.destroy()
})
</script>

<template>
  <canvas ref="chartRef" width="800" height="400"></canvas>
</template>
