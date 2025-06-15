<script setup>
import { ref, onMounted } from 'vue'
import { fetchAuthSession } from 'aws-amplify/auth'

// Komponenten für die Dashboard-Anzeige
import SensorCard from './SensorCard.vue'
import AdminPanel from "./AdminPanel.vue"
import MetadataAdminPanel from "./MetadataAdminPanel.vue"
import SubscriptionSwitch from './SubscriptionSwitch.vue'
import CommandPanel from "./CommandPanel.vue"
import CreateMetadataAdminPanel from "./CreateMetadataAdminPanel.vue"

// Reaktive Variable zur Bestimmung, ob der Benutzer Admin ist
const isAdmin = ref(false)

// Überprüft mithilfe des Cognito-Tokens, ob der Benutzer zur Gruppe "Admin" gehört
const checkIfAdmin = async () => {
  try {
    const session = await fetchAuthSession()

    // Auslesen der Gruppeninformationen aus dem ID-Token
    const groups = session.tokens?.idToken?.payload?.['cognito:groups'] || []

    // Setzt isAdmin auf true, wenn die Gruppe "Admin" enthalten ist
    isAdmin.value = groups.includes('Admin')
  } catch (err) {
    console.error('Fehler beim Admin-Check:', err)
  }
}

// Lifecycle-Hook: Führe Admin-Check beim Laden der Komponente aus
onMounted(() => {
  checkIfAdmin()
})
</script>


<template>
  <div class="flex flex-col p-6 bg-background min-h-screen gap-6">
    <SensorCard />
    <SubscriptionSwitch/>
    <AdminPanel v-if="isAdmin" class="mt-6" />
    <MetadataAdminPanel v-if="isAdmin" class="mt-6" />
    <CreateMetadataAdminPanel v-if="isAdmin" class="mt-6" />
    <CommandPanel v-if="isAdmin" class="mt-6" />
  </div>
</template>
