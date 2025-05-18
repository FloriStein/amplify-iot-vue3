<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Chart } from 'chart.js/auto'
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth'
import { PubSub } from '@aws-amplify/pubsub'

const connected = ref(false)
const lastSeen = ref(null)
const currentValue = ref('...')
const chartRef = ref(null)
let chartInstance = null
let chartIntervalId = null

const dataApiUrl = 'https://fxxok2wf3d.execute-api.eu-central-1.amazonaws.com/dev/data'

const fetchDeviceShadow = async () => {
  try {
    const session = await fetchAuthSession()
    const token = session.tokens?.idToken?.toString()
    if (!token) {
      console.warn('⚠️ Kein Token verfügbar beim fetchDeviceShadow')
      return
    }

    const res = await fetch(dataApiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!res.ok) throw new Error(`❌ API Error: ${res.status}`)

    const responseData = await res.json()
    if (!Array.isArray(responseData.data)) return console.error('❌ API liefert kein Array:', responseData)

    const reversed = [...responseData.data].reverse()
    const labels = reversed.map(entry =>
        new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    )
    const values = reversed.map(entry =>
        entry.distance !== null ? entry.distance / 10 : null
    )

    connected.value = responseData.data[0]?.connected ?? false
    lastSeen.value = responseData.data[0]?.lastSeen ?? null

    if (chartInstance) {
      chartInstance.data.labels = labels
      chartInstance.data.datasets[0].data = values
      chartInstance.data.datasets[0].pointBackgroundColor = values.map(v => v > 100 ? 'red' : 'rgba(54, 162, 235, 1)')
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
            borderColor: 'rgba(54, 162, 235, 1)',
            pointBackgroundColor: values.map(v => v > 100 ? 'red' : 'rgba(54, 162, 235, 1)')
          }]
        },
        options: {
          responsive: true,
          animation: false,
          scales: {
            x: { title: { display: true, text: 'Zeit' } },
            y: { title: { display: true, text: 'Distanz (cm)' } }
          },
          plugins: {
            legend: { labels: { font: { size: 14 } } }
          }
        }
      })
    }
  } catch (error) {
    console.error('❌ Fehler bei fetchDeviceShadow:', error)
  }
}

const pubsub = new PubSub({
  region: 'eu-central-1',
  endpoint: 'wss://a2tnej84qk5j60-ats.iot.eu-central-1.amazonaws.com/mqtt',
  credentials: async () => {
    const session = await fetchAuthSession()
    return session.credentials
  }
})

const sendRequest = async () => {
  try {
    await pubsub.publish({
      topics: 'esp32/requestDistance',
      message: { command: 'getDistance' }
    })
  } catch (error) {
    console.error('Fehler beim Senden der Anfrage:', error)
  }
}

const waitForValidTokenAndStart = async () => {
  let attempts = 0
  const maxAttempts = 10
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

  while (attempts < maxAttempts) {
    try {
      const session = await fetchAuthSession()
      const token = session.tokens?.idToken?.toString()

      if (token) {
        fetchDeviceShadow()
        chartIntervalId = setInterval(() => {
          fetchDeviceShadow()
          sendRequest()
        }, 2000)

        pubsub.subscribe({ topics: 'esp32/responseDistance' }).subscribe({
          next: (data) => {
            currentValue.value = data?.distance ?? 'unbekannt'
          },
          error: (error) => {
            console.error('Fehler beim Empfangen der Antwort:', error)
          },
          complete: () => {
            console.log('MQTT-Abonnement abgeschlossen')
          }
        })

        sendRequest()
        return
      }
    } catch (err) {
      console.warn('⏳ Warte auf gültigen Token...')
    }

    attempts++
    await delay(300)
  }

  console.error('❌ Kein gültiger Auth-Token nach mehreren Versuchen verfügbar')
}

onMounted(waitForValidTokenAndStart)

onBeforeUnmount(() => {
  clearInterval(chartIntervalId)
  if (chartInstance) chartInstance.destroy()
})
</script>

<template>
  <div class="card">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
      <div>
        <h2 class="card-title">Distanzsensor ESP32</h2>
        <p class="status-text">
          Status:
          <span :class="connected ? 'online' : 'offline'">
            {{ connected ? '🟢 Online' : '⚪️ Offline' }}
          </span>
          <span class="ml-2">
            | Zuletzt gesehen:
            <span v-if="lastSeen">{{ new Date(lastSeen).toLocaleTimeString() }}</span>
            <span v-else>Keine Daten</span>
          </span>
        </p>
      </div>
      <div class="mt-4 md:mt-0">
        <span class="value-badge">
          {{ currentValue }} mm
        </span>
      </div>
    </div>

    <div class="chart-container">
      <h3 class="text-lg font-semibold text-gray-700 mb-2">Live-Verlauf</h3>
      <canvas ref="chartRef" height="300"></canvas>
    </div>
  </div>
</template>
