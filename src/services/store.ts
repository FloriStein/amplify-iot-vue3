import { defineStore } from "pinia";
import { ref, computed } from 'vue';
import { getCurrentUser } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { fetchAuthSession } from 'aws-amplify/auth'
import api from "./api";

export const useStore = defineStore('auth', () => {
  const user = ref<any | null>(null);
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);
  const vessels = ref([]);

  // Hole aktuellen Nutzer
  async function fetchUser() {
    try {
      user.value = await getCurrentUser();
    } catch {
      user.value = null;
    }
  }

  async function fetchVessels(){
    loading.value = true;
    error.value = null;

    try {
        vessels.value = await api.fetchVessels();
    } catch(ex) {
        error.value = String(ex);
        console.error(ex);
    } finally {
        loading.value = false;
    }
}

  // Automatische Reaktion auf Login/Logout/Token Refresh
  Hub.listen('auth', (data) => {
    const { event } = data.payload;
    if (['signedIn', 'signedOut', 'tokenRefresh'].includes(event)) {
      fetchUser();
    }
  });

  // Initialer Check
  fetchUser();

  const isLoggedIn = computed(() => !!user.value);

  return {
    user,
    isLoggedIn,
    fetchUser
  };
});