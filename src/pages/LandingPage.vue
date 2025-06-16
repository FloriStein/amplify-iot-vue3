<script setup lang="ts">
    import { useRouter } from 'vue-router';

    const router = useRouter();
</script>

<template>
    <div class="flex flex-wrap flex-col items-start fixed top-0 left-0 width-1 p-24 pt-32 gap-8 overflow-auto">
        <h1 class="text-3xl text-left font-bold">Welcome to HydroNode!</h1>
        <p class="text-left">
            HydroNode is a cloud based sensor management application, centered around measuring stations for water storages.<br>
            <br>
            We produce our own measuring stations, like the <i>HydroNode Home</i>:
        </p>
        <img src="../assets/images/Finished 3D Model.png" class="block w-[50vw]" alt="HydroNode Home Image"/>
        <button @click="router.push('/nodes')" type="button" class="text-primary-foreground bg-primary border border-border hover:bg-primary-hover focus:ring-4 focus:outline-none focus:ring-border font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center">
            View Nodes
            <svg class="rtl:rotate-180 w-3.5 h-3.5 ms-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5h12m0 0L9 1m4 4L9 9"/>
            </svg>
        </button>
        
        
    </div>
</template>