<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from 'axios'
import { fetchAuthSession } from 'aws-amplify/auth'

const apiBaseUrl = 'https://fxxok2wf3d.execute-api.eu-central-1.amazonaws.com/dev/admin/meta'

const idToken = ref(null)

const vessels = ref([])
const stations = ref([])
const sensors = ref([])

const selectedVessel = ref(null)
const selectedStation = ref(null)
const selectedSensor = ref(null)

const metaData = ref({})
const isLoading = ref(false)
const isSaving = ref(false)
const saveMessage = ref('')

const selectedFields = ref(new Set())

const newFieldName = ref('')
const newFieldValue = ref('')

watch(selectedVessel, (v) => {
  if (v) {
    selectedStation.value = null
    selectedSensor.value = null
  }
})

watch(selectedStation, (s) => {
  if (s) {
    selectedVessel.value = null
    selectedSensor.value = null
  }
})

watch(selectedSensor, (s) => {
  if (s) {
    selectedVessel.value = null
    selectedStation.value = null
  }
})

async function loadToken() {
  try {
    const session = await fetchAuthSession()
    idToken.value = session.tokens?.idToken?.toString()
  } catch (err) {
    console.error('Fehler beim Laden des Tokens:', err)
  }
}

async function fetchDropdownData() {
  isLoading.value = true
  try {
    const res = await axios.get(`${apiBaseUrl}?loadDropdowns=true`, {
      headers: {
        Authorization: `Bearer ${idToken.value}`,
        'Content-Type': 'application/json'
      }
    })

    vessels.value = (res.data.vessels || []).map(v => ({
      id: v.Vessel_ID,
      name: v.Vessel_location
    }))
    stations.value = (res.data.stations || []).map(s => ({
      id: s.Measuring_station_ID,
      name: `Station ${s.Measuring_station_ID}`
    }))
    sensors.value = (res.data.sensors || []).map(s => ({
      id: s.Sensor_ID,
      name: s.Sensor_model
    }))

    if (vessels.value.length) selectedVessel.value = vessels.value[0].id
    if (stations.value.length) selectedStation.value = stations.value[0].id
    if (sensors.value.length) selectedSensor.value = sensors.value[0].id

  } catch (err) {
    console.error('Fehler beim Laden der Dropdown-Daten:', err)
  } finally {
    isLoading.value = false
  }
}

async function fetchMeta() {
  isLoading.value = true
  saveMessage.value = ''
  selectedFields.value.clear()

  try {
    let resource = null
    let id = null

    if (selectedSensor.value) {
      resource = 'sensor'
      id = selectedSensor.value
    } else if (selectedStation.value) {
      resource = 'station'
      id = selectedStation.value
    } else if (selectedVessel.value) {
      resource = 'vessel'
      id = selectedVessel.value
    }

    if (!resource || !id) {
      metaData.value = {}
      return
    }

    const res = await axios.get(`${apiBaseUrl}/${resource}/${id}`, {
      headers: {
        Authorization: `Bearer ${idToken.value}`,
        'Content-Type': 'application/json'
      }
    })

    const apiData = res.data?.data
    const data = Array.isArray(apiData) ? apiData[0] || {} : apiData || {}

    if (data.id !== undefined) delete data.id
    metaData.value = data

  } catch (err) {
    console.error('Fehler beim Laden der Metadaten:', err)
    metaData.value = {}
  } finally {
    isLoading.value = false
  }
}

function toggleFieldSelection(key) {
  if (selectedFields.value.has(key)) {
    selectedFields.value.delete(key)
  } else {
    selectedFields.value.add(key)
  }
}


function addNewField() {
  const fieldName = newFieldName.value.trim()
  if (!fieldName) {
    alert('Bitte gib einen Feldnamen ein.')
    return
  }
  if (metaData.value[fieldName] !== undefined) {
    alert(`Das Feld "${fieldName}" existiert bereits.`)
    return
  }
  metaData.value[fieldName] = newFieldValue.value
  newFieldName.value = ''
  newFieldValue.value = ''
}

async function saveMeta() {
  isSaving.value = true
  saveMessage.value = ''

  try {
    let resource = null
    let id = null

    if (selectedSensor.value) {
      resource = 'sensor'
      id = selectedSensor.value
    } else if (selectedStation.value) {
      resource = 'station'
      id = selectedStation.value
    } else if (selectedVessel.value) {
      resource = 'vessel'
      id = selectedVessel.value
    }

    if (!resource || !id) {
      alert('Keine Ressource ausgewählt zum Speichern.')
      return
    }

    const payload = {}
    selectedFields.value.forEach(key => {
      payload[key] = metaData.value[key]
    })

    await axios.put(`${apiBaseUrl}/${resource}/${id}`, payload, {
      headers: {
        Authorization: `Bearer ${idToken.value}`,
        'Content-Type': 'application/json'
      }
    })

    saveMessage.value = 'Erfolgreich gespeichert'
    selectedFields.value.clear()

  } catch (err) {
    console.error('Fehler beim Speichern:', err)
    saveMessage.value = 'Fehler beim Speichern'
  } finally {
    isSaving.value = false
  }
}

