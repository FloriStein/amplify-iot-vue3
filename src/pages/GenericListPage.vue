<script setup lang="ts">
    import { computed, ref } from "vue";
    import Table from "../components/table/Table.vue";
    import Spinner from "../components/Spinner.vue";
    import type { InputSchema, MetaData } from "../models";
    import ConfirmationModal from "../components/modals/ConfirmationModal.vue";
    import ResourceModal from "../components/modals/ResourceModal.vue";

    const props = withDefaults(
        defineProps<{
            schemas: InputSchema[],
            resourceName: string,
            data: MetaData[],
            loading: boolean,
            isAdmin: boolean,
            searchable?: boolean,
            selectable?: boolean,
            editable?: boolean,
            buttons?: boolean,
            clickable?: boolean
        }>(),
        {
            searchable: true,
            selectable: true,
            editable: true,
            buttons: true,
            clickable: true
        });

    const emit = defineEmits<{
        (e: 'open', head: string): void;
        (e: 'save', data: {[key: string]: string | null}): void;
        (e: 'edit', data: {[key: string]: string | null}): void;
        (e: 'delete', selected: string[]): void;
    }>();

    const isAdmin = computed(() => props.isAdmin);
    const data = computed(() => props.data);
    const loading = computed(() => props.loading);
    const schemas = computed(() => props.schemas);

    const showConfirmModal = ref(false);
    const showEditModal = ref(false);
    const modalEditMode = ref(true);
    const editData = ref<MetaData | null>(null);
    const selected = ref(new Set<string>());
    //const selectedRows = ref<string[]>([]); //TODO fix select all / multiple

    const keys = computed(() => data.value ? Object.keys(data.value[0] ?? {}) : []);

    const rows = computed(() => data.value
    ? data.value.map((station : MetaData) => {
        const head = String(station.id);
        const data = keys.value
            .filter(key => key !== 'id')
            .map(key => {
                const value = station[key];
                if (value == null) {
                    return "-"
                } else if (typeof value === 'number') {
                    return value.toFixed(3).replace(/\.?0+$/, '');
                } else if (!isNaN(Number(value))) {
                    return Number(value).toFixed(3).replace(/\.?0+$/, '');
                }
                return String(value);
            });
        return { head, data };
    })
    : []);

    function onAddClick() {
        editData.value = null;
        modalEditMode.value = false;
        showEditModal.value = true;
    }

    function onEditModalSave(data: {[key: string]: string | null}) {
        if(modalEditMode.value)
            emit("edit", data);
        else
            emit("save", data);
        showEditModal.value = false;
    }

    function onDeleteClick() {
        if(selected.value.size <= 0)
            return;
        showConfirmModal.value = true;
    }

    function onRowClick(head : string) {
        emit("open", head);
    }

    function onRowEdit(head: string) {
        modalEditMode.value = true;
        editData.value = data.value?.find((entry : MetaData) => String(entry.id) === head) ?? null;
        showEditModal.value = true;
    }

    function onAcceptDelete() {
        emit("delete", Array.from(selected.value));
        showConfirmModal.value = false;
        //selectedRows.value.length = 0;
        selected.value.clear()
    }

    function onDeclineDelete() {
        showConfirmModal.value = false;
    }

    function onCloseNodeModal() {
        showEditModal.value = false;
    }

</script>

<template>

    <ConfirmationModal v-show="showConfirmModal" message="Do you really want to delete the selected entries?" acceptLabel="Delete" declineLabel="Cancel" @accept="onAcceptDelete" @decline="onDeclineDelete"/>
    <ResourceModal v-show="showEditModal" :title="(modalEditMode ? 'Edit ' : 'Create ') + resourceName" :schema="schemas" :data="editData" @close="onCloseNodeModal" @save="onEditModalSave"/>
    <div class="flex flex-wrap flex-col items-start fixed top-0 left-0 width-1 p-24 pt-32 gap-8">
        <h1 class="text-3xl text-left font-bold">Your {{ resourceName }}s</h1>
        <p class="text-left">
            Here is a list of all your {{ resourceName }}s. <br>
            {{ clickable ? 'Select a ' + resourceName + ' to see its data.' : '' }}
        </p>
        <Spinner v-if="rows.length <= 0 && loading" class="mt-16" />
        <Table v-if="rows.length > 0 || !loading" :heads="keys" v-model="selected" :rows="rows" :selectable="isAdmin && selectable" :editable="isAdmin  && editable" :buttons="isAdmin && buttons" :searchable="searchable" 
        @row-clicked="onRowClick" @row-edit="onRowEdit" @add-clicked="onAddClick" @delete-clicked="onDeleteClick" />
    </div>
</template>