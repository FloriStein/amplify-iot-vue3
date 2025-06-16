<script setup lang="ts">
    import { Authenticator } from '@aws-amplify/ui-vue';
    import '@aws-amplify/ui-vue/styles.css';
    import { useRouter, useRoute } from 'vue-router';
    const router = useRouter();
    const route = useRoute();
    var redirectTo = route.query.redirect;
    if(redirectTo == null)
        redirectTo = '/';

    function redirect() {
        console.log(route.query.redirect);
        console.log("Redirecting to", redirectTo);
        router.push(redirectTo as string);
    }
</script>

<template>
  <h1 class="text-3xl mb-8 text-center">Login</h1>
  <Authenticator hide-sign-up>
    <template v-slot="{ user: slotUser }">
      <div v-if="slotUser">
        <button type="button" @click="redirect()" class="text-primary-foreground bg-primary hover:bg-primary-hover focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 text-center">
          Continue
        </button>
      </div>
    </template>
  </Authenticator>
</template>
