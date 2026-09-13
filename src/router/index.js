import { createRouter, createWebHistory } from 'vue-router'

// Importamos las vistas (páginas)
import Dashboard from '../views/Dashboard.vue'
import Clientes from '../views/Clientes.vue'
import Facturacion from '../views/Facturacion.vue'
import Contabilidad from '../views/Contabilidad.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: Dashboard },
    { path: '/clientes', name: 'clientes', component: Clientes },
    { path: '/facturacion', name: 'facturacion', component: Facturacion },
    { path: '/contabilidad', name: 'contabilidad', component: Contabilidad }
  ]
})

export default router