<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue'
import axios from 'axios'
import { Chart } from 'chart.js/auto'
import { fetchAuthSession } from 'aws-amplify/auth'
import { PubSub } from '@aws-amplify/pubsub'

// State-Definition
const connected = ref(false)
const lastSeen = ref(null)
const currentValue = ref('...')
const chartRef = ref(null)

const vessels = ref([])
const stations = ref([])
const sensors = ref([])
const timeframes = ref([])

const selectedVessel = ref(null)
const selectedStation = ref(null)
const selectedSensor = ref(null)
const selectedTimeframe = ref(null)

let chartInstance = null
let chartIntervalId = null

const idToken = ref(null)
const dataApiUrl = 'https://fxxok2wf3d.execute-api.eu-central-1.amazonaws.com/dev'

// Computed Metadaten
const selectedVesselMeta = computed(() => vessels.value.find(v => v.id === selectedVessel.value) ?? null)
const selectedStationMeta = computed(() => stations.value.find(s => s.id === selectedStation.value) ?? null)
const selectedSensorMeta = computed(() => sensors.value.find(s => s.id === selectedSensor.value) ?? null)

// AWS PubSub MQTT Setup
const pubsub = new PubSub({
  region: 'eu-central-1',
  endpoint: 'wss://a2tnej84qk5j60-ats.iot.eu-central-1.amazonaws.com/mqtt',
  credentials: async () => {
    const session = await fetchAuthSession()
    return session.credentials
  }
})

// Vessels holen
const fetchVessels = async () => {
  const session = await fetchAuthSession()
  idToken.value = session.tokens?.idToken?.toString()

  const res = await axios.get(`${dataApiUrl}/meta/vms`, {
    headers: { Authorization: `Bearer ${idToken.value}` }
  })

  const resTimeframes = await axios.get(`${dataApiUrl}/meta/app/timeframe`, {
    headers: { Authorization: `Bearer ${idToken.value}` }
  })

  timeframes.value = resTimeframes.data.timeframes
  selectedTimeframe.value = timeframes.value[0] ?? null

  vessels.value = res.data.data.map(v => ({
    id: parseInt(v.Vessel_ID, 10),
    name: v.Vessel_location
  }))

  if (vessels.value.length > 0) {
    selectedVessel.value = vessels.value[0].id
    await fetchStations(selectedVessel.value)
  }
}

// Stations holen
const fetchStations = async (vesselId) => {
  const res = await axios.get(`${dataApiUrl}/meta/vms?vessel_id=${vesselId}`, {
    headers: { Authorization: `Bearer ${idToken.value}` }
  })

  stations.value = res.data.data.map(station => ({
    id: station.Measuring_station_ID,
    name: station.Measuring_station_ID,
    vessel_id: parseInt(vesselId, 10)
  }))

  if (stations.value.length > 0) {
    selectedStation.value = stations.value[0].id
    await fetchSensors(selectedStation.value)
  }
}

// Sensoren holen
const fetchSensors = async (stationId) => {
  const res = await axios.get(`${dataApiUrl}/meta/vms?station_id=${stationId}`, {
    headers: { Authorization: `Bearer ${idToken.value}` }
  })

  sensors.value = res.data.data.map(s => ({
    id: s.Sensor_ID,
    name: s.Sensor_type,
    station_id: s.Measuring_station_ID,
    unit: s.Sensor_unit ?? 'unbekannt'
  }))

  if (sensors.value.length > 0) {
    selectedSensor.value = sensors.value[0].id
  }
}

// Daten vom Device Shadow holen
const fetchDeviceShadow = async (sensor, timeframe = 'NOW') => {
  if (!chartRef.value) {
    console.warn("⚠ Chart noch nicht initialisiert.")
    return
  }

  const endpoint = timeframe === 'NOW'
      ? `${dataApiUrl}/data/now`
      : `${dataApiUrl}/data/aggregate`

  const params = {
    'node-id': sensor.station_id,
    type: sensor.name
  }

  if (timeframe !== 'NOW') {
    params.timeframe = timeframe
  }

  const res = await axios.get(endpoint, {
    headers: { Authorization: `Bearer ${idToken.value}` },
    params,
    timeout: 10000
  })

  const rawData = res.data?.data ?? []

  const labels = rawData.map(entry => {
    if (timeframe === 'NOW') return new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (timeframe === 'DAYS') return `${entry.year}-${String(entry.month).padStart(2, '0')}-${String(entry.day).padStart(2, '0')}`
    if (timeframe === 'MONTHS') return `${entry.year}-${String(entry.month).padStart(2, '0')}`
    if (timeframe === 'YEARS') return `${entry.year}`
    return entry.timestamp
  })

  const dataPoints = rawData.map(entry => entry.value)

  if (!chartInstance) {
    chartInstance = new Chart(chartRef.value, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: sensor.name,
          data: dataPoints,
          borderWidth: 2,
          tension: 0.3,
          fill: true,  // Fläche unter der Linie ausfüllen
          backgroundColor: 'rgba(75, 192, 192, 0.2)',  // Transparente Füllfarbe
          borderColor: 'rgba(75, 192, 192, 1)',        // Linienfarbe
          pointBackgroundColor: 'rgba(75, 192, 192, 1)' // Punktfarbe
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
              text: `${sensor.name} (${sensor.unit})`
            }
          }
        },
        plugins: {
          legend: { labels: { font: { size: 14 } } }
        }
      }
    })
  } else {
    chartInstance.data.labels = labels
    chartInstance.data.datasets[0].data = dataPoints
    chartInstance.data.datasets[0].label = sensor.name
    chartInstance.options.scales.y.title.text = `${sensor.name} (${sensor.unit})`
    chartInstance.update()
  }

  if (rawData.length > 0) {
    lastSeen.value = rawData[rawData.length - 1]?.timestamp ?? null
  }
}


