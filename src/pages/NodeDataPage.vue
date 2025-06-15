<script setup lang="ts">
    import { useRoute } from 'vue-router';
    import { useStore } from '../services/store';
    import { computed, onMounted, ref, watchEffect } from 'vue';
    import LineChart from '../components/data/LineChart.vue';
    import Spinner from '../components/Spinner.vue';
    import MetaDataBlock from '../components/data/MetaDataBlock.vue';
    import BarChart from '../components/data/BarChart.vue';
    import CommandBlock from '../components/data/CommandBlock.vue';
    import { useMqttClient } from '../services/mqttClient';

    const route = useRoute();
    const store = useStore();
    const mqttClient = useMqttClient();
    const id = String(route.params.id);
    
    store.fetchNodeData(id);
    store.fetchTimeframes();

    const commandHistory = computed(() => store.commandHistory[id] ?? []);
    const timeframes = computed(() => store.timeframes);
    const data = computed(() => store.selectedNodeData);
    const selectedType = ref<string | null>(null);
    const selectedTimeframe = ref<string>("NOW");

    onMounted(async () => {
        await mqttClient.startIfAuthenticated();
        mqttClient.clear();
        mqttClient.subscribeToTopic(`${id}/command/to-node`, (command) => {
            if(!store.commandHistory[id])
                store.commandHistory[id] = [];

            store.commandHistory[id].push({timestamp: Date.now(), direction: "OUTBOUND", command: command.key, message: command.payload});
        });
        mqttClient.subscribeToTopic(`${id}/command/to-aws`, (command) => {
            if(!store.commandHistory[id])
                store.commandHistory[id] = [];

            store.commandHistory[id].push({timestamp: Date.now(), direction: "INBOUND", command: command.key, message: command.payload});
        });
        mqttClient.subscribeToTopic(`$aws/things/${id}/shadow/update`, (message) => {
            store.fetchSensorData();
        });
    });

    watchEffect(() => {
        if (!selectedType.value && data.value.sensors.types.length > 0) {
            selectedType.value = data.value.sensors.types[0];
            console.log("Set selected type to default");
        }

        if (!selectedTimeframe.value && timeframes.value.length > 0) {
            selectedTimeframe.value = timeframes.value[0];
            console.log("Set selected timeframe to default");
        }
    });

    function sendCommand(key: string, payload: any){
        console.log("Sending Command: ", key, payload);
        store.sendCommand(id, key, payload);
    }
</script>

