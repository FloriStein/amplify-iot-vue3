<script setup>
// Import benötigter Funktionen und Bibliotheken
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import axios from 'axios'
import { Chart } from 'chart.js/auto'
import { fetchAuthSession } from 'aws-amplify/auth'
import { PubSub } from '@aws-amplify/pubsub'

// Verbindungsstatus und Messwerte
const connected = ref(false)
const lastSeen = ref(null)
const currentValue = ref('...')

// Chart-Referenz
const chartRef = ref(null)

// Datenquellen
const vessels = ref([])
const stations = ref([])
const sensors = ref([])
const timeframes = ref([])

// Ausgewählte IDs
const selectedVessel = ref(null)
const selectedStation = ref(null)
const selectedSensor = ref(null)
const selectedTimeframe = ref(null)

// Metadaten der aktuell ausgewählten Einträge
const selectedVesselMeta = computed(() =>
    vessels.value.find(v => v.id === selectedVessel.value) ?? null
)

const selectedStationMeta = computed(() =>
    stations.value.find(s => s.id === selectedStation.value) ?? null
)

const selectedSensorMeta = computed(() =>
    sensors.value.find(s => s.id === selectedSensor.value) ?? null
)

// Watcher für Auswahländerungen: Vessel -> Stationen laden
watch(selectedVessel, async (newVal) => {
  if (newVal) await fetchStations(newVal)
})

// Watcher für Auswahländerungen: Station -> Sensoren laden
watch(selectedStation, async (newVal) => {
  if (newVal) await fetchSensors(newVal)
})

// Watcher für Sensor UND Timeframe: Chartdaten laden
watch([selectedSensor, selectedTimeframe], async ([newSensor, newTimeframe]) => {
  if (newSensor && newTimeframe && selectedStation.value) {
    const sensorMeta = sensors.value.find(s => s.id === newSensor)
    if (sensorMeta) {
      await fetchDeviceShadow(sensorMeta, newTimeframe)
    }
  }
})

// Chart-Instanz & Aktualisierungsintervall
let chartInstance = null
let chartIntervalId = null

// Authentifizierungs-Token
const idToken = ref(null)
const dataApiUrl = 'https://fxxok2wf3d.execute-api.eu-central-1.amazonaws.com/dev'

// Hole Liste der verfügbaren Schiffe und Timeframes
const fetchVessels = async () => {
  try {
    const session = await fetchAuthSession()
    idToken.value = session.tokens?.idToken?.toString()

    const res = await axios.get(`${dataApiUrl}/meta/vms`, {
      headers: {
        Authorization: `Bearer ${idToken.value}`,
        'Content-Type': 'application/json'
      }
    })

    const resTimeframes = await axios.get(`${dataApiUrl}/meta/app/timeframe`, {
      headers: {
        Authorization: `Bearer ${idToken.value}`,
        'Content-Type': 'application/json'
      }
    })
    timeframes.value = resTimeframes.data.timeframes
    selectedTimeframe.value = timeframes.value[0] || null

    // Normalisiere Vessel-Daten
    vessels.value = res.data.data.map(v => {
      const vesselObj = {
        id: v.Vessel_ID,
        name: v.Vessel_location
      }

      const excludedKeys = ['Vessel_ID', 'Vessel_location']
      for (const [key, value] of Object.entries(v)) {
        if (!excludedKeys.includes(key)) {
          const normalizedKey = key.toLowerCase()
          vesselObj[normalizedKey] = value ?? 'unbekannt'
        }
      }

      return vesselObj
    })

    // ⛴ Standardauswahl
    if (vessels.value.length > 0) {
      selectedVessel.value = vessels.value[0].id
      await fetchStations(selectedVessel.value)
    }

  } catch (err) {
    console.error('❌ Fehler beim Laden der Vessels:', err)
  }
}

