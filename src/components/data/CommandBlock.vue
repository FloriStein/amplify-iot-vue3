<script setup lang="ts">
    import { computed, ref, watch } from 'vue';
    import Table from '../table/Table.vue';
    import type { CommandLog } from '../../models';

    const props = defineProps<{
        data: CommandLog[]
    }>();

    const emit = defineEmits<{
        (e: 'command-send', key: string, payload: any): void;
    }>();

    const commands: {[key: string]:{reqPay: boolean, payTpl: any}} = {
        "HELLO_WORLD": { reqPay: false, payTpl: {}},
        "GET_CONFIG": {reqPay: false, payTpl: {}},
        "SET_CONFIG": {reqPay: true, payTpl: {hardware : {}, network: {}, mqtt: {}, energy:{}}},
        "RESET_CONFIG": {reqPay: false, payTpl: {}},
        "LIVE_CONNECT": {reqPay: false, payTpl: {}},
        "LIVE_STATUS": {reqPay: false, payTpl: {}},
        "LIVE_DISCONNECT": {reqPay: false, payTpl: {}},
        "WAIT": {reqPay: true, payTpl: {duration: 1000}},
        "REBOOT": {reqPay: false, payTpl: {}},
    }

    const jsonParseError = ref("");
    const selectedCommand = ref<string>("HELLO_WORLD");
    const commandPayloadLiteral = ref<string>(JSON.stringify(commands[selectedCommand.value]?.payTpl ?? {}, null, 2));
    const commandPayloadParsed = computed(() => {
        try{
            var parsed = parseJson(commandPayloadLiteral.value);
            jsonParseError.value = "";
            return parsed;
        }
        catch(ex) {
            jsonParseError.value = String(ex);
            return null;
        }
    });

    const heads = ref(["Time", "Direction", "Command", "Message"]);
    const data = computed(() => props.data.map(entry => {
        return {
            head: new Date(entry.timestamp).toLocaleString(), 
            data: [entry.direction == "INBOUND" ? "Node -> Client" : "Client -> Node", String(entry.command), JSON.stringify(entry.message)]
        }
    }));

    watch(selectedCommand, () => {
        commandPayloadLiteral.value = JSON.stringify(commands[selectedCommand.value]?.payTpl ?? {}, null, 2);
    })

    function emitSendCommand() {
        if(!commandPayloadParsed)
            return;

            emit("command-send", selectedCommand.value, commandPayloadParsed.value);
    }

    function parseJson(input : string) {
        try {
            return JSON.parse(input);
        } catch (e: any) {
            return null;
        }
    }
</script>

<template>
    <div class="card flex flex-col mt-12">
        <h2 class="text-xl text-left mb-4">Command Communication</h2>
            <div class="flex flex-row gap-2">
                <div class="flex flex-col gap-2">
                    <label class="block text-lg text-left font-medium text-card-foreground">Select a command:</label>
                    <div class="flex flex-row gap-2">
                        <select v-model="selectedCommand" class="p-2 pr-8 bg-input text-input-foreground border-border rounded-md w-fit mb-4">
                            <option v-for="[key, value] of Object.entries(commands)">
                                {{ key }}
                            </option>
                        </select>
                        <button @click="emitSendCommand" class="hover:bg-primary-hover h-fit border border-border rounded-lg bg-primary text-primary-foreground font-medium text-sm px-5 py-2.5 text-center inline-flex items-center me-2">
                            Send
                        </button>
                    </div>
                </div>
            </div>
            <div v-if="commands[selectedCommand] && commands[selectedCommand].reqPay" class="flex flex-col gap-2 mb-6">
                <label class="block text-lg text-left font-medium text-card-foreground">Enter your payload:</label>
                <textarea class="block h-fit p-2.5 w-full font-sans text-sm bg-input border border-border 
                text-input-foreground rounded-lg focus:border-primary focus:ring-primary placeholder-placeholder" v-model="commandPayloadLiteral" />
                <span v-if="!commandPayloadParsed" class="flex items-center text-foreground">
                    <svg class="w-5 h-5 me-2.5 text-danger" viewBox="2 2 22 22" fill="none">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm-1.5-5.009c0-.867.659-1.491 1.491-1.491.85 0 1.509.624 1.509 1.491 0 .867-.659 1.509-1.509 1.509-.832 0-1.491-.642-1.491-1.509zM11.172 6a.5.5 0 0 0-.499.522l.306 7a.5.5 0 0 0 .5.478h1.043a.5.5 0 0 0 .5-.478l.305-7a.5.5 0 0 0-.5-.522h-1.655z" fill="currentColor"/>
                    </svg>
                    Invalid payload format. {{ jsonParseError }}
                </span>
            </div>
        <Table :buttons="false" :selectable="false" :editable="false" :searchable="true" :heads="heads" :rows="data"/>
    </div>
</template>