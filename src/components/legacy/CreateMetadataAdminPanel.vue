<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'
import { fetchAuthSession } from 'aws-amplify/auth'

const resourceType = ref('vessel')
const fields = ref([])
const formData = ref({})
const loading = ref(false)
const error = ref('')
const success = ref('')

const apiUrl = 'https://fxxok2wf3d.execute-api.eu-central-1.amazonaws.com/dev'

const getAuthToken = async () => {
  console.log('🔐 Token wird angefordert …')
  try {
    const session = await fetchAuthSession()
    const rawToken = session.tokens?.idToken
    if (!rawToken) {
      console.warn('⚠️ Kein gültiges ID-Token in Session gefunden:', session)
      error.value = 'Nicht authentifiziert – bitte melde dich an.'
      return null
    }
    const token = String(rawToken)
    console.log('✅ Token erfolgreich erhalten:', token.slice(0, 20) + '...')
    return token
  } catch (err) {
    console.error('❌ Fehler beim Abrufen des Tokens:', err)
    error.value = 'Authentifizierung fehlgeschlagen. Bitte melde dich erneut an.'
    return null
  }
}

const mapFieldTypeToInputType = (fieldType) => {
  if (fieldType.startsWith('varchar')) return 'text'
  if (fieldType.startsWith('decimal') || fieldType.startsWith('int')) return 'number'
  if (fieldType === 'string') return 'text'
  return 'text' // Fallback
}

const fetchSchema = async () => {
  console.log(`📦 Starte fetchSchema() für: ${resourceType.value}`)
  loading.value = true
  error.value = ''
  success.value = ''

  try {
    const token = await getAuthToken()
    if (!token) {
      error.value = 'Keine gültige Authentifizierung.'
      return
    }

    const url = `${apiUrl}/meta/schema?resource_type=${resourceType.value}`
    console.log(`🌐 Sende GET-Anfrage an: ${url}`)

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    })

    console.log('✅ Schema erfolgreich geladen:', response.data)

    fields.value = response.data.schema.fields
    console.log('📋 Felder:', fields.value)

    formData.value = {}
    fields.value.forEach((field) => {
      formData.value[field.field_name] = ''
    })

    console.log('📝 formData initialisiert:', formData.value)
  } catch (err) {
    console.error('❌ Fehler beim Laden des Schemas:', err)
    error.value = 'Fehler beim Abrufen des Schemas. Bitte versuche es später erneut.'
  } finally {
    loading.value = false
  }
}

const saveResource = async () => {
  console.log('📨 Sende Daten:', formData.value)
  loading.value = true
  error.value = ''
  success.value = ''

  try {
    const token = await getAuthToken()
    if (!token) {
      error.value = 'Keine gültige Authentifizierung.'
      return
    }

    const url = `${apiUrl}/admin/meta/create`
    console.log(`🌐 Sende POST an: ${url}`)

    const payload = {
      resource_type: resourceType.value,
      data: formData.value
    }

    const response = await axios.post(url, payload, {
      headers: { Authorization: `Bearer ${token}` }
    })

    console.log('✅ Formulardaten erfolgreich gespeichert:', response.data)
    success.value = `✅ Daten erfolgreich gespeichert (ID: ${response.data.insertId || 'unbekannt'})`
  } catch (err) {
    console.error('❌ Fehler beim Speichern der Daten:', err)

    if (err.response) {
      const backendError = err.response.data?.error || 'Unbekannter Fehler'
      error.value = `Fehler beim Speichern: ${backendError}`
    } else {
      error.value = 'Netzwerkfehler beim Speichern.'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  console.log('🚀 Komponente gemountet – lade initiales Schema')
  fetchSchema()
})

watch(resourceType, (newVal, oldVal) => {
  console.log(`🔄 Dropdown-Wert geändert: ${oldVal} → ${newVal}`)
  fetchSchema()
})
</script>

<template>
  <div class="card">
    <h2 class="card-title mb-6">Komponenten erstellen</h2>

    <!-- Dropdown -->
    <div class="flex flex-col md:flex-row gap-4 mb-6">
      <div class="flex-1">
        <label class="block text-lg font-medium text-card-foreground mb-1">Ressource auswählen</label>
        <select v-model="resourceType" class="p-2 w-full bg-input text-input-foreground border-border rounded rounded-md">
          <option value="vessel">Vessel</option>
          <option value="measuring_station">Measuring Station</option>
          <option value="sensor">Sensor</option>
        </select>
      </div>
    </div>

    <!-- Dynamisches Formular -->
    <form @submit.prevent="saveResource" class="space-y-4">
      <div v-for="(field, index) in fields" :key="index" class="grid grid-cols-3">
        <label class="col-span-1 font-medium capitalize text-left">{{ field.field_name }}</label>
        <input
            v-model="formData[field.field_name]"
            :type="mapFieldTypeToInputType(field.field_type)"
            :placeholder="field.field_name"
            class="p-2 bg-input text-input-foreground border-border rounded rounded-md col-span-2"
            :required="field.is_required"
        />
      </div>

      <div class="mt-4 text-left">
        <button type="submit" class="bg-primary text-primary-foreground px-4 py-2 rounded rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:hover:bg-primary" :disabled="loading.value">Speichern</button>
      </div>
    </form>

    <!-- Feedback -->
    <div v-if="success.value" class="mt-4 text-sm text-green-600">{{ success.value }}</div>
    <div v-if="error.value" class="mt-4 text-sm text-red-600">{{ error.value }}</div>
    <div v-if="loading.value" class="mt-4">Wird verarbeitet…</div>
  </div>
</template>