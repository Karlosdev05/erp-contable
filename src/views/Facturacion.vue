<script setup>
import { ref, computed } from 'vue'
import { registrarAsientoGlobal } from '../store/contabilidad'

// === ESTADO ===
const clientesDisponibles = [
  'Distribuidora del Norte S.A.',
  'Papelería Central',
  'Servicios Técnicos López'
]

const clienteSeleccionado = ref('')
const fecha = ref(new Date().toISOString().substring(0, 10))
const estado = ref('pagada')
const detalle = ref([
  { concepto: '', cantidad: 1, precioUnitario: 0 }
])
const facturas = ref([])
const snackbar = ref(false)
const mensajeSnack = ref('')

// === COMPUTED ===
const subtotal = computed(() =>
  detalle.value.reduce((acc, d) => acc + (d.cantidad * d.precioUnitario), 0)
)
const iva = computed(() => subtotal.value * 0.16)
const total = computed(() => subtotal.value + iva.value)

// === MÉTODOS ===
const agregarLinea = () => {
  detalle.value.push({ concepto: '', cantidad: 1, precioUnitario: 0 })
}

const eliminarLinea = (idx) => {
  if (detalle.value.length > 1) detalle.value.splice(idx, 1)
}

const emitirFactura = () => {
  if (!clienteSeleccionado.value) {
    mensajeSnack.value = '⚠️ Selecciona un cliente'
    snackbar.value = true
    return
  }
  if (subtotal.value <= 0) {
    mensajeSnack.value = '⚠️ La factura debe tener al menos un concepto'
    snackbar.value = true
    return
  }

  // 1. Guardar factura en el historial local
  facturas.value.push({
    id: facturas.value.length + 1,
    cliente: clienteSeleccionado.value,
    fecha: fecha.value,
    subtotal: subtotal.value,
    iva: iva.value,
    total: total.value,
    estado: estado.value
  })

  // 2. Generar asiento de Partida Doble automático
  const cuentaCobro = estado.value === 'pagada' ? '1102 Bancos' : '1103 Clientes'
  
  registrarAsientoGlobal({
    fecha: fecha.value,
    concepto: `Factura #${facturas.value.length} - ${clienteSeleccionado.value}`,
    partidas: [
      { cuenta: cuentaCobro, debe: total.value, haber: 0 },
      { cuenta: '4101 Ventas', debe: 0, haber: subtotal.value },
      { cuenta: '2102 IVA por Pagar', debe: 0, haber: iva.value }
    ]
  })

  // Reset y notificación
  clienteSeleccionado.value = ''
  detalle.value = [{ concepto: '', cantidad: 1, precioUnitario: 0 }]
  mensajeSnack.value = '✅ Factura emitida y asiento contable generado automáticamente'
  snackbar.value = true
}
</script>

<template>
  <div>
    <h1 class="text-h4 mb-4">🧾 Emisor de Facturas</h1>

    <v-row>
      <!-- FORMULARIO DE FACTURA -->
      <v-col cols="12" md="7">
        <v-card class="pa-4">
          <v-card-title class="px-0">Datos de la Factura</v-card-title>
          <v-card-text class="px-0">
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="clienteSeleccionado"
                  :items="clientesDisponibles"
                  label="Cliente"
                  variant="outlined"
                  prepend-inner-icon="mdi-account"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="fecha"
                  label="Fecha"
                  type="date"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="estado"
                  :items="[
                    { title: 'Contado', value: 'pagada' },
                    { title: 'Crédito', value: 'credito' }
                  ]"
                  label="Estado de pago"
                  variant="outlined"
                  density="compact"
                />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <!-- DETALLE DE LA FACTURA -->
            <div class="text-subtitle-1 mb-2 font-weight-bold">Conceptos</div>
            <v-card
              v-for="(linea, idx) in detalle"
              :key="idx"
              variant="outlined"
              class="mb-3 pa-2"
            >
              <v-row align="center">
                <v-col cols="12" md="5">
                  <v-text-field
                    v-model="linea.concepto"
                    label="Concepto"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="4" md="2">
                  <v-text-field
                    v-model.number="linea.cantidad"
                    label="Cant."
                    type="number"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="4" md="2">
                  <v-text-field
                    v-model.number="linea.precioUnitario"
                    label="P. Unit."
                    type="number"
                    variant="outlined"
                    density="compact"
                    hide-details
                    prefix="$"
                  />
                </v-col>
                <v-col cols="3" md="2">
                  <strong class="text-primary">
                    $ {{ (linea.cantidad * linea.precioUnitario).toFixed(2) }}
                  </strong>
                </v-col>
                <v-col cols="1">
                  <v-btn
                    icon="mdi-delete"
                    size="small"
                    color="error"
                    variant="text"
                    @click="eliminarLinea(idx)"
                    :disabled="detalle.length === 1"
                  />
                </v-col>
              </v-row>
            </v-card>

            <v-btn variant="outlined" color="primary" @click="agregarLinea" class="mt-2">
              <v-icon start>mdi-plus</v-icon>
              Agregar concepto
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- RESUMEN DE LA FACTURA -->
      <v-col cols="12" md="5">
        <v-card color="primary" variant="tonal" class="pa-4">
          <v-card-title class="px-0">
            <v-icon start>mdi-calculator</v-icon>
            Resumen
          </v-card-title>
          <v-card-text class="px-0">
            <div class="d-flex justify-space-between mb-2">
              <span>Subtotal:</span>
              <strong>$ {{ subtotal.toFixed(2) }}</strong>
            </div>
            <div class="d-flex justify-space-between mb-2">
              <span>IVA (16%):</span>
              <strong>$ {{ iva.toFixed(2) }}</strong>
            </div>
            <v-divider class="my-2" />
            <div class="d-flex justify-space-between">
              <span class="text-h6">TOTAL:</span>
              <span class="text-h6">$ {{ total.toFixed(2) }}</span>
            </div>
          </v-card-text>
          <v-card-actions class="px-0 pt-4">
            <v-btn block color="primary" size="large" variant="elevated" @click="emitirFactura">
              <v-icon start>mdi-check</v-icon>
              Emitir Factura
            </v-btn>
          </v-card-actions>
        </v-card>

        <!-- HISTORIAL -->
        <v-card class="mt-4 pa-4" v-if="facturas.length > 0">
          <v-card-title class="px-0 text-h6">Últimas facturas</v-card-title>
          <v-list density="compact">
            <v-list-item v-for="f in facturas" :key="f.id" class="px-0">
              <template v-slot:prepend>
                <v-icon color="primary">mdi-receipt</v-icon>
              </template>
              <v-list-item-title>{{ f.cliente }}</v-list-item-title>
              <v-list-item-subtitle>{{ f.fecha }}</v-list-item-subtitle>
              <template v-slot:append>
                <v-chip :color="f.estado === 'pagada' ? 'success' : 'warning'" size="small">
                  $ {{ f.total.toFixed(2) }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar" :timeout="3000">
      {{ mensajeSnack }}
    </v-snackbar>
  </div>
</template>