import { createApp } from 'vue'
import { createWebHashHistory, createRouter } from 'vue-router';
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import App from './App.vue'





import DrawView from './draw.vue'
import FlyView from './fly.vue'

const routes = [
    { path: '/draw', component: DrawView },
    { path: '/fly', component: FlyView },
]

const router = createRouter({
    history: createWebHashHistory(),
    routes,
})

const app = createApp(App)
app.use(router);
app.use(ElementPlus);
app.mount('#app')
