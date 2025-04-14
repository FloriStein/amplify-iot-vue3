<template>
  <div class="grafana-dashboard">
    <h2>📊 Dashboard: {{ dashboardTitle }}</h2>

    <div v-if="loading">Lade Dashboard...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <ul v-else>
      <li v-for="panel in panels" :key="panel.id">
        🧩 Panel {{ panel.id }}: {{ panel.title }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const dashboardUID = 'beiqd50j7lekgd' // <--- hier einsetzen
const grafanaUrl = 'http://3.124.186.35:3000' // <--- z. B. https://grafana.mycompany.com
const apiKey = 'glsa_dtHjwtEnUVmmCpjyvlPwVoIUFKIW2a7G_e9c0b11c' // <--- API-Key mit "Viewer"-Rechten

const dashboardTitle = ref('')
const panels = ref([])
const error = ref(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const response = await fetch(`${grafanaUrl}/api/grafana/dashboard/${dashboardUID}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      }
    })

    if (!response.ok) {
      throw new Error(`Fehler beim Laden des Dashboards: ${response.statusText}`)
    }

    const data = await response.json()
    dashboardTitle.value = data.dashboard.title
    panels.value = data.dashboard.panels
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
})
</script>
