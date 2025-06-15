<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { fetchAuthSession } from 'aws-amplify/auth'
import { PubSub } from '@aws-amplify/pubsub'

// Reaktive Variablen zur Steuerung des Formularzustands
const command = ref('')         // Vom Benutzer eingegebener Befehl
const response = ref('')        // Antwort vom ESP32 (über MQTT)
const isSending = ref(false)    // Ladespinner / Button-Status
const idToken = ref('')         // JWT-Token für die Authentifizierung

let subscription                 // Referenz zum MQTT-Abonnement

// MQTT-Thema, auf das geantwortet wird (z. B. vom Gerät)
const topicResponse = 'sqscommand'

// URL für die REST-API, an die der Befehl gesendet wird
const apiUrl = 'https://fxxok2wf3d.execute-api.eu-central-1.amazonaws.com/dev/admin/command'

// Einrichtung des MQTT-Clients (WebSocket zu AWS IoT)
const pubsub = new PubSub({
  region: 'eu-central-1',
  endpoint: 'wss://a2tnej84qk5j60-ats.iot.eu-central-1.amazonaws.com/mqtt',
  credentials: async () => {
    const session = await fetchAuthSession()
    return session.credentials
  }
})

// Hole das aktuelle Authentifizierungstoken für HTTP-Anfragen
async function loadToken() {
  try {
    const session = await fetchAuthSession()
    idToken.value = session.tokens?.idToken?.toString()
  } catch (err) {
    console.error('❌ Fehler beim Laden des Tokens:', err)
  }
}

// Funktion zum Senden des Textbefehls über REST-API
const sendCommand = async () => {
  if (!command.value) return // Kein Befehl eingegeben

  isSending.value = true
  response.value = ' Warte auf Antwort...'

  try {
    const result = await axios.post(apiUrl, { command: command.value }, {
      headers: {
        Authorization: `Bearer ${idToken.value}`, // Authentifizierung via JWT
        'Content-Type': 'application/json'
      }
    })
    // Hinweis: REST-Aufruf ist nur Auslöser – Antwort kommt über MQTT
  } catch (err) {
    console.error('❌ Fehler beim Senden:', err)
    response.value = `❌ Fehler: ${err.response?.data?.message || err.message}`
  } finally {
    isSending.value = false
  }
}

// Setzt das Eingabefeld und die Antwortanzeige zurück
const resetCommand = () => {
  command.value = ''
  response.value = ''
}

// Lifecycle: Wenn die Komponente gemountet wird
onMounted(async () => {
  await loadToken()

  // Abonniere das MQTT-Thema, um Antworten vom Gerät zu empfangen
  subscription = pubsub.subscribe({ topics: topicResponse }).subscribe({
    next: (data) => {
      const value = data?.value ?? data
      let text = ''

      // Versuche, die eingehenden Daten in lesbaren Text umzuwandeln
      if (typeof value === 'string') {
        text = value
      } else if (typeof value === 'object') {
        text = JSON.stringify(value)
      } else {
        text = String(value)
      }

      try {
        const parsed = JSON.parse(text)

        // Wenn die Antwort ein JSON mit "command" enthält, nur das zeigen
        if (parsed?.command) {
          response.value = parsed.command
        } else {
          // Sonst formatiertes JSON anzeigen
          response.value = JSON.stringify(parsed, null, 2)
        }
      } catch (e) {
        // Falls keine gültige JSON-Struktur → plain text anzeigen
        console.warn(' JSON-Parsing fehlgeschlagen:', e)
        response.value = text
      }
    },
    error: (err) => {
      console.error('❌ MQTT Fehler:', err)
      response.value = '❌ Fehler beim MQTT-Abonnement'
    },
    complete: () => {
      console.log(' MQTT-Abo beendet')
    }
  })
})

// Lifecycle: Vor dem Entfernen der Komponente → Abo beenden
onBeforeUnmount(() => {
  if (subscription) {
    console.log(' MQTT-Abo wird beendet')
    subscription.unsubscribe()
  }
})
</script>

<template>
  <div class="card">
    <h2 class="card-title mb-6">Node Befehl senden</h2>
    <form @submit.prevent="sendCommand" class="space-y-4">
      <div>
        <label class="block text-lg font-medium text-card-foreground mb-1">Textbefehl</label>
        <input
            v-model="command"
            type="text"
            class="bg-input text-input-foreground border border-border rounded-lg w-full"
            placeholder="Command-Text"
        />
      </div>
      <div class="flex space-x-4">
        <button type="submit" class="bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:bg-primary-hover" :disabled="isSending || !command">
          {{ isSending ? 'Senden...' : 'Senden' }}
        </button>
        <button type="button" class="bg-red-500 text-primary-foreground rounded-lg px-4 py-2 hover:bg-red-400" @click="resetCommand">
          Zurücksetzen
        </button>
      </div>
      <div>
        <label class="block text-lg font-medium text-card-foreground mb-1">Antwort der Node</label>
        <textarea
            class="bg-input text-input-foreground border border-border rounded-lg w-full"
            rows="3"
            readonly
            :value="response"
        ></textarea>
      </div>
    </form>
  </div>
</template>