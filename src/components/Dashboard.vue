<script setup>
import { ref, onMounted } from 'vue'
import { fetchAuthSession } from 'aws-amplify/auth'
import SensorCard from './SensorCard.vue'
import AdminPanel from "./AdminPanel.vue";
import MetadataAdminPanel from "./MetadataAdminPanel.vue";
import SubscriptionSwitch from './SubscriptionSwitch.vue'

const isAdmin = ref(false)

const checkIfAdmin = async () => {
  try {
    const session = await fetchAuthSession()
    const groups = session.tokens?.idToken?.payload?.['cognito:groups'] || []
    isAdmin.value = groups.includes('Admin')
    console.log('👤 Benutzergruppen:', groups)
  } catch (err) {
    console.error('Fehler beim Admin-Check:', err)
  }
}

onMounted(() => {
  checkIfAdmin()
})
</script>


<template>
  <div class="dashboard p-6 bg-gray-100 min-h-screen">
    <!--<DistanzSensor />-->
    <SensorCard />
    <SubscriptionSwitch />
    <AdminPanel v-if="isAdmin" class="mt-6" />
    <MetadataAdminPanel v-if="isAdmin" class="mt-6" />
  </div>
</template>

