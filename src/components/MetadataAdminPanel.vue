<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { fetchAuthSession } from 'aws-amplify/auth'

const fassId = 'fass1'
const idToken = ref(null)

const metaData = ref({})
const isLoading = ref(true)
const isSaving = ref(false)
const saveMessage = ref('')
const editableFields = ref(new Set())        // Speichert, welche Felder editierbar sind
const selectedFields = ref(new Set())        // Speichert, welche Checkboxen selektiert wurden

// Neue Felder hinzufügen
const newFieldName = ref('')
const newFieldValue = ref('')

const apiBaseUrl = 'https://fxxok2wf3d.execute-api.eu-central-1.amazonaws.com/dev/admin'

// Authentifizierte Metadaten laden
const fetchMeta = async () => {
  isLoading.value = true
  try {
    const session = await fetchAuthSession()
    idToken.value = session.tokens?.idToken?.toString()

    const res = await axios.get(`${apiBaseUrl}/meta/${fassId}`, {
      headers: {
        Authorization: `Bearer ${idToken.value}`,
        'Content-Type': 'application/json'
      }
    })

    // Falls die API ein Array zurückgibt, nehmen wir das erste Element
    const data = Array.isArray(res.data) ? res.data[0] || {} : res.data
    // Entferne das Feld "id", falls vorhanden, damit es nicht angezeigt wird
    if (data.id !== undefined) {
      delete data.id
    }
    metaData.value = data
  } catch (err) {
    console.error('❌ Fehler beim Laden der Meta-Daten:', err)
  } finally {
    isLoading.value = false
  }
}

// Speichern: Nur selektierte Felder werden gesendet
const saveMeta = async () => {
  isSaving.value = true
  saveMessage.value = ''
  try {
    // Erstelle ein Payload-Objekt nur mit den selektierten Feldern
    const payload = {}
    selectedFields.value.forEach(key => {
      payload[key] = metaData.value[key]
    })

    await axios.put(`${apiBaseUrl}/meta/${fassId}`, payload, {
      headers: {
        Authorization: `Bearer ${idToken.value}`,
        'Content-Type': 'application/json'
      }
    })
    saveMessage.value = '✅ Erfolgreich gespeichert'
    editableFields.value.clear()
    selectedFields.value.clear()
  } catch (err) {
    console.error('❌ Fehler beim Speichern:', err)
    saveMessage.value = '❌ Fehler beim Speichern'
  } finally {
    isSaving.value = false
  }
}

// Löschen: Löscht den gesamten Metadatensatz
const deleteMeta = async () => {
  try {
    await axios.delete(`${apiBaseUrl}/meta/${fassId}`, {
      headers: {
        Authorization: `Bearer ${idToken.value}`
      }
    })
    saveMessage.value = '🗑️ Metadaten gelöscht'
    metaData.value = {}
    editableFields.value.clear()
    selectedFields.value.clear()
  } catch (err) {
    console.error('❌ Fehler beim Löschen:', err)
    saveMessage.value = '❌ Fehler beim Löschen'
  }
}

// Checkbox toggeln
const toggleFieldSelection = (key) => {
  if (selectedFields.value.has(key)) {
    selectedFields.value.delete(key)
  } else {
    selectedFields.value.add(key)
  }
}

// Markierte Felder editierbar machen
const enableEdit = () => {
  editableFields.value = new Set(selectedFields.value)
}

// Neues Feld zur Meta-Daten hinzufügen
const addNewField = () => {
  const fieldName = newFieldName.value.trim()
  if (!fieldName) {
    alert('Bitte gib einen Feldnamen ein.')
    return
  }
  // Füge das neue Feld nur hinzu, wenn es noch nicht existiert
  if (metaData.value[fieldName] !== undefined) {
    alert(`Das Feld "${fieldName}" existiert bereits.`)
    return
  }
  // Füge das neue Feld hinzu; neuer Eintrag als Zeichenkette
  metaData.value[fieldName] = newFieldValue.value
  // Setze die neuen Felder zurück
  newFieldName.value = ''
  newFieldValue.value = ''
}

onMounted(fetchMeta)
</script>

<template>
  <div class="card">
    <h2 class="card-title mb-4">Meta-Daten – {{ fassId }}</h2>

    <div v-if="isLoading">
      <p>Lade Daten...</p>
    </div>

    <form v-else @submit.prevent="saveMeta" class="space-y-4">
      <!-- Bestehende Felder -->
      <div
          v-for="(value, key) in metaData"
          :key="key"
          class="flex items-center space-x-4"
      >
        <input
            type="checkbox"
            :checked="selectedFields.has(key)"
            @change="toggleFieldSelection(key)"
        />
        <label class="w-40 font-medium capitalize">{{ String(key).replace(/_/g, ' ') }}</label>
        <input
            v-model="metaData[key]"
            :disabled="!editableFields.has(key)"
            :type="typeof value === 'number' ? 'number' : 'text'"
            class="input input-bordered flex-1"
        />
      </div>

      <!-- Neues Feld hinzufügen -->
      <div class="border p-4 rounded mt-6">
        <h3 class="font-semibold mb-2">Neues Feld hinzufügen</h3>
        <div class="flex flex-col space-y-2">
          <input
              v-model="newFieldName"
              placeholder="Feldname (z.B. neuer_parameter)"
              class="input input-bordered"
          />
          <input
              v-model="newFieldValue"
              placeholder="Wert"
              class="input input-bordered"
          />
          <button type="button" class="btn btn-secondary" @click="addNewField">
            ➕ Feld hinzufügen
          </button>
        </div>
      </div>

      <!-- Aktionen -->
      <div class="flex items-center space-x-4 mt-6">
        <button
            type="button"
            class="btn btn-outline"
            @click="enableEdit"
            :disabled="selectedFields.size === 0"
        >
          ✏️ Edit
        </button>
        <button
            type="submit"
            class="btn btn-primary"
            :disabled="isSaving || selectedFields.size === 0"
        >
          {{ isSaving ? 'Speichern...' : 'Speichern' }}
        </button>
        <button type="button" class="btn btn-error" @click="deleteMeta">
          🗑️ Löschen
        </button>
        <span v-if="saveMessage">{{ saveMessage }}</span>
      </div>
    </form>
  </div>
</template>
