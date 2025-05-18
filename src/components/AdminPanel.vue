<script setup>
import { ref, onMounted } from 'vue'
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

    const res = await fetch(apiUrl, {
      headers: {
        Authorization: token
      }
    })
    users.value = await res.json()
  } catch (err) {
    console.error('Fehler beim Laden der Benutzer:', err)
  }
  loading.value = false
}

const addUser = async () => {
  try {
    const session = await fetchAuthSession()
    const token = session.tokens.idToken

    await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: newUserEmail.value })
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

    await fetch(`${apiUrl}/${username}`, {
      method: 'DELETE',
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
    <h2 class="card-title mb-4">🛡 Benutzerverwaltung</h2>

    <form @submit.prevent="addUser" class="mb-4 flex gap-2 justify-center">
      <input v-model="newUserEmail" type="email" placeholder="E-Mail eingeben" class="border px-4 py-2 rounded w-64" required />
      <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">➕ Hinzufügen</button>
    </form>

    <div class="flex justify-end mb-2">
      <button @click="fetchUsers" class="bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300">
        🔄 Aktualisieren
      </button>
    </div>


    <div v-if="loading">Lade Benutzer…</div>
    <table v-else class="w-full border border-gray-200 text-left">
      <thead>
      <tr class="bg-gray-100">
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
          <button @click="takeAction(user.username, 'delete')" class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">✖ Löschen</button>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

