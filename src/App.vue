<script setup>
  import { onMounted } from 'vue'
  import { initFlowbite } from 'flowbite'
  import Navbar from './components/navigation/Navbar.vue'
import LoadingOverlay from './components/LoadingOverlay.vue';

  onMounted(() => {
    initFlowbite();
  })
</script>

<template>
  <div>
    <Navbar/>
    <RouterView/>
  </div>
</template>

