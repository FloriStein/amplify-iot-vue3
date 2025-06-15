<!-- This component is a multi purpose button with assignable lable and icon. The design changes to a more subtle design if to label is assigned -->
<script setup lang="ts">
    const props = withDefaults(
        defineProps<{
            type? : string;
            label? : string;
            viewbox? : string;
            fill? : string;
            hideIcon?: boolean;
        }>(),
        {
            viewbox: "0 0 24 24",
            fill: "currentColor",
            hideIcon: false
        }
    );

    var style = "hover:bg-primary-hover h-fit border border-border rounded-lg bg-primary text-primary-foreground font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center me-2";
    switch(props.type){
        case "danger": style = "hover:bg-danger-hover h-fit border border-border rounded-lg bg-danger text-danger-foreground font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center me-2"
        break;
        default: break;
    }
</script>

<!-- Uses a modified version of the flowbite button  -->
<template>
    <!-- Purpose 1: Labeled button -->
    <button v-if="label" type="button" :class="style">
        <svg v-if="!hideIcon" class="w-4 h-4 me-2" :fill=fill aria-hidden="true" xmlns="http://www.w3.org/2000/svg" :viewBox=viewbox>
            <slot name="icon">
                <!-- fallback icon -->
                <circle cx="10" cy="10" r="5" fill="currentColor" />
            </slot>
        </svg>
        {{ label }}
    </button>
    <!-- Purpose 2: Unlabeled button, like the search toggle button, or the modal close button. This type of button is a little more subtle -->
    <button v-else type="button" class="text-primary hover:bg-card hover:text-primary-hover focus:outline-none focus:ring-4 focus:ring-primary rounded-lg text-sm p-2.5 me-1">
        <svg class="w-4 h-4" :fill=fill aria-hidden="true" xmlns="http://www.w3.org/2000/svg" :viewBox=viewbox>
            <slot name="icon">
                <!-- fallback icon -->
                <circle cx="10" cy="10" r="5" fill="currentColor" />
            </slot>
        </svg>
    </button>
</template>