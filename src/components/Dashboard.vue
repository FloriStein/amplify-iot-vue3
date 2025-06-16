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
    console.log("IdentityId:", session.identityId);
    console.log("AWS Credentials:", session.credentials);
    // Komplettes Session-Objekt loggen
    //console.log("Cognito Session:", session)

    // Zugriff auf Tokens
    const idToken = session.tokens?.idToken
    const accessToken = session.tokens?.accessToken

    // ID-Token Payload loggen (sehr wichtig)
    if (idToken) {
      console.log("ID Token Payload:", idToken.payload)

      // Wichtige Debug-Infos ausgeben:
      console.log("User Sub:", idToken.payload.sub)
      console.log("Username:", idToken.payload['cognito:username'])
      console.log("Audience (App Client ID):", idToken.payload.aud)
      console.log("Groups:", idToken.payload['cognito:groups'])
    } else {
      console.warn("Kein ID Token vorhanden.")
    }

    // Access Token Payload auch loggen (optional)
    if (accessToken) {
      console.log("Access Token Payload:", accessToken.payload)
    }




    // Auslesen der Gruppeninformationen aus dem ID-Token
    const groups = idToken?.payload?.['cognito:groups'] || []

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
  <div class="dashboard p-6 bg-gray-100 min-h-screen">
    <SensorCard />
    <SubscriptionSwitch/>
    <AdminPanel v-if="isAdmin" class="mt-6" />
    <MetadataAdminPanel v-if="isAdmin" class="mt-6" />
    <CreateMetadataAdminPanel v-if="isAdmin" class="mt-6" />
    <CommandPanel v-if="isAdmin" class="mt-6" />
  </div>
</template>
