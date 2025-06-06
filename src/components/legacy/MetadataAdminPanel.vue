<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from 'axios'
import { fetchAuthSession } from 'aws-amplify/auth'

// Basis-URL der API für Metadaten-Endpunkte
const apiBaseUrl = 'https://fxxok2wf3d.execute-api.eu-central-1.amazonaws.com/dev/admin/meta'

// ID-Token für die Authentifizierung mit AWS Cognito
const idToken = ref(null)

// Daten für Dropdowns (Schiffe, Stationen, Sensoren)
const vessels = ref([])
const stations = ref([])
const sensors = ref([])

// Ausgewählte Ressource
const selectedVessel = ref(null)
const selectedStation = ref(null)
const selectedSensor = ref(null)

// Gehaltene Metadaten des aktuell ausgewählten Objekts
const metaData = ref({})

// Zustände für Lade-/Speichervorgänge
const isLoading = ref(false)
const isSaving = ref(false)
const saveMessage = ref('')

// Vom Benutzer zum Speichern/Löschen markierte Felder
const selectedFields = ref(new Set())

// Eingabefelder für neues Metadaten-Feld
const newFieldName = ref('')
const newFieldValue = ref('')

/**
 * Wenn eine Ressource ausgewählt wird, werden die anderen zurückgesetzt,
 * da nur eine Ressource (Vessel, Station, Sensor) gleichzeitig aktiv sein kann.
 */
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

/**
 * Lädt das Auth-Token aus dem aktuellen Cognito-Session
 */
async function loadToken() {
  try {
    const session = await fetchAuthSession()
    idToken.value = session.tokens?.idToken?.toString()
  } catch (err) {
    console.error('Fehler beim Laden des Tokens:', err)
  }
}

/**
 * Lädt die Auswahlmöglichkeiten (Dropdowns) für alle Ressourcen
 */
async function fetchDropdownData() {
  isLoading.value = true
  try {
    const res = await axios.get(`${apiBaseUrl}?loadDropdowns=true`, {
      headers: {
        Authorization: `Bearer ${idToken.value}`,
        'Content-Type': 'application/json'
      }
    })

    // Formatiert die empfangenen Daten für die Anzeige
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

    // Setzt initial eine Auswahl, falls vorhanden
    if (vessels.value.length) selectedVessel.value = vessels.value[0].id
    if (stations.value.length) selectedStation.value = stations.value[0].id
    if (sensors.value.length) selectedSensor.value = sensors.value[0].id

  } catch (err) {
    console.error('Fehler beim Laden der Dropdown-Daten:', err)
  } finally {
    isLoading.value = false
  }
}

/**
 * Lädt Metadaten der aktuell ausgewählten Ressource
 */
async function fetchMeta() {
  isLoading.value = true
  saveMessage.value = ''
  selectedFields.value.clear()

  try {
    // Ermittelt die gewählte Ressource
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

    // Holt Metadaten von der API
    const res = await axios.get(`${apiBaseUrl}/${resource}/${id}`, {
      headers: {
        Authorization: `Bearer ${idToken.value}`,
        'Content-Type': 'application/json'
      }
    })

    // Falls Daten in einem Array verpackt sind, extrahiere erstes Element
    const apiData = res.data?.data
    const data = Array.isArray(apiData) ? apiData[0] || {} : apiData || {}

    // Entfernt evtl. vorhandene ID aus Metadaten
    if (data.id !== undefined) delete data.id

    metaData.value = data

  } catch (err) {
    console.error('Fehler beim Laden der Metadaten:', err)
    metaData.value = {}
  } finally {
    isLoading.value = false
  }
}

/**
 * Auswahl/Umschalten einzelner Felder für Speichern/Löschen)
 */
function toggleFieldSelection(key) {
  if (selectedFields.value.has(key)) {
    selectedFields.value.delete(key)
  } else {
    selectedFields.value.add(key)
  }
}

/**
 * Fügt ein neues Metadaten-Feld hinzu
 */
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

/**
 * Speichert ausgewählte Metadaten-Felder über PUT-Anfrage
 */
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

/**
 * Löscht ein einzelnes Metadaten-Feld
 */
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

/**
 * Beim Mounten:
 * - Authentifizierung laden
 * - Dropdown-Daten laden
 * - Initiale Metadaten abrufen
 */
onMounted(async () => {
  await loadToken()
  await fetchDropdownData()
  await fetchMeta()
})

/**
 * Beobachtet Wechsel in einer der Ressourcen-Auswahlen → lädt neue Metadaten
 */
watch([selectedVessel, selectedStation, selectedSensor], fetchMeta)
</script>


<template>
  <div class="card">
    <h2 class="card-title mb-4">Meta-Daten-Verwaltung</h2>
    <div v-if="isLoading" class="mb-4">Lade Daten...</div>
    <div class="flex space-x-4 mb-6">
      <div class="flex-1">
        <label class="block text-lg font-medium text-card-foreground mb-1">Vessel auswählen</label>
        <select v-model="selectedVessel" class="bg-input text-input-foreground border border-border rounded rounded-lg w-full">
          <option v-for="v in vessels" :key="v.id" :value="v.id">
            {{ v.name || v.id }}
          </option>
        </select>
      </div>
      <div class="flex-1">
        <label class="block text-lg font-medium text-card-foreground mb-1">Messstation auswählen</label>
        <select v-model="selectedStation" class="bg-input text-input-foreground border border-border rounded rounded-lg w-full">
          <option v-for="s in stations" :key="s.id" :value="s.id">
            {{ s.name || s.id }}
          </option>
        </select>
      </div>
      <div class="flex-1">
        <label class="block text-lg font-medium text-card-foreground mb-1">Sensor auswählen</label>
        <select v-model="selectedSensor" class="bg-input text-input-foreground border border-border rounded rounded-lg w-full">
          <option v-for="s in sensors" :key="s.id" :value="s.id">
            {{ s.name || s.id }}
          </option>
        </select>
      </div>
    </div>

    <form @submit.prevent="saveMeta" class="space-y-4">
      <div v-for="(value, key) in metaData" :key="key" class="flex items-center space-x-3">
        <input type="checkbox" :checked="selectedFields.has(key)" @change="toggleFieldSelection(key)" />
        <label class="w-40 block text-lg font-medium text-card-foreground mb-1 text-left capitalize">{{ key.replace(/_/g, ' ') }}</label>
        <input
            v-model="metaData[key]"
            :type="typeof value === 'number' ? 'number' : 'text'"
            class="bg-input text-input-foreground border border-border rounded rounded-lg w-full flex-1"
        />
      </div>

      <div class="card pt-6">
        <h3 class="text-xl mb-6">Neues Feld hinzufügen</h3>
        <div class="flex space-x-2">
          <input v-model="newFieldName" placeholder="Feldname" class="bg-input text-input-foreground border border-border rounded rounded-lg w-full flex-1 px-4 py-2" />
          <input v-model="newFieldValue" placeholder="Wert" class="bg-input text-input-foreground border border-border rounded rounded-lg w-full flex-1 px-4 py-2" />
          <button type="button" class="bg-primary text-primary-foreground rounded rounded-lg px-4 py-2  hover:bg-primary-hover" @click="addNewField">➕ Feld hinzufügen</button>
        </div>
      </div>

      <div class="flex items-center space-x-4 mt-6">
        <button
            type="submit"
            class="bg-primary text-primary-foreground rounded rounded-lg px-4 py-2 hover:bg-primary-hover"
        >
          Speichern
        </button>

        <button
            type="button"
            class="bg-red-500 text-primary-foreground rounded rounded-lg px-4 py-2 hover:bg-red-400"
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
