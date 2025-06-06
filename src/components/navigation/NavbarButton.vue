<script setup lang="ts">
    defineProps<{ 
        title : string,
    }>();
</script>

<template>
    <li>
        <a class="block py-2 px-3 text-navbar-foreground cursor-pointer rounded-sm hover:bg-primary md:hover:bg-transparent md:border-0 md:hover:text-primary md:p-0" aria-current="page">{{title}}</a>
    </li>
</template>