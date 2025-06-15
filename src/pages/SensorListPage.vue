<script setup lang="ts">
    import { computed } from "vue";
    import { useStore } from "../services/store";
    import GenericListPage from './GenericListPage.vue';
    import { useRouter } from 'vue-router';

    const router = useRouter();
    const store = useStore();
    store.fetchSensors();

    const isAdmin = computed(() => store.user?.isAdmin ?? false);
    const isLoading = computed(() => store.loading);
    const sensors = computed(() => store.sensors ?? []);
    const schemas = computed(() => store.schemas.sensor ?? []);

    function onOpenSensor(id : string) {
        console.log("Opening Sensor: ", id);
        for(const sensor of sensors.value) {
            if(String(sensor.id) == id){
                router.push("nodes/" + sensor["Measuring_station_ID"]);
                return;
            }
        }
    }

    function onSaveSensor(data : {[key: string]: string | null}) {
        console.log("Saving Sensor: ", data);
        store.createResource("sensor", data);
    }

    function onEditSensor(data : {[key: string]: string | null}) {
        console.log("Editing Sensor: ", data);
        if(data.id)
            store.editResource("sensor", data.id, data);
    }

    function onDeleteSensors(ids : string[]) {
        console.log("Deleting Vessels: ", ids);
        store.deleteResource("sensor", ids);
    }

</script>

<template>
    <GenericListPage 
        resource-name="Sensor" 
        :is-admin="isAdmin" 
        :loading="isLoading" 
        :data="sensors" 
        :schemas="schemas"
        @open="onOpenSensor"
        @save="onSaveSensor"
        @edit="onEditSensor"
        @delete="onDeleteSensors"
    />
</template>