async function deleteField() {
  if (selectedFields.value.size !== 1) {
    alert('Bitte genau ein Feld zum Löschen auswählen.')
    return
  }

  const fieldToDelete = Array.from(selectedFields.value)[0]

  let resource = null
  let id = null

  if (selectedSensor.value) {
    resource = 'sensor'
    id = selectedSensor.value
  } else if (selectedStation.value) {
    resource = 'station'
    id = selectedStation.value
  } else if (selectedVessel.value) {
    resource = 'vessel'
    id = selectedVessel.value
  }

  if (!resource || !id) {
    alert('Keine Ressource ausgewählt zum Löschen.')
    return
  }

  if (confirm(`Soll das Feld "${fieldToDelete}" wirklich gelöscht werden? (Dies entfernt die gesamte Spalte aus der Datenbank)`)) {
    try {
      await axios.delete(`${apiBaseUrl}/${resource}/${id}?field=${fieldToDelete}`, {
        headers: {
          Authorization: `Bearer ${idToken.value}`
        }
      })

      saveMessage.value = `Spalte "${fieldToDelete}" gelöscht.`
      selectedFields.value.delete(fieldToDelete)
      delete metaData.value[fieldToDelete]

    } catch (err) {
      console.error('Fehler beim Löschen der Spalte:', err)
      saveMessage.value = 'Fehler beim Löschen der Spalte'
    }
  }
}

onMounted(async () => {
  await loadToken()
  await fetchDropdownData()
  await fetchMeta()
})

watch([selectedVessel, selectedStation, selectedSensor], fetchMeta)
</script>

<template>
  <div class="card p-6 max-w-4xl mx-auto">
    <h2 class="text-2xl font-bold mb-6">Meta-Daten Verwaltung</h2>
    <div v-if="isLoading" class="mb-4">Lade Daten...</div>
    <div class="flex space-x-4 mb-6">
      <div class="flex-1">
        <label class="block font-semibold mb-1">Vessel auswählen</label>
        <select v-model="selectedVessel" class="input input-bordered w-full">
          <option v-for="v in vessels" :key="v.id" :value="v.id">
            {{ v.name || v.id }}
          </option>
        </select>
      </div>
      <div class="flex-1">
        <label class="block font-semibold mb-1">Messstation auswählen</label>
        <select v-model="selectedStation" class="input input-bordered w-full">
          <option v-for="s in stations" :key="s.id" :value="s.id">
            {{ s.name || s.id }}
          </option>
        </select>
      </div>
      <div class="flex-1">
        <label class="block font-semibold mb-1">Sensor auswählen</label>
        <select v-model="selectedSensor" class="input input-bordered w-full">
          <option v-for="s in sensors" :key="s.id" :value="s.id">
            {{ s.name || s.id }}
          </option>
        </select>
      </div>
    </div>

    <form @submit.prevent="saveMeta" class="space-y-4">
      <div v-for="(value, key) in metaData" :key="key" class="flex items-center space-x-3">
        <input type="checkbox" :checked="selectedFields.has(key)" @change="toggleFieldSelection(key)" />
        <label class="w-40 font-medium capitalize">{{ key.replace(/_/g, ' ') }}</label>
        <input
            v-model="metaData[key]"
            :type="typeof value === 'number' ? 'number' : 'text'"
            class="input input-bordered flex-1"
        />
      </div>

      <div class="border p-4 rounded mt-6">
        <h3 class="font-semibold mb-2">Neues Feld hinzufügen</h3>
        <div class="flex space-x-2">
          <input v-model="newFieldName" placeholder="Feldname" class="input input-bordered flex-1" />
          <input v-model="newFieldValue" placeholder="Wert" class="input input-bordered flex-1" />
          <button type="button" class="btn btn-secondary" @click="addNewField">➕ Feld hinzufügen</button>
        </div>
      </div>

      <div class="flex items-center space-x-4 mt-6">
        <button
            type="submit"
            class="btn btn-primary"
        >
          Speichern
        </button>

        <button
            type="button"
            class="btn btn-error"
            @click="deleteField"
            :disabled="selectedFields.size !== 1"
        >
          Löschen
        </button>
      </div>

      <div v-if="saveMessage" class="mt-4 font-semibold">{{ saveMessage }}</div>
    </form>
  </div>
</template>
