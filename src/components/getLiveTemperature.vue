<script setup>
import { onMounted, ref } from 'vue'
import { PubSub } from '@aws-amplify/pubsub'
import { fetchAuthSession } from "aws-amplify/auth";

// Ersetze diesen Endpunkt durch deinen spezifischen AWS IoT Core MQTT WebSocket-Endpunkt
const pubsub = new PubSub({
  region: 'eu-central-1',
  endpoint: 'wss://a2tnej84qk5j60-ats.iot.eu-central-1.amazonaws.com/mqtt',
  credentials: async () => {
    const session = await fetchAuthSession();
    return session.credentials;
  }
})

const response = ref('Warte auf Antwort...')

// Funktion zum Senden einer Anfrage
const sendRequest = async () => {
  try {
    await pubsub.publish({
      topics: 'esp32/requestDistance',
      message: { command: 'getDistance' },
    })
    console.log('Anfrage gesendet')
  } catch (error) {
    console.error('Fehler beim Senden der Anfrage:', error)
  }
}

// Beim Mounten der Komponente abonnieren wir das Antwort-Topic
onMounted(() => {

  pubsub.subscribe({ topics: 'esp32/responseDistance' }).subscribe({
    next: (data) => {
      console.log('Empfangene MQTT Nachricht:', data)
      console.log('Antwort erhalten:', data.distance)
      response.value = JSON.stringify(data.distance)
    },
    error: (error) => {
      console.error('Fehler beim Empfangen der Antwort:', error)
    },
    complete: () => {
      console.log('Abonnement abgeschlossen')
    },
  })
})
</script>

<template>
  <div>
    <p>Antwort: {{ response }}</p>
    <button @click="sendRequest">Anfrage senden></button>
  </div>
</template>
