<!-- This component is used confirm or decline something. 
 As a modal, its designed as an overlay / popup, which blocks the components below and forces the user to interact (choosing accept / decline) -->
<script setup lang="ts">
    import Button from "../Button.vue";

    defineProps<{
        message : string;
        acceptLabel : string;
        declineLabel : string;
    }>();

    const emit = defineEmits(['accept', 'decline']);    //Parent class handles accept / decline
</script>

<!-- Uses a modified version of the flowbite Pop-up modal  -->
<template>
    <div tabindex="-1" class="overflow-y-auto overflow-x-hidden fixed top-0 bottom-0 right-0 left-0 z-50 flex justify-center items-center w-full md:inset-0 max-h-full bg-overlay">
        <div class="relative p-4 w-full max-w-md max-h-full">
            <div class="relative bg-modal border border-border rounded-lg shadow-md">
                <Button fill="none" viewbox="0 0 14 14" @click="$emit('decline')" class="absolute top-3 end-2.5" >
                    <template #icon>
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
                    </template>
                </Button>
                <div class="p-4 md:p-5 text-center">
                    <svg class="mx-auto mb-4 text-modal-foreground w-12 h-12" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 11V6m0 8h.01M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                    </svg>
                    <h3 class="mb-5 text-xl font-normal text-modal-foreground">{{ message }}</h3>
                    <Button @click="$emit('accept')" viewbox="0 0 24 24" fill="none" :label=acceptLabel >
                        <template #icon>
                            <path d="M4 12.6111L8.92308 17.5L20 6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </template>
                    </Button>
                    <Button @click="$emit('decline')" viewbox="0 -0.5 25 25" fill="currentColor" :label=declineLabel >
                        <template #icon>
                            <path d="M6.96967 16.4697C6.67678 16.7626 6.67678 17.2374 6.96967 17.5303C7.26256 17.8232 7.73744 17.8232 8.03033 17.5303L6.96967 
                            16.4697ZM13.0303 12.5303C13.3232 12.2374 13.3232 11.7626 13.0303 11.4697C12.7374 11.1768 12.2626 11.1768 11.9697 11.4697L13.0303 
                            12.5303ZM11.9697 11.4697C11.6768 11.7626 11.6768 12.2374 11.9697 12.5303C12.2626 12.8232 12.7374 12.8232 13.0303 12.5303L11.9697 
                            11.4697ZM18.0303 7.53033C18.3232 7.23744 18.3232 6.76256 18.0303 6.46967C17.7374 6.17678 17.2626 6.17678 16.9697 6.46967L18.0303 
                            7.53033ZM13.0303 11.4697C12.7374 11.1768 12.2626 11.1768 11.9697 11.4697C11.6768 11.7626 11.6768 12.2374 11.9697 12.5303L13.0303 
                            11.4697ZM16.9697 17.5303C17.2626 17.8232 17.7374 17.8232 18.0303 17.5303C18.3232 17.2374 18.3232 16.7626 18.0303 16.4697L16.9697 
                            17.5303ZM11.9697 12.5303C12.2626 12.8232 12.7374 12.8232 13.0303 12.5303C13.3232 12.2374 13.3232 11.7626 13.0303 11.4697L11.9697 
                            12.5303ZM8.03033 6.46967C7.73744 6.17678 7.26256 6.17678 6.96967 6.46967C6.67678 6.76256 6.67678 7.23744 6.96967 7.53033L8.03033 
                            6.46967ZM8.03033 17.5303L13.0303 12.5303L11.9697 11.4697L6.96967 16.4697L8.03033 17.5303ZM13.0303 12.5303L18.0303 7.53033L16.9697 
                            6.46967L11.9697 11.4697L13.0303 12.5303ZM11.9697 12.5303L16.9697 17.5303L18.0303 16.4697L13.0303 11.4697L11.9697 12.5303ZM13.0303 
                            11.4697L8.03033 6.46967L6.96967 7.53033L11.9697 12.5303L13.0303 11.4697Z" fill="currentColor"/>
                        </template>
                    </Button>
                </div>
            </div>
        </div>
    </div>
</template>