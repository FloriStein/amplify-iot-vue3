<script setup lang="ts">
    import TableRow from "./TableRow.vue";

    withDefaults(
        defineProps<{ 
            searchable? : boolean,
            selectable? : boolean,
            editable? : boolean, 
            heads : string[],
            rows : {
                head : string,
                data : string[]
            }[]
        }>(),
        {
            searchable: true,
            selectable: false,
            editable: false
        }
    );
</script>

<template>
    <div class="relative overflow-x-auto shadow-md sm:rounded-lg">
        <div v-if="searchable" class="pb-4">
            <label for="table-search" class="sr-only">Search</label>
            <div class="relative mt-1">
                <div class="absolute inset-y-0 rtl:inset-r-0 start-0 flex items-center ps-3 pointer-events-none">
                    <svg class="w-4 h-4 text-input-foreground" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                    </svg>
                </div>
                <input type="text" id="table-search" class="block pt-2 ps-10 text-sm text-input-foreground border border-border rounded-lg w-80 bg-input focus:ring-primary focus:border-primary" placeholder="Search for items">
            </div>
        </div>
        <table class="w-full text-sm text-left rtl:text-right text-table-foreground">
            <thead class="text-xs text-table-foreground uppercase bg-table-head border-b border-border">
                <tr>
                    <th v-if="selectable" scope="col" class="p-4">
                        <div class="flex items-center">
                            <input id="checkbox-all-search" type="checkbox" class="w-4 h-4 text-table-foreground bg-table-head border-border rounded-sm focus:ring-primary focus:ring-2">
                            <label for="checkbox-all-search" class="sr-only">checkbox</label>
                        </div>
                    </th>
                    <th v-for="head in heads" scope="col" class="px-6 py-3">
                        {{ head }}
                    </th>
                </tr>
            </thead>
            <tbody>
                <TableRow v-for="row in rows" :editable="editable" :selectable="selectable" :head="row.head" :data="row.data"/>
            </tbody>
        </table>
    </div>
</template>