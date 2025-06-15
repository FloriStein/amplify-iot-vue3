<script setup lang="ts">
import { ref } from 'vue';

    withDefaults(
        defineProps<{ 
        selectable? : boolean,
        editable? : boolean,
        head : string, 
        data : string[]
        }>(),
        {
            selectable: false,
            editable: false
        }
    );

    const emit = defineEmits(
        ["edit", "select", "deselect"]
    );

    defineExpose({
        setSelect
    });

    const selected = ref(false);

    function setSelect(state : boolean) {
        selected.value = state;
        if(selected.value)
            emit("select");
        else   
            emit("deselect");
    }

    function toggleSelect() {
        setSelect(!selected.value);
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