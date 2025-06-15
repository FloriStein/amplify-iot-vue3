<script setup lang="ts">
    import type { InputSchema, MetaData } from '../../models';
    import Button from '../Button.vue';
    import ModalInput from '../modals/ModalInput.vue';
    import { computed } from 'vue';

    const emit = defineEmits<{
        (e: 'save', data: {[key: string]: string | null;}): void;
        (e: 'close'): void;
    }>();

    const props = withDefaults(
        defineProps<{
            title : string;
            schema : InputSchema[];
            data? : MetaData | null;
        }>(),
        {
            data: null
        }
    );
    
    const schema = computed(() => props.schema);
    const model = computed(() => {
        var m = {} as {[key : string] : string | null};
        if(props.data)
            for(const [key, value] of Object.entries(props.data)) {
                m[key] = value;
            }
        
        for(const sh of schema.value){
            if(!m[sh.field_name])
                m[sh.field_name] = "";
        }
        return m;
    })
    

    function save() {
        for(const [key, value] of Object.entries(model.value)) {
            if(value == "")
                model.value[key] = null;
        }
        emit("save", model.value);
    }
</script>

<!-- Uses a modified version of the flowbite CRUD modal  -->
<template>
    <div tabindex="-1" class="overflow-y-auto overflow-x-hidden fixed top-0 bottom-0 right-0 left-0 z-50 flex justify-center items-center w-full md:inset-0 max-h-full bg-overlay">
        <div class="relative p-4 w-full mt-44 mb-16 md:mt-0 md:mb-0 max-w-md max-h-full">
            <div class="relative bg-modal rounded-lg shadow-md border border-border">
                <!-- Modal header -->
                <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t border-border">
                    <h3 class="text-xl font-semibold text-modal-foreground">
                        {{title}}
                    </h3>
                    <Button fill="none" viewbox="0 0 14 14" @click="$emit('close')">
                        <template #icon>
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
                        </template>
                    </Button>
                </div>
                
                <!-- Modal body -->
                <form class="p-4 md:p-5">
                    <div class="flex flex-col gap-4 mb-4">
                        <ModalInput v-for="[key, value] of Object.entries(model)" v-model="model[key]" :id="key" :title="key" placeholder="..." :is-full-width=true :type="typeof value === 'number' ? 'number' : 'text'"/>
                    </div>
                    <Button label="Save" viewbox="0 0 24 24" fill="none" @click.prevent="save">
                        <template #icon>
                            <path d="M6 12H18M12 6V18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </template>
                    </Button>
                </form>
            </div>
        </div>
    </div>
</template>