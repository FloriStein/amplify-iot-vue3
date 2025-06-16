<script setup lang="ts">
    import { computed, ref } from "vue";
    import TableRow from "./TableRow.vue";
    import Button from "../Button.vue";

    const searchTerm = ref("");
    //const tableRowRefs = ref<InstanceType<typeof TableRow>[]>([]);
    const selectAll = ref(false);

    const selected = defineModel<Set<string>>({ required: true});

    const props = withDefaults(
        defineProps<{ 
            searchable? : boolean,
            selectable? : boolean,
            editable? : boolean,
            buttons?: boolean,
            heads : string[],
            rows : {
                head : string,
                data : string[]
            }[]
        }>(),
        {
            buttons: false,
            searchable: true,
            selectable: false,
            editable: false
        }
    );

    const emit = defineEmits<{
        (e: 'row-clicked', head: string): void;
        (e: 'row-edit', head: string): void;
        (e: 'add-clicked') : void;
        (e: 'delete-clicked') : void;
    }>();

    const filteredData = computed(() => {
        if(!props.searchable)
            return props.rows;

        const term = searchTerm.value.toLowerCase();
        return props.rows.filter(row =>
            [row.head, ...row.data].some(value =>
                value.toLowerCase().includes(term)
            )
        );
    });

    function toggleSelectAll() {
        selectAll.value = !selectAll.value;
        selected.value.clear();

        if(selectAll.value){
            filteredData.value.forEach(row => {
                selected.value.add(row.head);
            });
        }
        console.log(selected.value);
    }

    function toggleSelect(head : string) {
        //if(selectedRows.value.find((elem) => elem == head))
        //    return;

        //selectedRows.value.push(head);
        
        if (selected.value.has(head)){
            console.log(`Removing ${head} from set`);
            selected.value.delete(head);
        }
        else{
            console.log(`Adding ${head} to set`);
            selected.value.add(head);
        }
    }
</script>

<template>
    <div class="flex flex-col relative overflow-x-auto sm:rounded-lg gap-4">
        <div v-if="searchable">
            <label for="table-search" class="sr-only">Search</label>
            <div class="relative mt-1">
                <div class="absolute inset-y-0 rtl:inset-r-0 start-0 flex items-center ps-3 pointer-events-none">
                    <svg class="w-4 h-4 text-input-foreground" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                    </svg>
                </div>
                <input type="text" v-model="searchTerm" id="table-search" class="block pt-2 ps-10 text-sm text-input-foreground border border-border rounded-lg w-80 bg-input focus:ring-primary focus:border-primary" placeholder="Search for items">
            </div>
        </div>
        <table class="w-full text-sm text-left rtl:text-right text-table-foreground">
            <thead class="text-xs text-table-foreground uppercase bg-table-head border-b border-border">
                <tr>
                    <th v-if="selectable && rows.length > 0" scope="col" class="p-4">
                        <div class="flex items-center">
                            <input id="checkbox-all-search" type="checkbox" @click="toggleSelectAll" class="w-5 h-5 text-3xl text-primary bg-table-head border-border rounded-sm focus:ring-primary focus:ring-2 cursor-pointer hover:border-primary">
                            <label for="checkbox-all-search" class="sr-only">checkbox</label>
                        </div>
                    </th>
                    <th v-for="head in heads" scope="col" class="px-6 py-3">
                        {{ head }}
                    </th>
                    <th v-if="editable" scope="col" class="px-6 py-3"></th>
                </tr>
            </thead>
            <tbody>
                <tr class="bg-table cursor-pointer group hover:bg-table-hover" v-if="rows.length <= 0">No Data</tr>
                <TableRow 
                    v-if="rows.length > 0" 
                    v-for="row in filteredData"
                    :selected="selected.has(row.head)"
                    @click="() => emit('row-clicked', row.head)"
                    @edit="() => emit('row-edit', row.head)"
                    @toggle-select="toggleSelect"
                    :editable="editable" 
                    :selectable="selectable" 
                    :head="row.head" 
                    :data="row.data"
                />
            </tbody>
        </table>
        <div class="flex flex-row gap-4">
            <Button v-if="buttons" type="primary" label="Add" viewbox="4 4 16 16" fill="currentColor" @click="() => emit('add-clicked')">
                <template #icon>
                    <g>
                        <line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" x1="12" x2="12" y1="19" y2="5"/>
                        <line fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" x1="5" x2="19" y1="12" y2="12"/>
                    </g>
                </template>
            </Button>
            <Button v-if="buttons" type="danger" label="Delete Selection" viewbox="5 5 15 15" fill="currentColor" @click="() => emit('delete-clicked')">
                <template #icon>
                    <path d="M6.96967 16.4697C6.67678 16.7626 6.67678 17.2374 6.96967 17.5303C7.26256 17.8232 7.73744 17.8232 8.03033 17.5303L6.96967 16.4697ZM13.0303 12.5303C13.3232 12.2374 13.3232 11.7626 13.0303 11.4697C12.7374 11.1768 12.2626 11.1768 11.9697 11.4697L13.0303 12.5303ZM11.9697 11.4697C11.6768 11.7626 11.6768 12.2374 11.9697 12.5303C12.2626 12.8232 12.7374 12.8232 13.0303 12.5303L11.9697 11.4697ZM18.0303 7.53033C18.3232 7.23744 18.3232 6.76256 18.0303 6.46967C17.7374 6.17678 17.2626 6.17678 16.9697 6.46967L18.0303 7.53033ZM13.0303 11.4697C12.7374 11.1768 12.2626 11.1768 11.9697 11.4697C11.6768 11.7626 11.6768 12.2374 11.9697 12.5303L13.0303 11.4697ZM16.9697 17.5303C17.2626 17.8232 17.7374 17.8232 18.0303 17.5303C18.3232 17.2374 18.3232 16.7626 18.0303 16.4697L16.9697 17.5303ZM11.9697 12.5303C12.2626 12.8232 12.7374 12.8232 13.0303 12.5303C13.3232 12.2374 13.3232 11.7626 13.0303 11.4697L11.9697 12.5303ZM8.03033 6.46967C7.73744 6.17678 7.26256 6.17678 6.96967 6.46967C6.67678 6.76256 6.67678 7.23744 6.96967 7.53033L8.03033 6.46967ZM8.03033 17.5303L13.0303 12.5303L11.9697 11.4697L6.96967 16.4697L8.03033 17.5303ZM13.0303 12.5303L18.0303 7.53033L16.9697 6.46967L11.9697 11.4697L13.0303 12.5303ZM11.9697 12.5303L16.9697 17.5303L18.0303 16.4697L13.0303 11.4697L11.9697 12.5303ZM13.0303 11.4697L8.03033 6.46967L6.96967 7.53033L11.9697 12.5303L13.0303 11.4697Z"/>
                </template>
            </Button>
        </div>
    </div>
</template>