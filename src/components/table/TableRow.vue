<script setup lang="ts">
import { computed, ref } from 'vue';

    const props = withDefaults(
        defineProps<{ 
        selected? : boolean,
        selectable? : boolean,
        editable? : boolean,
        head : string, 
        data : string[]
        }>(),
        {
            selected: false,
            selectable: false,
            editable: false
        }
    );

    const emit = defineEmits<{
        (e: 'edit'): void;
        (e: 'toggle-select', head: string): void;
    }>();

    const selected = computed(() => props.selected);

    function toggleSelect() {
        console.log("Toggle select on row ", props.head)
        emit("toggle-select", props.head);
    }
    
</script>

<template>
    <tr class="bg-table cursor-pointer group hover:bg-table-hover">
        <td v-if="selectable" class="w-4 p-4 bg-table-head group-hover:bg-table-head-hover">
            <div class="flex items-center">
                <input id="checkbox-table-3" type="checkbox" v-model="selected" @click.stop="toggleSelect" class="w-5 h-5 text-3xl accent-black text-primary bg-table border-table-foreground rounded-sm focus:ring-primary focus:ring-2 cursor-pointer hover:border-primary">
                <label for="checkbox-table-3" class="sr-only">checkbox</label>
            </div>
        </td>
        <th scope="row" class="px-6 py-4 font-medium text-table-foreground bg-table-head group-hover:bg-table-head-hover whitespace-nowrap">
            {{head}}
        </th>
        <td v-for="entry in data" class="px-6 py-4">
            {{entry}}
        </td>
        <td v-if="editable" class="px-6 py-4">
            <a @click.stop="() => emit('edit')" class="font-medium text-primary hover:underline hover:text-primary-hover" >Edit</a>
        </td>
    </tr>
</template>