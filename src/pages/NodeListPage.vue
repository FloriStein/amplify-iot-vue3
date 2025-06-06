<script setup lang="ts">
    import Table from "../components/table/Table.vue";

    const heads = ["Node-ID", "Location", "Vessel", ""];
    const rows = [{
        head: "Node 1",
        data: ["Test 1", "Test 2"] 
    },
    {
        head: "Node 2",
        data: ["Test 3", "Test 4"]
    }];
</script>

<template>
    <div class="flex flex-wrap flex-col items-start fixed top-0 left-0 width-1 p-24 pt-32 gap-8">
        <h1 class="text-3xl text-left">Your Nodes</h1>
        <p class="text-left">
            Here is a list of all your Nodes. <br> Select a Node to see its data.
        </p>
        <Table :heads="heads" :rows="rows" :editable="true" />
    </div>
</template>