<script setup lang="ts">
    import { computed } from 'vue';
import type { MetaData } from '../../models';
import Spinner from '../Spinner.vue';

    const props = defineProps<{
        title: string
        replace: {regex : string, replacement: string},
        data : MetaData | null,
        loading : boolean
    }>();

    const displayData = computed(() => {
        const out : {[key : string] : string}= {};
        for(const [key, value] of Object.entries(props.data || {})) {
            if (value == null) {
                out[key] = "-"
            } else 
                out[key] = String(value).replace(/\.0+$/, '');
        }
        return out;
    });
</script>

<template>
    <div v-if="data || loading" class="flex flex-col border border-border rounded rounded-md bg-card p-4">
        <p class="font-bold text-xl mb-2">{{ title }}</p>
        <div v-if="(!data || data.length <= 0) && loading" role="status" class="max-w-sm animate-pulse">
            <div class="h-2.5 bg-skeleton rounded-full w-48 mb-4"></div>
            <div class="h-2 bg-skeleton rounded-full max-w-[360px] mb-2.5"></div>
            <div class="h-2 bg-skeleton rounded-full mb-2.5"></div>
            <div class="h-2 bg-skeleton rounded-full max-w-[330px] mb-2.5"></div>
            <div class="h-2 bg-skeleton rounded-full max-w-[300px] mb-2.5"></div>
            <div class="h-2 bg-skeleton rounded-full max-w-[360px]"></div>
            <span class="sr-only">Loading...</span>
        </div>
        <div v-for="[key, value] in Object.entries(displayData)" :key="key" class="grid grid-cols-2 gap-x-4">
            <p class="font-bold">{{key.replace(replace.regex, replace.replacement).replace("_", " ")}}:</p>
            <p>{{ value }}</p>
        </div>
    </div>
</template>