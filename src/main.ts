import { createApp } from 'vue';
import './assets/styles/main.scss'
import router from "./services/router"
import App from './App.vue';
import { createPinia } from 'pinia'

import { Amplify } from 'aws-amplify';
import amplifyConfig from './aws-exports';

Amplify.configure(amplifyConfig);

createApp(App).use(createPinia()).use(router).mount('#app');

//Manually set dark mode, because automatic vue media matching wasn't quite working
const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (isDarkMode) {
    document.documentElement.classList.add('dark');
} else {
    document.documentElement.classList.remove('dark');
}
