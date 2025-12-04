// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import './style.css' 

import App from './App.vue'

const app = createApp(App)
app.use(createPinia() as any)
app.mount('#app') // 对应 index.html 里的 <div id="app"></div>
// 阻止页面内拖拽触发默认打开文件行为，留给 SFTP 拖拽使用
window.addEventListener('dragover', (e) => e.preventDefault())
window.addEventListener('drop', (e) => e.preventDefault())
