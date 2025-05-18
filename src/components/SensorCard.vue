<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { Chart } from 'chart.js/auto'
import { fetchAuthSession } from 'aws-amplify/auth'
import { PubSub } from '@aws-amplify/pubsub'
//test
const connected = ref(false)
const lastSeen = ref(null)
const currentValue = ref('...')
const chartRef = ref(null)
let chartInstance = null
let chartIntervalId = null
let newVar = null

const idToken = ref(null)
const dataApiUrl = 'https://fxxok2wf3d.execute-api.eu-central-1.amazonaws.com/dev/data'

const fetchDeviceShadow = async () => {
  if (!idToken.value) {
    console.warn('⚠️ Kein gültiger Token vorhanden')
    return
  }

  try {
    const res = await axios.get(dataApiUrl, {
      headers: {
        Authorization: `Bearer ${idToken.value}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    })

    const responseData = res.data
    const rawData = responseData.data

    if (!Array.isArray(rawData) || rawData.length === 0) {
      console.warn('⚠️ Keine gültigen Daten erhalten')
      return
    }

    const reversed = [...rawData].reverse()
    const labels = reversed.map(entry =>
        new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    )
    const values = reversed.map(entry =>
        typeof entry.fill_percent === 'number' ? entry.fill_percent : null
    )

    connected.value = true
    lastSeen.value = reversed[0]?.timestamp ?? null
    // ⛔ currentValue wird NICHT hier gesetzt

    if (chartInstance && labels.length === values.length && values.every(v => typeof v === 'number')) {
      chartInstance.data.labels = labels
      chartInstance.data.datasets[0].data = values
      chartInstance.update()
    } else if (!chartInstance) {
      chartInstance = new Chart(chartRef.value, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Füllstand (%)',
            data: values,
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            pointBackgroundColor: 'rgba(75, 192, 192, 1)'
          }]
        },
        options: {
          responsive: true,
          animation: false,
          scales: {
            x: { title: { display: true, text: 'Zeit' } },
            y: { title: { display: true, text: 'Füllstand (%)' }, min: 0, max: 100 }
          },
          plugins: {
            legend: { labels: { font: { size: 14 } } }
          }
        }
      })
    } else {
      console.warn('⚠️ Ungültige Chartdaten, Update übersprungen')
    }
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('❌ Timeout beim Abrufen der API:', error.message)
    } else {
      console.error('❌ Fehler bei fetchDeviceShadow (Axios):', error)
    }
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
    console.error('❌ Fehler beim Senden der Anfrage:', error)
  }
}

onMounted(async () => {
  try {
    const session = await fetchAuthSession()
    idToken.value = session.tokens?.idToken?.toString()

    fetchDeviceShadow()
    chartIntervalId = setInterval(() => {
      fetchDeviceShadow()
      sendRequest()
    }, 2000)
    sendRequest()

    pubsub.subscribe({ topics: 'esp32/responseDistance' }).subscribe({
      next: (data) => {
        const distance = parseFloat(data?.distance)
        if (!isNaN(distance)) {
          currentValue.value = `${distance} mm`
          connected.value = true
        } else {
          currentValue.value = 'unbekannt'
        }
      },
      error: (error) => {
        console.error('❌ Fehler beim Empfang:', error)
      },
      complete: () => {
        console.log('MQTT-Abonnement beendet')
      }
    })
  } catch (err) {
    console.error('❌ Fehler beim Initialisieren:', err)
  }
})

onBeforeUnmount(() => {
  clearInterval(chartIntervalId)
  if (chartInstance) chartInstance.destroy()
})
</script>

<template>
  <div class="card">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
      <div>
        <h2 class="card-title">Füllstandsanzeige – Fass 1</h2>
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
          {{ currentValue }}
        </span>
      </div>
    </div>

    <div class="chart-container">
      <h3 class="text-lg font-semibold text-gray-700 mb-2">Füllverlauf</h3>
      <canvas ref="chartRef" height="300"></canvas>
    </div>
  </div>
</template>
