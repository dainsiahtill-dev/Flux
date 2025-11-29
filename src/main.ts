// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import './style.css' 

import App from './App.vue'

const app = createApp(App)
app.use(createPinia() as any)
app.mount('#app') // 对应 index.html 里的 <div id="app"></div>