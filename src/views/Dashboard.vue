<script setup>
import { computed, ref } from 'vue'
import TarjetaKPI from '../components/TarjetaKPI.vue'
import { asientosGlobales } from '../store/contabilidad'

// ============================
// CONFIGURACIÓN
// ============================

const CLIENTES_KEY = 'erp-clientes'
const FACTURAS_KEY = 'erp-facturas'

// ============================
// CARGAR DATOS
// ============================

const cargarLista = (clave) => {
  const datosGuardados = localStorage.getItem(clave)

  if (!datosGuardados) {
    return []
  }

  try {
    const datos = JSON.parse(datosGuardados)

    return Array.isArray(datos) ? datos : []
  } catch {
    return []
  }
}

const clientes = ref(cargarLista(CLIENTES_KEY))
const facturas = ref(cargarLista(FACTURAS_KEY))

const asientos = asientosGlobales

// ============================
// FECHAS
// ============================

const fechaActual = new Date()

const mesActual = fechaActual.getMonth()
const añoActual = fechaActual.getFullYear()

const perteneceAlMesActual = (fecha) => {
  if (!fecha) {
    return false
  }

  const fechaRegistro = new Date(`${fecha}T00:00:00`)

  return (
    fechaRegistro.getMonth() === mesActual &&
    fechaRegistro.getFullYear() === añoActual
  )
}

// ============================
// FORMATO
// ============================

