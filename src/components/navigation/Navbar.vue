<script setup lang="ts">
    import { signOut } from 'aws-amplify/auth';
    import { ref } from 'vue';
    import { useRouter } from "vue-router";
    import { useStore } from "../../services/store.ts";
    import NavbarButton from "./NavbarButton.vue"

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
                <img src="https://flowbite.com/docs/images/logo.svg" class="h-8" alt="HydroNode Logo">
                <span class="self-center text-2xl font-semibold whitespace-nowrap text-navbar-foreground">HydroNode</span>
            </a>
            <div class="flex md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse">
                <button v-if="!store.isLoggedIn" type="button" @click="nav('/login')" class="text-primary-foreground bg-primary hover:bg-primary-hover focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 text-center">Login</button>
                <button v-if="store.isLoggedIn" type="button" @click="logout" class="text-primary-foreground bg-primary hover:bg-primary-hover focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 text-center">Logout</button>
                <button data-collapse-toggle="navbar-sticky" type="button" class="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-primary-foreground rounded-lg md:hidden hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-border" aria-controls="navbar-sticky" aria-expanded="false">
                    <span class="sr-only">Open main menu</span>
                    <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 17 14">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 1h15M1 7h15M1 13h15"/>
                    </svg>
                </button>
            </div>
            <div class="items-center justify-between hidden w-full md:flex md:w-auto md:order-1" id="navbar-sticky">
                <ul class="flex flex-col p-4 md:p-0 list-none mt-4 font-medium border border-border rounded-lg bg-navbar md:space-x-8 rtl:space-x-reverse md:flex-row md:mt-0 md:border-0">
                    <NavbarButton v-for="route in routes.filter(r => r.meta && r.meta.show)" :title="route.name as string" @click="nav(route.path)" />
                </ul>
            </div>
        </div>
    </nav>
</template>