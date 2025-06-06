<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { fetchAuthSession } from 'aws-amplify/auth'

const users = ref([])
const loading = ref(true)
const newUserEmail = ref('')
const apiUrl = 'https://fxxok2wf3d.execute-api.eu-central-1.amazonaws.com/dev/admin/users'

const fetchUsers = async () => {
  loading.value = true
  try {
    const session = await fetchAuthSession()
    const token = session.tokens.idToken

    const res = await axios.get(apiUrl, {
      headers: {
        Authorization: token
      }
    })
    users.value = res.data
  } catch (err) {
    console.error('Fehler beim Laden der Benutzer:', err)
  }
  loading.value = false
}

const addUser = async () => {
  try {
    const session = await fetchAuthSession()
    const token = session.tokens.idToken

    await axios.post(apiUrl, { email: newUserEmail.value }, {
      headers: {
        Authorization: token,
        'Content-Type': 'application/json'
      }
    })

    newUserEmail.value = ''
    fetchUsers()
  } catch (err) {
    console.error('Fehler beim Hinzufügen:', err)
  }
}

const takeAction = async (username, action) => {
  try {
    const session = await fetchAuthSession()
    const token = session.tokens.idToken

    await axios.delete(`${apiUrl}/${username}`, {
      headers: {
        Authorization: token
      }
    })
    fetchUsers()
  } catch (error) {
    console.error(`Fehler bei Aktion ${action} für ${username}:`, error)
  }
}

onMounted(fetchUsers)
</script>

<template>
  <div class="card">
    <h2 class="card-title mb-4">Benutzerverwaltung</h2>

    <form @submit.prevent="addUser" class="mb-4 grid grid-cols-3 gap-2">
      <input v-model="newUserEmail" type="email" placeholder="E-Mail eingeben" class="bg-input col-span-2 text-input-foreground border border-border px-4 py-2 rounded rounded-lg w-full" required />
      <button type="submit" class="bg-primary text-primary-foreground col-span-1 w-full px-4 py-2 rounded rounded-lg hover:bg-primary-hover">➕ Hinzufügen</button>
    </form>

    <div class="flex justify-end mb-2">
      <button @click="fetchUsers" class="bg-input text-input-foreground px-4 py-2 rounded rounded-lg hover:bg-input-hover">
        🔄 Aktualisieren
      </button>
    </div>

    <div v-if="loading">Lade Benutzer…</div>
    <table v-else class="w-full border border-border rounded rounded-lg">
      <thead>
      <tr class="bg-table text-table-foreground w-full border border-border rounded rounded-lg text-left">
        <th class="px-4 py-2">E-Mail</th>
        <th class="px-4 py-2">Status</th>
        <th class="px-4 py-2">Aktion</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="user in users" :key="user.username" class="border-t">
        <td class="px-4 py-2">{{ user.email }}</td>
        <td class="px-4 py-2">{{ user.status }}</td>
        <td class="px-4 py-2">
          <a @click="takeAction(user.username, 'delete')" class="font-medium cursor-pointer text-red-500 hover:underline hover:text-primary-hover">✖ Löschen</a>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

