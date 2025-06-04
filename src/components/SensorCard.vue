<script setup>
import {ref, onMounted, onBeforeUnmount, watch, computed} from 'vue'
import axios from 'axios'
import { Chart } from 'chart.js/auto'
import { fetchAuthSession } from 'aws-amplify/auth'
import { PubSub } from '@aws-amplify/pubsub'

const connected = ref(false)
const lastSeen = ref(null)
const currentValue = ref('...')
const chartRef = ref(null)
const vessels = ref([])
const stations = ref([])
const sensors = ref([])
const selectedVessel = ref(null)
const selectedStation = ref(null)
const selectedSensor = ref(null)

const selectedVesselMeta = computed(() => {
  return vessels.value.find(v => v.id === selectedVessel.value) ?? null
})

const selectedStationMeta = computed(() => {
  return stations.value.find(s => s.id === selectedStation.value) ?? null
})

const selectedSensorMeta = computed(() => {
  return sensors.value.find(s => s.id === selectedSensor.value) ?? null
})


watch([selectedStation, selectedSensor], async ([newStation, newSensor]) => {
  if (newStation && newSensor) {
    const sensorMeta = sensors.value.find(s => s.id === newSensor)
    if (sensorMeta) {
      await fetchDeviceShadow(sensorMeta)
    }
  }
})

watch(selectedVessel, async (newVal) => {
  if (newVal) await fetchStations(newVal)
})

watch(selectedStation, async (newVal) => {
  if (newVal) await fetchSensors(newVal)
})

let chartInstance = null
let chartIntervalId = null

const idToken = ref(null)
const dataApiUrl = 'https://fxxok2wf3d.execute-api.eu-central-1.amazonaws.com/dev'

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

    if (vessels.value.length > 0) {
      selectedVessel.value = vessels.value[0].id
      await fetchStations(selectedVessel.value)
    }

  } catch (err) {
    console.error('❌ Fehler beim Laden der Vessels:', err)
  }
}

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
        station_id: s.Measuring_station_ID, // manuell gesetzt, nicht aus `s`
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

    await fetchVessels()

    // Initiales Laden des DeviceShadow nur wenn Sensor verfügbar ist
    if (selectedSensor.value) {
      const sensorMeta = sensors.value.find(s => s.id === selectedSensor.value)
      if (sensorMeta) {
        await fetchDeviceShadow(sensorMeta)
      } else {
        console.warn('Kein passender Sensor beim Initialisieren gefunden')
      }
    } else {
      console.warn('Kein Sensor ausgewählt beim Initialisieren')
    }

    // Automatische Aktualisierung alle 2 Sekunden
    chartIntervalId = setInterval(() => {
      const sensorMeta = sensors.value.find(s => s.id === selectedSensor.value)
      if (sensorMeta) {
        console.log('🔄 Periodischer fetchDeviceShadow mit Sensor:', sensorMeta)
        fetchDeviceShadow(sensorMeta)
        sendRequest()
      } else {
        console.warn('Kein Sensor für fetchDeviceShadow im Interval gefunden')
      }
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
