import { createRouter, createWebHistory } from "vue-router";
import LandingPage from "../../pages/LandingPage.vue";
import NodeListPage from "../../pages/NodeListPage.vue";
import AboutPage from "../../pages/AboutPage.vue";
import LegacyApp from "../../pages/LegacyApp.vue";
import Authenticator from "../../components/auth/Authenticator.vue"
import { getCurrentUser } from 'aws-amplify/auth';
import VesselListPage from "../../pages/VesselListPage.vue";
import NodeDataPage from "../../pages/NodeDataPage.vue";
  
async function isUserLoggedIn() {
  try {
    await getCurrentUser();
    return true;  // Benutzer ist angemeldet
  } catch {
    return false; // Kein Benutzer angemeldet
  }
}

const basePath = "/";
const routes = [
  { path: basePath, name: "Home", component: LandingPage, meta: { requiresAuth: false, show: true} },
  { path: basePath + "nodes", name: "Nodes", component: NodeListPage, meta: { requiresAuth: true, show: true} },
  { path: basePath + "vessels", name: "Vessels", component: VesselListPage, meta: { requiresAuth: true, show: true} },
  { path: basePath + "legacy", name: "Legacy", component: LegacyApp, meta: { requiresAuth: true, show: true} },
  { path: basePath + "about", name: "About", component: AboutPage, meta: { requiresAuth: false, show: true} },
  { path: basePath + "login", name: "Login", component: Authenticator, meta: { requiresAuth: false, show: false} },
  { path: basePath + "nodes/:id", name: "Node Data", component: NodeDataPage, meta: { requiresAuth: true, show: false} },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});


router.beforeResolve(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  if (!requiresAuth) {
    return next();
  }

  if(await isUserLoggedIn())
    next();
  else {
    console.log('Access denied, User is not authenticated');
    next({ 
      name: 'Login',
      query: { redirect: to.path}
     });
  }
});



export default router;
