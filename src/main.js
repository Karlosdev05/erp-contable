import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import '@mdi/font/css/materialdesignicons.css'

const app = createApp(App)

app.use(vuetify)

app.use(router)

app.mount('#app')