// Lade Messstationen für ausgewähltes Vessel
const fetchStations = async (vesselId) => {
  try {
    const res = await axios.get(`${dataApiUrl}/meta/vms?vessel_id=${vesselId}`, {
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
          const normalizedKey = key.toLowerCase()
          stationObj[normalizedKey] = value ?? 'unbekannt'
        }
      }

      return stationObj
    })

    if (stations.value.length > 0) {
      selectedStation.value = stations.value[0].id
      await fetchSensors(selectedStation.value)
    }

  } catch (err) {
    console.error('❌ Fehler beim Laden der Messstationen:', err)
  }
}

// Lade Sensoren für ausgewählte Station
const fetchSensors = async (stationId) => {
  try {
    const res = await axios.get(`${dataApiUrl}/meta/vms?station_id=${stationId}`, {
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
          const normalizedKey = key.toLowerCase()
          sensorObj[normalizedKey] = value ?? 'unbekannt'
        }
      }

      return sensorObj
    })

    if (sensors.value.length > 0) {
      selectedSensor.value = sensors.value[0].id
    } else {
      console.warn('⚠️ Keine Sensoren gefunden für diese Station.')
    }

  } catch (err) {
    console.error('❌ Fehler beim Laden der Sensoren:', err)
  }
}

// Abruf aggregierter Sensordaten für Chart, mit Timeframe-Parameter
const fetchDeviceShadow = async (sensor, timeframe = 'NOW') => {
  const sensorType = sensor.name
  const sensorUnit = sensor.unit || ''
  const stationId = sensor.station_id
  const metricType = sensor.name

  try {
    // Wähle richtigen Endpunkt basierend auf Timeframe
    const endpoint = timeframe === 'NOW'
        ? `${dataApiUrl}/data/now`
        : `${dataApiUrl}/data/aggregate`

    const params = {
      'node-id': stationId,
      type: metricType
    }

    // Füge Timeframe nur hinzu, wenn nicht "NOW"
    if (timeframe !== 'NOW') {
      params.timeframe = timeframe
    }

    const res = await axios.get(endpoint, {
      headers: {
        Authorization: `Bearer ${idToken.value}`,
        'Content-Type': 'application/json'
      },
      params,
      timeout: 10000
    })

    const rawData = res.data?.data || []
    if (rawData.length === 0) {
      console.warn('Keine Daten erhalten für Sensor und Timeframe')
      return
    }

    // Labels abhängig vom Timeframe formatieren
    const labels = rawData.map(entry => {
      switch (timeframe) {
        case 'NOW':
          return new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        case 'DAYS':
          return `${entry.year}-${String(entry.month).padStart(2,'0')}-${String(entry.day).padStart(2,'0')}`
        case 'MONTHS':
          return `${entry.year}-${String(entry.month).padStart(2,'0')}`
        case 'YEARS':
          return `${entry.year}`
        default:
          return entry.timestamp
      }
    })

    const dataPoints = rawData.map(entry => entry.value)

    lastSeen.value = rawData[rawData.length - 1]?.timestamp || null

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
      console.error('❌ Fehler beim Abrufen der Sensordaten:', error)
    }
  }
}


// MQTT-Verbindung mit AWS IoT über PubSub
const pubsub = new PubSub({
  region: 'eu-central-1',
  endpoint: 'wss://a2tnej84qk5j60-ats.iot.eu-central-1.amazonaws.com/mqtt',
  credentials: async () => {
    const session = await fetchAuthSession()
    return session.credentials
  }
})

// Anfrage an ESP32 senden
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

