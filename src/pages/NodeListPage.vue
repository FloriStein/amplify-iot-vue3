<script setup lang="ts">
    import { computed } from "vue";
    import { useStore } from "../services/store";
    import GenericListPage from './GenericListPage.vue';
    import { useRouter } from 'vue-router';

    const router = useRouter();
    const store = useStore();
    store.fetchNodes();

    const isAdmin = computed(() => store.user?.isAdmin ?? false);
    const isLoading = computed(() => store.loading);
    const nodes = computed(() => store.nodes ?? []);
    const schemas = computed(() => store.schemas.node ?? []);

    function onOpenNode(id : string) {
        console.log("Opening Node: ", id);
        router.push("nodes/" + id);
    }

    function onSaveNode(data : {[key: string]: string | null}) {
        console.log("Saving Node: ", data);
        store.createResource("measuring_station", data);
    }

    function onEditNode(data : {[key: string]: string | null}) {
        console.log("Editing Node: ", data);
        if(data.id)
            store.editResource("station", data.id, data);
    }

    function onDeleteNodes(ids : string[]) {
        console.log("Deleting Nodes: ", ids);
        store.deleteResource("station", ids);
    }

</script>

<template>
    <GenericListPage 
        resource-name="Node" 
        :is-admin="isAdmin" 
        :loading="isLoading" 
        :data="nodes" 
        :schemas="schemas"
        @open="onOpenNode"
        @save="onSaveNode"
        @edit="onEditNode"
        @delete="onDeleteNodes"
    />
</template>