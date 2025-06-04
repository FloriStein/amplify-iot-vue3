<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import axios from 'axios'
import { Chart } from 'chart.js/auto'
import { fetchAuthSession } from 'aws-amplify/auth'
import { PubSub } from '@aws-amplify/pubsub'

// Reaktive States zur Steuerung der Anzeige und Datenhaltung
const connected = ref(false)
const lastSeen = ref(null)
const currentValue = ref('...')
const chartRef = ref(null)

// Datenquellen
const vessels = ref([])
const stations = ref([])
const sensors = ref([])

// Vom Benutzer gewählte Auswahl
const selectedVessel = ref(null)
const selectedStation = ref(null)
const selectedSensor = ref(null)

// Abgeleitete Metadaten (ausgewähltes Objekt inkl. Zusatzinfos)
const selectedVesselMeta = computed(() => {
  return vessels.value.find(v => v.id === selectedVessel.value) ?? null
})

const selectedStationMeta = computed(() => {
  return stations.value.find(s => s.id === selectedStation.value) ?? null
})

const selectedSensorMeta = computed(() => {
  return sensors.value.find(s => s.id === selectedSensor.value) ?? null
})

// Reagiere auf Änderungen der Auswahl von Station oder Sensor
watch([selectedStation, selectedSensor], async ([newStation, newSensor]) => {
  if (newStation && newSensor) {
    const sensorMeta = sensors.value.find(s => s.id === newSensor)
    if (sensorMeta) {
      await fetchDeviceShadow(sensorMeta) // Hole aktuelle Sensordaten
    }
  }
})

// Lade neue Stationen, wenn ein anderes Vessel gewählt wird
watch(selectedVessel, async (newVal) => {
  if (newVal) await fetchStations(newVal)
})

// Lade neue Sensoren, wenn eine andere Station gewählt wird
watch(selectedStation, async (newVal) => {
  if (newVal) await fetchSensors(newVal)
})

// Chart.js Instanz und Intervall für automatische Updates
let chartInstance = null
let chartIntervalId = null

const idToken = ref(null)
const dataApiUrl = 'https://fxxok2wf3d.execute-api.eu-central-1.amazonaws.com/dev'

// Lade alle verfügbaren Vessels (Fahrzeuge/Einheiten)
const fetchVessels = async () => {
  try {
    const session = await fetchAuthSession()
    idToken.value = session.tokens?.idToken?.toString()

    const res = await axios.get(`${dataApiUrl}/meta/vessels`, {
      headers: {
        Authorization: `Bearer ${idToken.value}`,
        'Content-Type': 'application/json'
      }
    })

    // Mappe Antwort in eigenes Format
    vessels.value = res.data.data.map(v => {
      const vesselObj = {
        id: v.Vessel_ID,
        name: v.Vessel_location
      }

      // Übernehme alle weiteren Daten dynamisch
      const excludedKeys = ['Vessel_ID', 'Vessel_location']
      for (const [key, value] of Object.entries(v)) {
        if (!excludedKeys.includes(key)) {
          vesselObj[key.toLowerCase()] = value ?? 'unbekannt'
        }
      }

      return vesselObj
    })

    // Wähle automatisch das erste Vessel und lade zugehörige Stationen
    if (vessels.value.length > 0) {
      selectedVessel.value = vessels.value[0].id
      await fetchStations(selectedVessel.value)
    }

  } catch (err) {
    console.error('❌ Fehler beim Laden der Vessels:', err)
  }
}

// Lade die Messstationen für ein bestimmtes Vessel
const fetchStations = async (vesselId) => {
  try {
    const res = await axios.get(`${dataApiUrl}/meta/vessels?vessel_id=${vesselId}`, {
      headers: {
        Authorization: `Bearer ${idToken.value}`,
        'Content-Type': 'application/json'
      }
    })

    stations.value = res.data.data.map(station => {
      const stationObj = {
        id: station.Measuring_station_ID,
        name: station.Measuring_station_ID,
        vessel_id: vesselId
      }

      const excludedKeys = ['Measuring_station_ID', 'Vessel_ID']
      for (const [key, value] of Object.entries(station)) {
        if (!excludedKeys.includes(key)) {
          stationObj[key.toLowerCase()] = value ?? 'unbekannt'
        }
      }
      return stationObj
    })

    // Automatische Auswahl der ersten Station
    if (stations.value.length > 0) {
      selectedStation.value = stations.value[0].id
      await fetchSensors(selectedStation.value)
    }

  } catch (err) {
    console.error('❌ Fehler beim Laden der Messstationen:', err)
  }
}

