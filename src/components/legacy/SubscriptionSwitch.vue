<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { fetchAuthSession } from 'aws-amplify/auth'

const subscribed = ref(false)
const loading = ref(false)
const error = ref(null)

const apiUrl = 'https://fxxok2wf3d.execute-api.eu-central-1.amazonaws.com/dev/user/subscription'

const updateSubscription = async (action) => {
  loading.value = true
  error.value = null

  try {
    const session = await fetchAuthSession()
    const token = session.tokens.idToken

    const config = {
      headers: {
        Authorization: token,
        'Content-Type': 'application/json'
      }
    }

    if (action === 'subscribe') {
      await axios.put(apiUrl, {}, config)
    } else {
      await axios.delete(apiUrl, config)
    }

    subscribed.value = action === 'subscribe'
  } catch (err) {
    error.value = err.response?.data?.error || err.message || 'Unbekannter Fehler'
  } finally {
    loading.value = false
  }
}

const fetchSubscriptionStatus = async () => {
  loading.value = true
  error.value = null

  try {
    const session = await fetchAuthSession()
    const token = session.tokens.idToken

    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: token
      }
    })

    subscribed.value = !!response.data.subscribed
  } catch (err) {
    error.value = err.response?.data?.error || err.message || 'Fehler beim Statusabruf'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchSubscriptionStatus()
})
</script>

<template>
  <div class="card">
    <h2 class="card-title mb-2">Benachrichtigungen</h2>
    <p class="mb-4 text-sm card-foreground">Empfange E-Mail-Benachrichtigungen über neue Sensordaten.</p>
    <div class="flex flex-row justify-center items-center gap-4">
      <button
          @click="updateSubscription('subscribe')"
          :disabled="loading || subscribed"
          class="bg-primary text-primary-foreground px-4 py-2 rounded rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:hover:bg-primary"
      >
        Aktivieren
      </button>
      <button
          @click="updateSubscription('unsubscribe')"
          :disabled="loading || !subscribed"
          class="bg-input text-input-foreground px-4 py-2 rounded rounded-lg hover:bg-input-hover disabled:opacity-50 disabled:hover:bg-input"
      >
        Deaktivieren
      </button>
      <span v-if="loading" class="text-sm text-gray-500">Wird verarbeitet…</span>
    </div>
    <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
  </div>
</template>
