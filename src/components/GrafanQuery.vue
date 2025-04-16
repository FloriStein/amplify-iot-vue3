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
    console.log('Angemeldet als:', user.username)

    const session = await fetchAuthSession()
    const token = session.tokens?.idToken

    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: token
      }
    })

    const data = await res.json()
    console.log('Antwort von API:', data)

    if (!Array.isArray(data)) {
      console.error('API liefert kein Array:', data)
      return
    }

    const labels = data.map(entry => new Date(entry.time).toLocaleTimeString())
    const values = data.map(entry => entry.value)
    console.log('labels:', labels)
    console.log('values:', values)

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
            label: 'Distanz',
            data: values,
            borderWidth: 2,
            tension: 0.3
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
              title: { display: true, text: 'Distanz (m)' }
            }
          }
        }
      })
    }
  } catch (error) {
    console.error('Fehler bei Auth oder API:', error)
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