// MQTT Request senden
const sendRequest = async () => {
  const sensorMeta = sensors.value.find(s => s.id === selectedSensor.value)
  const sensorType = sensorMeta?.name ?? 'distance'

  await pubsub.publish({
    topics: 'esp32/requestDistance',
    message: { command: 'getDistance', sensor: sensorType }
  })

  console.log(`MQTT request gesendet für Sensor: ${sensorType}`)
}

// Alle Watcher:
watch(selectedVessel, async (newVal) => {
  if (newVal !== null && !isNaN(newVal)) await fetchStations(newVal)
})

watch(selectedStation, async (newVal) => {
  if (newVal) await fetchSensors(newVal)
})

watch([selectedSensor, selectedTimeframe], async ([newSensor, newTimeframe]) => {
  const sensorMeta = sensors.value.find(s => s.id === newSensor)
  if (sensorMeta && newTimeframe && chartRef.value) {
    await fetchDeviceShadow(sensorMeta, newTimeframe)
  }
})

// Initialisierung
onMounted(async () => {
  try {
    await fetchVessels()

    await nextTick()

    chartIntervalId = setInterval(async () => {
      const sensorMeta = sensors.value.find(s => s.id === selectedSensor.value)
      if (sensorMeta && selectedTimeframe.value && chartRef.value) {
        await fetchDeviceShadow(sensorMeta, selectedTimeframe.value)
        await sendRequest()
      }
    }, 2000)

    sendRequest()

    pubsub.subscribe({ topics: 'esp32/responseDistance' }).subscribe({
      next: (data) => {
        const value = parseFloat(data?.value)
        const sensor = data?.sensor
        if (!isNaN(value)) {
          currentValue.value = `${value} (${sensor})`
          connected.value = true
        }
      },
      error: (error) => console.error('❌ Fehler beim Empfang:', error)
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
    <div class="mb-4 flex flex-col md:flex-row gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Vessel</label>
        <select v-model="selectedVessel" class="p-2 border rounded">
          <option v-for="v in vessels" :key="v.id" :value="v.id">{{ v.name }}</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Measuring Station</label>
        <select v-model="selectedStation" class="p-2 border rounded">
          <option v-for="s in stations.filter(st => st.vessel_id === selectedVessel)" :key="s.id" :value="s.id">
            {{ s.name }}
          </option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Sensor</label>
        <select v-model="selectedSensor" class="p-2 border rounded">
          <option v-for="s in sensors.filter(se => se.station_id === selectedStation)" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
        <select v-model="selectedTimeframe" class="p-2 border rounded">
          <option v-for="tf in timeframes" :key="tf" :value="tf">{{ tf }}</option>
        </select>
      </div>
    </div>
    <div class="chart-container">
      <h3 class="text-lg font-semibold text-gray-700 mb-2">Füllverlauf</h3>
      <canvas ref="chartRef" height="300"></canvas>
    </div>
    <div class="mt-6 space-y-4">
      <!--  Vessel-Metadaten -->
      <details v-if="selectedVesselMeta" class="border rounded p-4 bg-gray-50">
        <summary class="font-semibold cursor-pointer">Vessel-Metadaten anzeigen</summary>
        <div class="mt-2 space-y-1 text-sm text-gray-700">
          <template v-for="(value, key) in selectedVesselMeta" :key="key">
            <p><strong>{{ key }}:</strong> {{ value }}</p>
          </template>
        </div>
      </details>
      <!--  Station-Metadaten -->
      <details v-if="selectedStationMeta" class="border rounded p-4 bg-gray-50">
        <summary class="font-semibold cursor-pointer">Messstation-Metadaten anzeigen</summary>
        <div class="mt-2 space-y-1 text-sm text-gray-700">
          <template v-for="(value, key) in selectedStationMeta" :key="key">
            <p><strong>{{ key }}:</strong> {{ value }}</p>
          </template>
        </div>
      </details>
      <!--  Sensor-Metadaten -->
      <details v-if="selectedSensorMeta" class="border rounded p-4 bg-gray-50">
        <summary class="font-semibold cursor-pointer">Sensor-Metadaten anzeigen</summary>
        <div class="mt-2 space-y-1 text-sm text-gray-700">
          <template v-for="(value, key) in selectedSensorMeta" :key="key">
            <p><strong>{{ key }}:</strong> {{ value }}</p>
          </template>
        </div>
      </details>
    </div>
  </div>
</template>
