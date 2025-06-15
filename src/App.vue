<script setup>
  import { onMounted } from 'vue'
  import { initFlowbite } from 'flowbite'
  import Navbar from './components/navigation/Navbar.vue'
  import LoadingOverlay from './components/LoadingOverlay.vue';
  import { useMqttClient } from './services/mqttClient';

  const mqttClient = useMqttClient();

  onMounted(() => {
    initFlowbite();
    mqttClient.startIfAuthenticated();
  })
</script>

<template>
  <div>
    <Navbar/>
    <RouterView/>
  </div>
</template>

