<script setup lang="ts">
    import { computed } from "vue";
import { useStore } from "../services/store";
    import GenericListPage from './GenericListPage.vue';
    import { useRouter } from 'vue-router';

    const router = useRouter();
    const store = useStore();
    store.fetchVessels();

    const isAdmin = computed(() => store.user?.isAdmin ?? false);
    const isLoading = computed(() => store.loading);
    const vessels = computed(() => store.vessels ?? []);
    const schemas = computed(() => store.schemas.vessel ?? []);

    function onOpenVessel(id : string) {
        console.log("Opening Vessel: ", id);
        for(const vessel of vessels.value) {
            if(String(vessel.id) == id){
                router.push("nodes/" + vessel["Node ID"]);
                return;
            }
        }
    }

    function onSaveVessel(data : {[key: string]: string}) {
        console.log("Saving Vessel: ", data);
    }

    function onEditVessel(data : {[key: string]: string}) {
        console.log("Editing Vessel: ", data);
    }

    function onDeleteVessels(ids : string[]) {
        console.log("Deleting Vessels: ", ids);
    }

</script>

<template>
    <GenericListPage 
        resource-name="Vessel" 
        :is-admin="isAdmin" 
        :loading="isLoading" 
        :data="vessels" 
        :schemas="schemas"
        @open="onOpenVessel"
        @save="onSaveVessel"
        @edit="onEditVessel"
        @delete="onDeleteVessels"
    />
</template>