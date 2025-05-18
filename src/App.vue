<script setup>
  import { Amplify } from 'aws-amplify';
  import awsExports from './aws-exports';
  import { Authenticator } from '@aws-amplify/ui-vue';
  import '@aws-amplify/ui-vue/styles.css';
  import Dashboard from "./components/Dashboard.vue";
  Amplify.configure(awsExports);
</script>

<template>
  <authenticator hide-sign-up>
    <template v-slot="{ user, signOut }">
      <Dashboard />
     <!-- <DistanzSensor />-->
      <button @click="signOut">Abmelden</button>
    </template>
  </authenticator>
</template>