<template>
    <div class="fixed inset-0 overflow-y-auto overflow-x-hidden p-24 pt-32 flex flex-col gap-2 w-screen grow-h">
        <h1 class="text-3xl text-left mb-8">{{id}} Overview</h1>
        <div class="flex flex-row justify-between w-full h-full gap-6">
            <div class="flex-auto flex-col text-left">
                <div class="flex flex-row gap-4">
                    <div class="flex flex-col gap-2">
                        <Spinner v-if="(data.sensors.types.length <= 0) && data.loading" class="mr-20 mb-8"/>
                        <label v-if="data.sensors.types.length > 0" class="block text-lg text-left font-medium text-card-foreground">Select a sensor:</label>
                        <select v-if="data.sensors.types.length > 0" v-model="selectedType" class="p-2 pr-8 bg-input text-input-foreground border-border rounded-md w-fit mb-4">
                            <option v-for="type in data.sensors.types">{{ type }}</option>
                        </select>
                    </div>
                    <div v-if="Object.keys(data.sensors.data).length > 0" class="flex flex-col gap-2">
                        <Spinner v-if="(timeframes.length <= 0) && store.loading" class="mr-20 mb-8"/>
                        <label v-if="timeframes.length > 0" class="block text-lg text-left font-medium text-card-foreground">Select a time frame:</label>
                        <select v-if="timeframes.length > 0" v-model="selectedTimeframe" class="p-2 pr-8 bg-input text-input-foreground border-border rounded-md w-fit mb-4">
                            <option v-for="type in timeframes">{{ type }}</option>
                        </select>
                    </div>
                </div>
                <div v-if="Object.keys(data.sensors.data).length <= 0 && data.loading" role="status" class="w-full p-4 border border-skeleton rounded-sm shadow-sm animate-pulse md:p-6">
                    <div class="h-2.5 bg-skeleton rounded-full w-32 mb-2.5"></div>
                    <div class="w-48 h-2 mb-10 bg-skeleton rounded-full"></div>
                    <div class="flex items-baseline mt-4">
                        <div class="w-full bg-skeleton rounded-t-lg h-72"></div>
                        <div class="w-full h-56 ms-6 bg-skeleton rounded-t-lg"></div>
                        <div class="w-full bg-skeleton rounded-t-lg h-72 ms-6"></div>
                        <div class="w-full h-64 ms-6 bg-skeleton rounded-t-lg"></div>
                        <div class="w-full bg-skeleton rounded-t-lg h-80 ms-6"></div>
                        <div class="w-full bg-skeleton rounded-t-lg h-72 ms-6"></div>
                        <div class="w-full bg-skeleton rounded-t-lg h-80 ms-6"></div>
                    </div>
                    <span class="sr-only">Loading...</span>
                </div>
                <LineChart v-if="selectedTimeframe === 'NOW' && selectedType && selectedTimeframe && Object.keys(data.sensors.data[selectedTimeframe] ?? {}).length > 0" :data="selectedType ? data.sensors.data[selectedTimeframe][selectedType]?.data ?? [] : []" :metric="selectedType ? selectedType : ''" :unit="selectedType && data.sensors.metas[selectedType] ? data.sensors.metas[selectedType].Sensor_unit : ''" :title="`Latest Readings of '${selectedType}'`"/>
                <BarChart v-if="selectedTimeframe !== 'NOW' && selectedType && selectedTimeframe && Object.keys(data.sensors.data[selectedTimeframe] ?? {}).length > 0" :data="selectedType ? data.sensors.data[selectedTimeframe][selectedType]?.data ?? [] : []" :metric="selectedType ? selectedType : ''" :unit="selectedType && data.sensors.metas[selectedType] ? data.sensors.metas[selectedType].Sensor_unit : ''" :title="`Readings of '${selectedType}' in the last ${selectedTimeframe.toLowerCase()}`" :timeframe="selectedTimeframe"/>
                <span v-if="Object.keys(data.sensors.data).length <= 0 && !data.loading" class="flex items-center text-foreground mt-8">
                    <svg class="w-5 h-5 me-2.5 text-danger" viewBox="2 2 22 22" fill="none">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm-1.5-5.009c0-.867.659-1.491 1.491-1.491.85 0 1.509.624 1.509 1.491 0 .867-.659 1.509-1.509 1.509-.832 0-1.491-.642-1.491-1.509zM11.172 6a.5.5 0 0 0-.499.522l.306 7a.5.5 0 0 0 .5.478h1.043a.5.5 0 0 0 .5-.478l.305-7a.5.5 0 0 0-.5-.522h-1.655z" fill="currentColor"/>
                    </svg>  
                    No Sensor Data available. You may need to add or try a different sensor.
                </span>
                <CommandBlock :data="commandHistory" @command-send="sendCommand"/>
            </div>
            <div class="flex flex-auto flex-col text-left p-4 max-w-[25vw] h-fit gap-4">
                <h2 class="text-xl text-left">Meta-Information: </h2>
                <MetaDataBlock title="Node" :replace="{regex: 'Station', replacement: ''}" :data="data.node.meta" :loading="data.loading"/>
                <MetaDataBlock title="Vessel" :replace="{regex: 'Vessel', replacement: ''}" :data="data.vessel.meta" :loading="data.loading"/>
                <MetaDataBlock title="Selected Sensor" :replace="{regex: 'Sensor', replacement: ''}" :data="selectedType ? data.sensors.metas[selectedType] : (Object.keys(data.sensors.metas).length > 0 ? data.sensors.metas[0] : null)" :loading="data.loading"/>
            </div>
        </div>
    </div>
</template>