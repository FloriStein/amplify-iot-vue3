<script setup>
  import { Amplify } from 'aws-amplify';
  import awsExports from './aws-exports';
  import { Authenticator } from '@aws-amplify/ui-vue';
  import '@aws-amplify/ui-vue/styles.css';
  import getLiveTemperature from './components/getLiveTemperature.vue';
  import GrafanQuery from './components/GrafanQuery.vue'
  Amplify.configure(awsExports);
</script>

<template>
  <authenticator>
    <template v-slot="{ user, signOut }">
      <GrafanQuery />
      <getLiveTemperature />
      <button @click="signOut">Abmelden</button>
    </template>
  </authenticator>
</template>

