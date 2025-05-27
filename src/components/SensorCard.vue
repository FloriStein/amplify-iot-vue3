<script setup>
import {ref, onMounted, onBeforeUnmount, watch} from 'vue'
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

    vessels.value = res.data.data.map(v => ({
      id: v.Vessel_ID,
      name: v.Vessel_location
    }))

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

    stations.value = res.data.data.map(s => ({
      id: s.Measuring_station_ID,   // z.B. "hydronode-1"
      name: s.Measuring_station_ID,
      vessel_id: vesselId
    }))



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

    sensors.value = res.data.data.map(s => ({
      id: s.Sensor_ID,
      name: s.Sensor_type,
      station_id: stationId,
      unit: s.Sensor_unit
    }))

    if (sensors.value.length > 0) {
      selectedSensor.value = sensors.value[0].id
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
                //text: `${metricType} (${metricUnits[metricType] || ''})`
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
      console.error('⏱️ Timeout beim API-Abruf:', error.message)
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
  </div>
</template>
