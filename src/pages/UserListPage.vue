<script setup lang="ts">
    import { computed, ref } from "vue";
    import { useStore } from "../services/store";
    import GenericListPage from './GenericListPage.vue';

    const store = useStore();
    store.fetchUsers();

    const isAdmin = computed(() => store.user?.isAdmin ?? false);
    const isLoading = computed(() => store.loading);
    const users = computed(() => store.users.map(user => ({id: user.email, status: user.status})) ?? []);
    const schemas = ref([
        {
            field_name: "email",
            field_type: "string",
            is_required: true,
            validation_rule: null
        }
    ]);

    function onSaveNode(data : {[key: string]: string | null}) {
        if(!data.email){
            console.error("Can not add user without email: ", data);
            return;
        }

        console.log("Saving User: ", data.email);
        store.addUser(data.email);
    }

    function onRemoveUsers(emails : string[]) {
        console.log("Deleting Users: ", emails);
        store.removeUsers(emails);
    }

</script>

<template>
    <GenericListPage 
        resource-name="User" 
        :is-admin="isAdmin" 
        :loading="isLoading" 
        :data="users" 
        :schemas="schemas"
        :editable="false"
        :clickable="false"
        @save="onSaveNode"
        @delete="onRemoveUsers"
    />
</template>