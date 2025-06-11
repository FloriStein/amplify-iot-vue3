<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'
import { fetchAuthSession } from 'aws-amplify/auth'

const resourceType = ref('vessel')
const fields = ref([])
const formData = ref({})
const resourceMeta = ref(null)
const loading = ref(false)
const error = ref('')

const apiUrl = 'https://fxxok2wf3d.execute-api.eu-central-1.amazonaws.com/dev/meta'

const getAuthToken = async () => {
  console.log('🔐 Token wird angefordert …')
  try {
    const session = await fetchAuthSession()

    // Sicherstellen, dass ID-Token vorhanden und als String interpretierbar ist
    const rawToken = session.tokens?.idToken
    if (!rawToken) {
      console.warn('⚠️ Kein gültiges ID-Token in Session gefunden:', session)
      error.value = 'Nicht authentifiziert – bitte melde dich an.'
      return null
    }

    const token = String(rawToken) // Wandelt Token-Objekt in tatsächlichen JWT-String um
    console.log('✅ Token erfolgreich erhalten:', token.slice(0, 20) + '...') // nur Anfang ausgeben
    return token
  } catch (err) {
    console.error('❌ Fehler beim Abrufen des Tokens:', err)
    error.value = 'Authentifizierung fehlgeschlagen. Bitte melde dich erneut an.'
    return null
  }
}



const fetchSchema = async () => {
  console.log(`📦 Starte fetchSchema() für: ${resourceType.value}`)
  loading.value = true
  error.value = ''

  try {
    const token = await getAuthToken()
    if (!token) {
      console.warn('⚠️ Kein Token vorhanden – Abbruch')
      error.value = 'Keine gültige Authentifizierung.'
      return
    }

    const url = `${apiUrl}/schema?resource_type=${resourceType.value}`
    console.log(`🌐 Sende GET-Anfrage an: ${url}`)

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('✅ Schema erfolgreich geladen:', response.data)

    fields.value = response.data.schema.fields
    console.log('📋 Felder:', fields.value)

    formData.value = {}
    fields.value.forEach((field) => {
      formData.value[field.field_name] = ''
    })

    console.log('📝 formData initialisiert:', formData.value)

    loadResourceMeta()
  } catch (err) {
    console.error('❌ Fehler beim Laden des Schemas:', err)
    error.value = 'Fehler beim Abrufen des Schemas. Bitte versuche es später erneut.'
  } finally {
    loading.value = false
  }
}

const loadResourceMeta = async () => {
  console.log(`📡 Lade Metadaten für: ${resourceType.value}`)
  try {
    const token = await getAuthToken()
    if (!token) {
      error.value = 'Keine gültige Authentifizierung.'
      return
    }

    const url = `${apiUrl}/resource-meta?resource_type=${resourceType.value}`
    console.log(`🌐 Sende GET-Anfrage an: ${url}`)

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('📦 Metadaten empfangen:', response.data)
    resourceMeta.value = response.data.meta
  } catch (err) {
    console.error('❌ Fehler beim Laden der Ressource-Metadaten:', err)
    error.value = 'Fehler beim Abrufen der Ressource-Metadaten. Bitte versuche es später erneut.'
  }
}

const saveResource = async () => {
  console.log('📨 Sende Daten:', formData.value)
  loading.value = true
  error.value = ''

  try {
    const token = await getAuthToken()
    if (!token) {
      error.value = 'Keine gültige Authentifizierung.'
      return
    }

    const url = `${apiUrl}/resource`
    console.log(`🌐 Sende POST an: ${url}`)

    const response = await axios.post(url, formData.value, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('✅ Formulardaten erfolgreich gespeichert:', response.data)
  } catch (err) {
    console.error('❌ Fehler beim Speichern der Daten:', err)
    error.value = 'Fehler beim Speichern der Daten. Bitte versuche es später erneut.'
  } finally {
    loading.value = false
  }
}

// Schema beim ersten Laden holen
onMounted(() => {
  console.log('🚀 Komponente gemountet – lade initiales Schema')
  fetchSchema()
})

// Reaktiv auf Änderungen von resourceType reagieren
watch(resourceType, (newVal, oldVal) => {
  console.log(`🔄 Dropdown-Wert geändert: ${oldVal} → ${newVal}`)
  fetchSchema()
})
</script>



<template>
  <div class="card p-6 max-w-4xl mx-auto">
    <h2 class="text-2xl font-bold mb-6">Komponenten Erstellen</h2>
    <!-- Dropdown für Ressourcenauswahl -->
    <div class="flex flex-col md:flex-row gap-4 mb-6">
      <div class="flex-1">
        <label class="block font-semibold mb-1">Ressource auswählen</label>
        <select v-model="resourceType" class="input input-bordered w-full">
          <option value="vessel">Vessel</option>
          <option value="measuring_station">Measuring Station</option>
          <option value="sensor">Sensor</option>
        </select>
      </div>
    </div>
    <!-- Dynamische Formulargenerierung basierend auf den geladenen Feldern -->
    <form @submit.prevent="saveResource" class="space-y-4">
      <div v-for="(field, index) in fields" :key="index" class="flex items-center space-x-3">
        <label class="w-40 font-medium capitalize">{{ field.field_name }}</label>
        <!-- Dynamisches Formularfeld basierend auf dem Typ -->
        <input
            v-if="field.field_type === 'string'"
            v-model="formData[field.field_name]"
            type="text"
            :placeholder="field.field_name"
            class="input input-bordered flex-1"
            :required="field.is_required"
        />
        <input
            v-if="field.field_type === 'decimal' || field.field_type === 'int'"
            v-model="formData[field.field_name]"
            type="number"
            :placeholder="field.field_name"
            class="input input-bordered flex-1"
            :required="field.is_required"
        />
        <input
            v-if="field.field_type === 'varchar(256)'"
            v-model="formData[field.field_name]"
            type="text"
            :placeholder="field.field_name"
            class="input input-bordered flex-1"
            :required="field.is_required"
        />
      </div>

      <div class="mt-4">
        <button type="submit" class="btn btn-primary" :disabled="loading.value">Speichern</button>
      </div>
    </form>
    <!-- Anzeige der Metadaten -->
    <div v-if="resourceMeta" class="mt-6 space-y-4">
      <details class="border rounded p-4 bg-gray-50">
        <summary class="font-semibold cursor-pointer">Metadaten anzeigen</summary>
        <div class="mt-2 space-y-1 text-sm text-gray-700">
          <template v-for="(value, key) in resourceMeta" :key="key">
            <p><strong>{{ key }}:</strong> {{ value }}</p>
          </template>
        </div>
      </details>
    </div>
    <!-- Fehleranzeige -->
    <div v-if="error.value" class="mt-4 text-sm text-red-600">
      {{ error.value }}
    </div>
    <!-- Ladeanzeige -->
    <div v-if="loading.value" class="mt-4">Wird verarbeitet…</div>
  </div>
</template>