// Lade Sensoren für eine gewählte Station
const fetchSensors = async (stationId) => {
  try {
    const res = await axios.get(`${dataApiUrl}/meta/vessels?station_id=${stationId}`, {
      headers: {
        Authorization: `Bearer ${idToken.value}`,
        'Content-Type': 'application/json'
      }
    })

    sensors.value = res.data.data.map(s => {
      const sensorObj = {
        id: s.Sensor_ID,
        name: s.Sensor_type,
        station_id: s.Measuring_station_ID,
        unit: s.Sensor_unit || 'unbekannt'
      }

      const excludedKeys = ['Sensor_ID', 'Sensor_type', 'Sensor_unit', 'Measuring_station_ID']
      for (const [key, value] of Object.entries(s)) {
        if (!excludedKeys.includes(key)) {
          sensorObj[key.toLowerCase()] = value ?? 'unbekannt'
        }
      }
      return sensorObj
    })

    // Automatische Auswahl des ersten Sensors
    if (sensors.value.length > 0) {
      selectedSensor.value = sensors.value[0].id
    } else {
      console.warn('⚠️ Keine Sensoren gefunden für diese Station.')
    }

  } catch (err) {
    console.error('❌ Fehler beim Laden der Sensoren:', err)
  }
}

// Lade historische Messdaten für einen Sensor und zeichne sie in den Chart
const fetchDeviceShadow = async (sensor) => {
  const sensorType = sensor.name
  const sensorUnit = sensor.unit || ''
  const stationId = sensor.station_id
  const metricType = sensor.name

  try {
    const res = await axios.get(`${dataApiUrl}/${stationId}/data`, {
      headers: {
        Authorization: `Bearer ${idToken.value}`,
        'Content-Type': 'application/json'
      },
      params: {
        'node-id': stationId,
        'type': metricType
      },
      timeout: 5000
    })

    const rawData = res.data?.data
    const latestEntry = rawData[rawData.length - 1]
    lastSeen.value = latestEntry.timestamp

    const labels = rawData.map(entry =>
        new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    )
    const dataPoints = rawData.map(entry => entry.value)

    // Aktualisiere bestehenden Chart oder erstelle neuen
    if (chartInstance) {
      chartInstance.data.labels = labels
      chartInstance.data.datasets[0].data = dataPoints
      chartInstance.data.datasets[0].label = metricType
      chartInstance.options.scales.y.title.text = `${sensorType} (${sensorUnit})`
      chartInstance.update()
    } else {
      chartInstance = new Chart(chartRef.value, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: metricType,
            data: dataPoints,
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
            y: {
              title: {
                display: true,
                text: `${sensorType} (${sensorUnit})`
              }
            }
          },
          plugins: {
            legend: { labels: { font: { size: 14 } } }
          }
        }
      })
    }

  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('Timeout beim API-Abruf:', error.message)
    } else {
      console.error('❌ Fehler beim Abrufen der Daten:', error)
    }
  }
}

// MQTT-Verbindung zu AWS IoT via WebSocket
const pubsub = new PubSub({
  region: 'eu-central-1',
  endpoint: 'wss://a2tnej84qk5j60-ats.iot.eu-central-1.amazonaws.com/mqtt',
  credentials: async () => {
    const session = await fetchAuthSession()
    return session.credentials
  }
})

// Sende MQTT-Befehl an das Gerät, um Messdaten abzufragen
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

// Lifecycle: onMounted
onMounted(async () => {
  try {
    const session = await fetchAuthSession()
    idToken.value = session.tokens?.idToken?.toString()

    await fetchVessels()

    // Lade erste Sensor-Daten, falls vorhanden
    if (selectedSensor.value) {
      const sensorMeta = sensors.value.find(s => s.id === selectedSensor.value)
      if (sensorMeta) {
        await fetchDeviceShadow(sensorMeta)
      } else {
        console.warn('Kein passender Sensor beim Initialisieren gefunden')
      }
    }

    // Starte periodisches Nachladen der Sensordaten
    chartIntervalId = setInterval(() => {
      const sensorMeta = sensors.value.find(s => s.id === selectedSensor.value)
      if (sensorMeta) {
        fetchDeviceShadow(sensorMeta)
        sendRequest()
      }
    }, 2000)

    sendRequest()

    // Abonniere Gerätedaten (Antworten vom ESP32 via MQTT)
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

// Lifecycle: Chart und Intervall bereinigen
onBeforeUnmount(() => {
  clearInterval(chartIntervalId)
  if (chartInstance) chartInstance.destroy()
})
</script>


<template>
  <div class="card">
    <h2 class="card-title mb-4">Benutzerverwaltung</h2>

    <form @submit.prevent="addUser" class="mb-4 flex gap-2 justify-center">
      <input v-model="newUserEmail" type="email" placeholder="E-Mail eingeben" class="border px-4 py-2 rounded w-64" required />
      <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">➕ Hinzufügen</button>
    </form>

    <div class="flex justify-end mb-2">
      <button @click="fetchUsers" class="bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300">
        🔄 Aktualisieren
      </button>
    </div>


    <div v-if="loading">Lade Benutzer…</div>
    <table v-else class="w-full border border-gray-200 text-left">
      <thead>
      <tr class="bg-gray-100">
        <th class="px-4 py-2">E-Mail</th>
        <th class="px-4 py-2">Status</th>
        <th class="px-4 py-2">Aktion</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="user in users" :key="user.username" class="border-t">
        <td class="px-4 py-2">{{ user.email }}</td>
        <td class="px-4 py-2">{{ user.status }}</td>
        <td class="px-4 py-2">
          <button @click="takeAction(user.username, 'delete')" class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">✖ Löschen</button>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

