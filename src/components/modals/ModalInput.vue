<!-- This component is a multi purpose input component for a modal. It can be used to input short / long text, files, numbers or time -->
<script setup lang="ts">
    import { ref } from 'vue';

    const props = withDefaults(
        defineProps<{
            id : string;
            title : string;
            placeholder : string;
            isRequired ?: boolean;
            isFullWidth? : boolean;
            isParagraph? : boolean;
            type? : string;
            min? : string;
            modelValue? : string | number | File | null;
        }>(),
        {
            isRequired: true,
            isFullWidth: false,
            isParagraph: false,
            type: "text",
            modelValue: ""
        }
    );

    const emit = defineEmits(["update:modelValue"]);    //Using emits for the model value for real time updates
    const style = ref(props.isFullWidth ? "col-span-2" : "col-span-2 sm:col-span-1");   //A Input can be half or full width of the modal

    //Updates the model value if a change to the input was made
    function update(event : Event) {
        const target = event.target as HTMLInputElement | HTMLTextAreaElement;
        let value : string | number | File | null = target.value;

        if(props.type === "number") {
            value = value === "" ? null : Number(value);
        }
        else if (props.type == "file"){
            value = (target as HTMLInputElement).files?.[0] || null;
        }

        emit("update:modelValue", value);
    }
</script>

<!-- Uses a modified version of flowbite input fields -->
<template>
    <div :class="style" >
        <label :for="id" class="block mb-2 text-sm font-bold text-card-foreground">{{title}}</label>
        
        <input v-if="!isParagraph && type !== 'file'" :type=type :id="id" :min=min 
        class="block p-2.5 w-full font-sans text-sm bg-input border border-border 
        text-input-foreground rounded-lg focus:border-primary focus:ring-primary placeholder-placeholder" 
        :value="modelValue" @input="update" :placeholder="placeholder" :required=isRequired />

        <input v-if="type === 'file'" type="file" :id="id" @change="update" :required="isRequired"
            class="file:hidden font-sans block p-2.5 w-full text-sm bg-input border border-border text-input-foreground rounded-lg focus:border-primary focus:ring-primary placeholder-placeholder"
        />

        <textarea v-if="isParagraph" :id="id" rows="2" 
        class="block p-2.5 w-full font-sans text-sm bg-input border border-border text-input-foreground rounded-lg focus:border-primary focus:ring-primary placeholder-placeholder" 
        @input="update" :placeholder="placeholder" :required=isRequired > {{ modelValue }}</textarea>
    </div>
</template>