// Initialisierung bei Komponenteneinbindung
onMounted(async () => {
  try {
    const session = await fetchAuthSession()
    idToken.value = session.tokens?.idToken?.toString()

    await fetchVessels()

    if (selectedSensor.value && selectedTimeframe.value) {
      const sensorMeta = sensors.value.find(s => s.id === selectedSensor.value)
      if (sensorMeta) {
        await fetchDeviceShadow(sensorMeta, selectedTimeframe.value)
      }
    }

    // Daten in regelmäßigen Abständen aktualisieren (Sensor + Timeframe)
    chartIntervalId = setInterval(() => {
      const sensorMeta = sensors.value.find(s => s.id === selectedSensor.value)
      if (sensorMeta && selectedTimeframe.value) {
        fetchDeviceShadow(sensorMeta, selectedTimeframe.value)
        sendRequest()
      }
    }, 2000)

    sendRequest()

    // MQTT-Subscription
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

// Aufräumen beim Entfernen der Komponente
onBeforeUnmount(() => {
  clearInterval(chartIntervalId)
  if (chartInstance) chartInstance.destroy()
})
</script>


<template>
  <div class="card">
    <div class="flex flex-col justify-between items-start items-center mb-4 gap-4">
      <div class="flex flex-col gap-2">
        <h2 class="card-title">Sensormesswerte</h2>
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
        <span class="value-badge">{{ currentValue }}</span>
      </div>
    </div>
    <div class="mb-4 grid grid-rows-3 md:grid-cols-3 md:grid-rows-1 gap-4 justify-between">
      <div>
        <label class="block text-lg font-medium text-card-foreground mb-1">Vessel</label>
        <select v-model="selectedVessel" class="p-2 w-full bg-input text-input-foreground border-border rounded rounded-md">
          <option v-for="v in vessels" :key="v.id" :value="v.id">{{ v.name }}</option>
        </select>
      </div>
      <div>
        <label class="block text-lg font-medium text-card-foreground mb-1">Measuring Station</label>
        <select v-model="selectedStation" class="p-2 w-full bg-input text-input-foreground border-border  rounded rounded-md">
          <option v-for="s in stations.filter(st => st.vessel_id === selectedVessel)" :key="s.id" :value="s.id">
            {{ s.name }}
          </option>
        </select>
      </div>
      <div>
        <label class="block text-lg font-medium text-card-foreground mb-1">Sensor</label>
        <select v-model="selectedSensor" class="p-2 w-full bg-input text-input-foreground border-border rounded rounded-md">
          <option v-for="s in sensors.filter(se => se.station_id === selectedStation)" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </div>
      <div>
        <label class="block text-lg font-medium text-card-foreground mb-1">Timeframe</label>
        <select v-model="selectedTimeframe" class="p-2 w-full bg-input text-input-foreground border-border rounded rounded-md">
          <option v-for="tf in timeframes" :key="tf" :value="tf">{{ tf }}</option>
        </select>
      </div>
    </div>
    <div class="bg-card p-4 border border-border rounded rounded-lg">
      <h3 class="text-lg font-semibold text-card-foreground mb-2">Füllverlauf</h3>
      <canvas ref="chartRef" height="300"></canvas>
    </div>

    <div class="mt-6 space-y-4">
      <!--  Vessel-Metadaten -->
      <details v-if="selectedVesselMeta" class="border rounded rounded-lg p-4 bg-input">
        <summary class="font-semibold text-left cursor-pointer">Vessel-Metadaten anzeigen</summary>
        <div class="mt-2 text-left space-y-1 text-sm ml-4 text-foreground">
          <template v-for="(value, key) in selectedVesselMeta" :key="key">
            <p><strong>{{ key }}:</strong> {{ value }}</p>
          </template>
        </div>
      </details>
      <!--  Station-Metadaten -->
      <details v-if="selectedStationMeta" class="border rounded rounded-lg p-4 bg-input">
        <summary class="font-semibold text-left cursor-pointer">Messstation-Metadaten anzeigen</summary>
        <div class="mt-2 text-left space-y-1 text-sm ml-4 text-foreground">
          <template v-for="(value, key) in selectedStationMeta" :key="key">
            <p><strong>{{ key }}:</strong> {{ value }}</p>
          </template>
        </div>
      </details>
      <!--  Sensor-Metadaten -->
      <details v-if="selectedSensorMeta" class="border rounded rounded-lg p-4 bg-input">
        <summary class="font-semibold text-left cursor-pointer">Sensor-Metadaten anzeigen</summary>
        <div class="mt-2 text-left space-y-1 text-sm ml-4 text-foreground">
          <template v-for="(value, key) in selectedSensorMeta" :key="key">
            <p><strong>{{ key }}:</strong> {{ value }}</p>
          </template>
        </div>
      </details>
    </div>
  </div>
</template>
