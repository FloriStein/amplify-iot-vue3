<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Chart } from 'chart.js/auto'
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth'
import { PubSub } from '@aws-amplify/pubsub'

// Reaktive States
const connected = ref(false)
const lastSeen = ref(null)
const currentValue = ref('...')
const chartRef = ref(null)
let chartInstance = null
let chartIntervalId = null

// API URL
const dataApiUrl = 'https://fxxok2wf3d.execute-api.eu-central-1.amazonaws.com/dev/data'

// Funktion: Daten holen mit Authorization
const fetchDeviceShadow = async () => {
  try {
    const user = await getCurrentUser()
    const session = await fetchAuthSession()
    const token = session.tokens?.idToken?.toString()

    if (!token) {
      console.error('❌ Kein gültiger Token vorhanden')
      return
    }

    const res = await fetch(dataApiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!res.ok) {
      throw new Error(`❌ API Error: ${res.status}`)
    }

    const responseData = await res.json()

    if (!Array.isArray(responseData.data)) {
      console.error('❌ API liefert kein Array:', responseData)
      return
    }

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

// MQTT (ESP32 Nachrichten)
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
      message: { command: 'getDistance' },
    })
    console.log('Anfrage gesendet')
  } catch (error) {
    console.error('Fehler beim Senden der Anfrage:', error)
  }
}

// Lifecycle Hooks
onMounted(() => {
  fetchDeviceShadow()
  chartIntervalId = setInterval(() => {
    fetchDeviceShadow()
    sendRequest()
  }, 2000)

  pubsub.subscribe({ topics: 'esp32/responseDistance' }).subscribe({
    next: (data) => {
      console.log('MQTT Nachricht:', data)
      currentValue.value = data?.distance ?? 'unbekannt'
    },
    error: (error) => {
      console.error('Fehler beim Empfangen der Antwort:', error)
    },
    complete: () => {
      console.log('MQTT-Abonnement abgeschlossen')
    },
  })

  sendRequest()
})

onBeforeUnmount(() => {
  clearInterval(chartIntervalId)
  if (chartInstance) chartInstance.destroy()
})
</script>



<template>
  <div class="min-h-screen bg-gray-100 p-6 dashboard">
    <div class="dashboard-grid">
      <!-- Distanzsensor-Kachel -->
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

      <!-- Weitere Sensor-Kacheln können hier ergänzt werden -->
    </div>
  </div>
</template>


<style scoped>
/* Gesamter Seitenbereich */
:host, .dashboard {
  font-family: 'Inter', 'Segoe UI', sans-serif;
  background-color: #f9fafb;
  color: #1f2937;
}

/* Kacheln */
.card {
  background-color: #ffffff;
  border-radius: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 1.5rem;
  transition: box-shadow 0.3s ease;
}
.card:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

/* Titel und Texte */
.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}
.status-text {
  font-size: 0.95rem;
  color: #6b7280;
}

/* Online-/Offline-Indikator */
.online {
  color: #16a34a;
  font-weight: 600;
}
.offline {
  color: #9ca3af;
}

/* Aktueller Messwert */
.value-badge {
  background-color: #2563eb;
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  display: inline-block;
}

/* Diagrammbereich */
.chart-container {
  background-color: #f3f4f6;
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  margin-top: 1rem;
}

/* Responsive Layout */
@media (min-width: 768px) {
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 1.5rem;
  }
}
</style>

