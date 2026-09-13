<script setup>
import { computed } from 'vue'
import TarjetaKPI from '../components/TarjetaKPI.vue'

const ventasDelMes = 125000
const gastosDelMes = 78000
const clientesActivos = 12
const facturasPendientes = 5

const utilidad = computed(() => ventasDelMes - gastosDelMes)
const margen = computed(() => ((utilidad.value / ventasDelMes) * 100).toFixed(1))
</script>

<template>
  <div>
    <h1 class="text-h4 mb-6 d-flex align-center">
      <v-icon size="32" class="mr-2">mdi-view-dashboard</v-icon>
      Dashboard Financiero
    </h1>

    <!-- KPIS PRINCIPALES -->
    <v-row dense>
      <v-col cols="12" sm="6" md="3">
        <TarjetaKPI
          titulo="Ventas del mes"
          :valor="'$' + ventasDelMes.toLocaleString()"
          icono="mdi-cash-register"
          color="primary"
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <TarjetaKPI
          titulo="Gastos del mes"
          :valor="'$' + gastosDelMes.toLocaleString()"
          icono="mdi-cart-remove"
          color="error"
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <TarjetaKPI
          titulo="Utilidad"
          :valor="'$' + utilidad.toLocaleString()"
          icono="mdi-trending-up"
          color="success"
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <TarjetaKPI
          titulo="Facturas pendientes"
          :valor="facturasPendientes"
          icono="mdi-clock-outline"
          color="warning"
        />
      </v-col>
    </v-row>

    <!-- GRÁFICOS -->
    <v-row class="mt-2">
      <v-col cols="12" md="6">
        <v-card class="pa-4 h-100" elevation="2">
          <v-card-title class="px-0 text-wrap" style="white-space: normal;">
            Distribución de gastos
          </v-card-title>
          <v-card-text class="px-0">
            <div class="mb-4">
              <div class="d-flex justify-space-between mb-1 text-body-2">
                <span>Compras</span><span class="font-weight-medium">45%</span>
              </div>
              <v-progress-linear model-value="45" color="primary" height="18" rounded />
            </div>
            <div class="mb-4">
              <div class="d-flex justify-space-between mb-1 text-body-2">
                <span>Nómina</span><span class="font-weight-medium">30%</span>
              </div>
              <v-progress-linear model-value="30" color="secondary" height="18" rounded />
            </div>
            <div class="mb-4">
              <div class="d-flex justify-space-between mb-1 text-body-2">
                <span>Servicios</span><span class="font-weight-medium">15%</span>
              </div>
              <v-progress-linear model-value="15" color="success" height="18" rounded />
            </div>
            <div class="mb-1">
              <div class="d-flex justify-space-between mb-1 text-body-2">
                <span>Otros</span><span class="font-weight-medium">10%</span>
              </div>
              <v-progress-linear model-value="10" color="warning" height="18" rounded />
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="pa-4 h-100" elevation="2">
          <v-card-title class="px-0 text-wrap" style="white-space: normal;">
            Estado de salud financiera
          </v-card-title>
          <v-card-text class="text-center px-0">
            <v-progress-circular
              :model-value="Number(margen)"
              size="150"
              width="15"
              color="success"
              class="my-4"
            >
              <span class="text-h4 font-weight-bold">{{ margen }}%</span>
            </v-progress-circular>
            <div class="text-caption mb-4">Margen de utilidad</div>

            <v-divider class="mb-4" />

            <div class="d-flex justify-space-around">
              <div>
                <div class="text-h5 text-primary font-weight-bold">{{ clientesActivos }}</div>
                <div class="text-caption">Clientes activos</div>
              </div>
              <div>
                <div class="text-h5 text-warning font-weight-bold">{{ facturasPendientes }}</div>
                <div class="text-caption">Por cobrar</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>