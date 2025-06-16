<script setup lang="ts">
    import { signOut } from 'aws-amplify/auth';
    import { ref } from 'vue';
    import { useRouter } from "vue-router";
    import { useStore } from "../../services/store.ts";
    import NavbarButton from "./NavbarButton.vue"
    import Button from '../Button.vue';

    const router = useRouter();
    const routes = router.options.routes;
    const store = useStore();

    async function logout() {
        await signOut();
        const currentRoute = router.currentRoute.value;
        if (currentRoute.meta.requiresAuth) {
            router.push('/');
        }
    }

    function nav(link : string){
        router.push(link)
    }
</script>

<template>
    <nav class="bg-navbar fixed w-full z-20 top-0 start-0 border-b border-border">
        <div class="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
            <a class="flex items-center cursor-pointer space-x-3 rtl:space-x-reverse" @click="nav('/')" >
                <!--<img src="https://flowbite.com/docs/images/logo.svg" class="h-8" alt="HydroNode Logo">-->
                <span class="self-center text-2xl font-semibold whitespace-nowrap text-navbar-foreground">HydroNode</span>
            </a>
            <div class="flex md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse">
                <Button v-if="!store.isLoggedIn" label="Login" :hideIcon="true" @click="nav('/login')" />
                <Button v-if="store.isLoggedIn" label="Logout" :hideIcon="true" @click="logout" />
            </div>
            <div class="items-center justify-between hidden w-full md:flex md:w-auto md:order-1" id="navbar-sticky">
                <ul class="flex flex-col p-4 md:p-0 list-none mt-4 font-medium border border-border rounded-lg bg-navbar md:space-x-8 rtl:space-x-reverse md:flex-row md:mt-0 md:border-0">
                    <NavbarButton v-if="store.user?.isAdmin" title="Users" @click="nav('/users')" />
                    <NavbarButton v-for="route in routes.filter(r => r.meta && r.meta.show)" :title="route.name as string" @click="nav(route.path)" />
                </ul>
            </div>
        </div>
    </nav>
</template>