const formatearMoneda = (valor) => {
  return Number(valor || 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// ============================
// INDICADORES PRINCIPALES
// ============================

const facturasDelMes = computed(() => {
  return facturas.value.filter((factura) => {
    return perteneceAlMesActual(factura.fecha)
  })
})

const ventasDelMes = computed(() => {
  return facturasDelMes.value.reduce((total, factura) => {
    return total + Number(factura.total || 0)
  }, 0)
})

const gastosPorCuenta = computed(() => {
  const resumen = {}

  asientos.value
    .filter((asiento) => {
      return perteneceAlMesActual(asiento.fecha)
    })
    .forEach((asiento) => {
      asiento.partidas.forEach((partida) => {
        const cuenta = String(partida.cuenta || '').trim()
        const codigo = cuenta.substring(0, 1)

        // Las cuentas que empiezan con 5 representan gastos
        const esCuentaDeGasto =
          codigo === '5' ||
          cuenta.toLowerCase().includes('gasto')

        if (!esCuentaDeGasto) {
          return
        }

        const nombreCuenta = cuenta.replace(
          /^\d+\s*/,
          ''
        )

        const importe = Number(partida.debe || 0)

        if (!resumen[nombreCuenta]) {
          resumen[nombreCuenta] = 0
        }

        resumen[nombreCuenta] += importe
      })
    })

  return Object.entries(resumen)
    .map(([nombre, importe]) => ({
      nombre,
      importe
    }))
    .sort((a, b) => b.importe - a.importe)
})

const gastosDelMes = computed(() => {
  return gastosPorCuenta.value.reduce((total, gasto) => {
    return total + gasto.importe
  }, 0)
})

const utilidad = computed(() => {
  return ventasDelMes.value - gastosDelMes.value
})

const margen = computed(() => {
  if (ventasDelMes.value === 0) {
    return 0
  }

  return Number(
    (
      (utilidad.value / ventasDelMes.value) *
      100
    ).toFixed(1)
  )
})

const clientesActivos = computed(() => {
  return clientes.value.filter(
    (cliente) => cliente.tipo === 'cliente'
  ).length
})

const facturasPendientes = computed(() => {
  return facturas.value.filter(
    (factura) => factura.estado === 'credito'
  ).length
})

// ============================
// DISTRIBUCIÓN DE GASTOS
// ============================

const distribucionGastos = computed(() => {
  if (gastosDelMes.value === 0) {
    return []
  }

  const colores = [
    'primary',
    'secondary',
    'success',
    'warning',
    'error'
  ]

  return gastosPorCuenta.value.map((gasto, indice) => {
    const porcentaje = Number(
      (
        (gasto.importe / gastosDelMes.value) *
        100
      ).toFixed(1)
    )

    return {
      ...gasto,
      porcentaje,
      color: colores[indice % colores.length]
    }
  })
})

// ============================
// ESTADO FINANCIERO
// ============================

const porcentajeSalud = computed(() => {
  return Math.min(
    100,
    Math.max(0, margen.value)
  )
})

const colorSalud = computed(() => {
  if (margen.value < 0) {
    return 'error'
  }

  if (margen.value < 20) {
    return 'warning'
  }

  return 'success'
})

const mensajeGastos = computed(() => {
  if (gastosDelMes.value === 0) {
    return 'Todavía no hay gastos registrados este mes.'
  }

  return 'Distribución de gastos registrada este mes.'
})
</script>

<template>
  <div>
    <h1 class="text-h4 mb-6 d-flex align-center">
      <v-icon
        size="32"
        class="mr-2"
      >
        mdi-view-dashboard
      </v-icon>

      Dashboard Financiero
    </h1>

    <!-- INDICADORES PRINCIPALES -->
    <v-row dense>
      <v-col
        cols="12"
        sm="6"
        md="3"
      >
        <TarjetaKPI
          titulo="Ventas del mes"
          :valor="`$${formatearMoneda(ventasDelMes)}`"
          icono="mdi-cash-register"
          color="primary"
        />
      </v-col>

      <v-col
        cols="12"
        sm="6"
        md="3"
      >
        <TarjetaKPI
          titulo="Gastos del mes"
          :valor="`$${formatearMoneda(gastosDelMes)}`"
          icono="mdi-cart-remove"
          color="error"
        />
      </v-col>

      <v-col
        cols="12"
        sm="6"
        md="3"
      >
        <TarjetaKPI
          titulo="Utilidad"
          :valor="`$${formatearMoneda(utilidad)}`"
          icono="mdi-trending-up"
          :color="utilidad >= 0 ? 'success' : 'error'"
        />
      </v-col>

      <v-col
        cols="12"
        sm="6"
        md="3"
      >
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
      <v-col
        cols="12"
        md="6"
      >
        <v-card
          class="pa-4 h-100"
          elevation="2"
        >
          <v-card-title
            class="px-0 text-wrap"
            style="white-space: normal;"
          >
            Distribución de gastos
          </v-card-title>

          <v-card-subtitle class="px-0 mb-4">
            {{ mensajeGastos }}
          </v-card-subtitle>

          <v-card-text class="px-0">
            <div
              v-if="distribucionGastos.length === 0"
              class="text-center text-grey pa-6"
            >
              <v-icon
                size="48"
                class="mb-2"
              >
                mdi-chart-donut
              </v-icon>

              <div>
                Registra un asiento de gasto para ver la distribución.
              </div>
            </div>

            <div
              v-for="gasto in distribucionGastos"
              :key="gasto.nombre"
              class="mb-4"
            >
              <div
                class="d-flex justify-space-between mb-1 text-body-2"
              >
                <span>{{ gasto.nombre }}</span>

                <span class="font-weight-medium">
                  {{ gasto.porcentaje }}%
                </span>
              </div>

              <v-progress-linear
                :model-value="gasto.porcentaje"
                :color="gasto.color"
                height="18"
                rounded
              />

              <div class="text-caption text-grey mt-1">
                ${{ formatearMoneda(gasto.importe) }}
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col
        cols="12"
        md="6"
      >
        <v-card
          class="pa-4 h-100"
          elevation="2"
        >
          <v-card-title
            class="px-0 text-wrap"
            style="white-space: normal;"
          >
            Estado de salud financiera
          </v-card-title>

          <v-card-text class="text-center px-0">
            <v-progress-circular
              :model-value="porcentajeSalud"
              size="150"
              width="15"
              :color="colorSalud"
              class="my-4"
            >
              <span class="text-h4 font-weight-bold">
                {{ margen }}%
              </span>
            </v-progress-circular>

            <div class="text-caption mb-4">
              Margen de utilidad
            </div>

            <v-divider class="mb-4" />

            <div class="d-flex justify-space-around">
              <div>
                <div
                  class="text-h5 text-primary font-weight-bold"
                >
                  {{ clientesActivos }}
                </div>

                <div class="text-caption">
                  Clientes activos
                </div>
              </div>

              <div>
                <div
                  class="text-h5 text-warning font-weight-bold"
                >
                  {{ facturasPendientes }}
                </div>

                <div class="text-caption">
                  Por cobrar
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- RESUMEN DEL MES -->
    <v-card
      class="mt-6 pa-4"
      elevation="2"
    >
      <v-card-title class="px-0">
        Resumen del mes
      </v-card-title>

      <v-card-text class="px-0">
        <v-row>
          <v-col
            cols="12"
            sm="4"
          >
            <div class="text-caption text-grey">
              Facturas emitidas
            </div>

            <div class="text-h5 font-weight-bold">
              {{ facturasDelMes.length }}
            </div>
          </v-col>

          <v-col
            cols="12"
            sm="4"
          >
            <div class="text-caption text-grey">
              Ingresos registrados
            </div>

            <div class="text-h5 font-weight-bold text-primary">
              ${{ formatearMoneda(ventasDelMes) }}
            </div>
          </v-col>

          <v-col
            cols="12"
            sm="4"
          >
            <div class="text-caption text-grey">
              Resultado del mes
            </div>

            <div
              class="text-h5 font-weight-bold"
              :class="
                utilidad >= 0
                  ? 'text-success'
                  : 'text-error'
              "
            >
              ${{ formatearMoneda(utilidad) }}
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>