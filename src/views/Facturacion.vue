<script setup>
import { computed, ref, watch } from 'vue'
import { registrarAsientoGlobal } from '../store/contabilidad'

// ============================
// CONFIGURACIÓN
// ============================

const CLIENTES_KEY = 'erp-clientes'
const FACTURAS_KEY = 'erp-facturas'
const IVA = 0.16

// ============================
// FUNCIONES DE CARGA Y GUARDADO
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

// ============================
// ESTADO
// ============================

const clientes = ref(cargarLista(CLIENTES_KEY))
const facturas = ref(cargarLista(FACTURAS_KEY))

const clienteSeleccionado = ref(null)
const obtenerFechaLocal = () => {
  const hoy = new Date()

  const año = hoy.getFullYear()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')

  return `${año}-${mes}-${dia}`
}

const fechaMinima = obtenerFechaLocal()
const fecha = ref(fechaMinima)
const estado = ref('pagada')

const detalle = ref([
  {
    concepto: '',
    cantidad: 1,
    precioUnitario: 0
  }
])

const snackbar = ref(false)
const mensajeSnack = ref('')
const formRef = ref(null)

// Guardar facturas automáticamente
watch(
  facturas,
  (nuevasFacturas) => {
    localStorage.setItem(
      FACTURAS_KEY,
      JSON.stringify(nuevasFacturas)
    )
  },
  { deep: true }
)

// ============================
// CLIENTES DINÁMICOS
// ============================

const clientesDisponibles = computed(() => {
  return clientes.value
    .filter((cliente) => cliente.tipo === 'cliente')
    .map((cliente) => ({
      title: cliente.nombre,
      value: cliente.id
    }))
})

// ============================
// CÁLCULOS DE LA FACTURA
// ============================

const calcularTotalLinea = (linea) => {
  const cantidad = Number(linea.cantidad || 0)
  const precio = Number(linea.precioUnitario || 0)

  return cantidad * precio
}

const subtotal = computed(() => {
  return detalle.value.reduce((total, linea) => {
    return total + calcularTotalLinea(linea)
  }, 0)
})

const iva = computed(() => {
  return subtotal.value * IVA
})

const total = computed(() => {
  return subtotal.value + iva.value
})

const detalleValido = computed(() => {
  return detalle.value.every((linea) => {
    const conceptoValido =
      String(linea.concepto || '').trim().length > 0

    const cantidadValida =
      Number(linea.cantidad || 0) > 0

    const precioValido =
      Number(linea.precioUnitario || 0) >= 0

    return (
      conceptoValido &&
      cantidadValida &&
      precioValido
    )
  })
})

const facturasRecientes = computed(() => {
  return [...facturas.value].sort((a, b) => b.id - a.id)
})

// ============================
// VALIDACIONES
// ============================

const reglas = {
  requerido: (valor) => {
    return String(valor ?? '').trim().length > 0 ||
      'Campo obligatorio'
  },

  fechaNoPasada: (valor) => {
    if (!valor) {
      return 'Selecciona una fecha'
    }

    return valor >= fechaMinima ||
      'La fecha no puede ser anterior a hoy'
  }
}

const mostrarMensaje = (mensaje) => {
  mensajeSnack.value = mensaje
  snackbar.value = true
}

// ============================
// MANEJO DE CONCEPTOS
// ============================

const agregarLinea = () => {
  detalle.value.push({
    concepto: '',
    cantidad: 1,
    precioUnitario: 0
  })
}

const eliminarLinea = (indice) => {
  if (detalle.value.length <= 1) {
    return
  }

  detalle.value.splice(indice, 1)
}

// ============================
// EMITIR FACTURA
// ============================

const emitirFactura = async () => {
  const resultado = await formRef.value?.validate()

    if (
    !fecha.value ||
    fecha.value < fechaMinima
  ) {
    mostrarMensaje(
      'La fecha no puede ser anterior a hoy'
    )

    return
  }

  if (resultado && !resultado.valid) {
    return
  }

  if (!clienteSeleccionado.value) {
    mostrarMensaje('Selecciona un cliente')
    return
  }

  if (!fecha.value) {
    mostrarMensaje('Selecciona una fecha')
    return
  }

  if (!detalleValido.value) {
    mostrarMensaje(
      'Completa correctamente todos los conceptos'
    )
    return
  }

  if (subtotal.value <= 0) {
    mostrarMensaje(
      'La factura debe tener un subtotal mayor que cero'
    )
    return
  }

  const cliente = clientes.value.find(
    (registro) =>
      registro.id === clienteSeleccionado.value
  )

  if (!cliente) {
    mostrarMensaje('El cliente seleccionado no existe')
    return
  }

  const nuevoId =
    Math.max(
      0,
      ...facturas.value.map((factura) => Number(factura.id))
    ) + 1

  const numeroFactura = `FAC-${String(nuevoId).padStart(5, '0')}`

  const nuevaFactura = {
    id: nuevoId,
    numero: numeroFactura,
    clienteId: cliente.id,
    cliente: cliente.nombre,
    fecha: fecha.value,
    estado: estado.value,
    detalle: detalle.value.map((linea) => ({
      concepto: String(linea.concepto).trim(),
      cantidad: Number(linea.cantidad),
      precioUnitario: Number(linea.precioUnitario),
      total: calcularTotalLinea(linea)
    })),
    subtotal: Number(subtotal.value.toFixed(2)),
    iva: Number(iva.value.toFixed(2)),
    total: Number(total.value.toFixed(2))
  }

  // Guardar la factura
  facturas.value.push(nuevaFactura)

  // Si la factura es a crédito, aumentar el saldo del cliente
  if (estado.value === 'credito') {
    cliente.saldo =
      Number(cliente.saldo || 0) +
      Number(nuevaFactura.total)
  }

  // Crear asiento contable automáticamente
  const cuentaCobro =
    estado.value === 'pagada'
      ? '1102 Bancos'
      : '1103 Clientes'

  registrarAsientoGlobal({
    fecha: fecha.value,
    concepto: `${numeroFactura} - ${cliente.nombre}`,
    partidas: [
      {
        cuenta: cuentaCobro,
        debe: nuevaFactura.total,
        haber: 0
      },
      {
        cuenta: '4101 Ventas',
        debe: 0,
        haber: nuevaFactura.subtotal
      },
      {
        cuenta: '2102 IVA por Pagar',
        debe: 0,
        haber: nuevaFactura.iva
      }
    ]
  })

  // Limpiar formulario
  clienteSeleccionado.value = null
 fecha.value = obtenerFechaLocal()

  estado.value = 'pagada'

  detalle.value = [
    {
      concepto: '',
      cantidad: 1,
      precioUnitario: 0
    }
  ]

  mostrarMensaje(
    'Factura emitida y asiento contable generado'
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
</script>

<template>
  <div>
    <h1 class="text-h4 mb-4">
      Emisor de Facturas
    </h1>

    <v-row>
      <!-- FORMULARIO DE FACTURA -->
      <v-col cols="12" md="7">
        <v-card class="pa-4">
          <v-card-title class="px-0">
            Datos de la factura
          </v-card-title>

          <v-form
            ref="formRef"
            @submit.prevent="emitirFactura"
          >
            <v-card-text class="px-0">
              <v-row>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="clienteSeleccionado"
                    :items="clientesDisponibles"
                    item-title="title"
                    item-value="value"
                    label="Cliente"
                    variant="outlined"
                    prepend-inner-icon="mdi-account"
                    :rules="[reglas.requerido]"
                  />
                </v-col>

                <v-col cols="12" md="3">
                 <v-text-field
                   v-model="fecha"
                   label="Fecha"
                   type="date"
                   :min="fechaMinima"
                   variant="outlined"
                   :rules="[
                       reglas.requerido,
                       reglas.fechaNoPasada
                           ]"
                  />
                </v-col>

                <v-col cols="12" md="3">
                  <v-select
                    v-model="estado"
                    :items="[
                      {
                        title: 'Contado',
                        value: 'pagada'
                      },
                      {
                        title: 'Crédito',
                        value: 'credito'
                      }
                    ]"
                    item-title="title"
                    item-value="value"
                    label="Estado de pago"
                    variant="outlined"
                  />
                </v-col>
              </v-row>

              <v-divider class="my-4" />

              <div class="text-subtitle-1 mb-2 font-weight-bold">
                Conceptos
              </div>

              <v-card
                v-for="(linea, indice) in detalle"
                :key="indice"
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
                      label="Cantidad"
                      type="number"
                      min="1"
                      variant="outlined"
                      density="compact"
                      hide-details
                    />
                  </v-col>

                  <v-col cols="4" md="2">
                    <v-text-field
                      v-model.number="linea.precioUnitario"
                      label="Precio unitario"
                      type="number"
                      min="0"
                      variant="outlined"
                      density="compact"
                      hide-details
                      prefix="$"
                    />
                  </v-col>

                  <v-col cols="3" md="2">
                    <strong class="text-primary">
                      $
                      {{ formatearMoneda(calcularTotalLinea(linea)) }}
                    </strong>
                  </v-col>

                  <v-col cols="1">
                    <v-btn
                      icon="mdi-delete"
                      size="small"
                      color="error"
                      variant="text"
                      title="Eliminar concepto"
                      :disabled="detalle.length === 1"
                      @click="eliminarLinea(indice)"
                    />
                  </v-col>
                </v-row>
              </v-card>

              <v-btn
                variant="outlined"
                color="primary"
                class="mt-2"
                type="button"
                @click="agregarLinea"
              >
                <v-icon start>
                  mdi-plus
                </v-icon>

                Agregar concepto
              </v-btn>
            </v-card-text>

            <!-- RESUMEN -->
            <v-card
              color="primary"
              variant="tonal"
              class="mt-4 pa-4"
            >
              <v-card-title class="px-0">
                <v-icon start>
                  mdi-calculator
                </v-icon>

                Resumen
              </v-card-title>

              <v-card-text class="px-0">
                <div class="d-flex justify-space-between mb-2">
                  <span>Subtotal:</span>

                  <strong>
                    ${{ formatearMoneda(subtotal) }}
                  </strong>
                </div>

                <div class="d-flex justify-space-between mb-2">
                  <span>IVA 16%:</span>

                  <strong>
                    ${{ formatearMoneda(iva) }}
                  </strong>
                </div>

                <v-divider class="my-2" />

                <div class="d-flex justify-space-between">
                  <span class="text-h6">
                    Total:
                  </span>

                  <span class="text-h6">
                    ${{ formatearMoneda(total) }}
                  </span>
                </div>
              </v-card-text>

              <v-card-actions class="px-0 pt-4">
                <v-btn
                  block
                  color="primary"
                  size="large"
                  type="submit"
                >
                  <v-icon start>
                    mdi-check
                  </v-icon>

                  Emitir factura
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-form>
        </v-card>
      </v-col>

      <!-- HISTORIAL -->
      <v-col cols="12" md="5">
        <v-card class="pa-4">
          <v-card-title class="px-0 text-h6">
            Historial de facturas
          </v-card-title>

          <v-card-text
            v-if="facturasRecientes.length === 0"
            class="text-center text-grey pa-8"
          >
            <v-icon
              size="48"
              class="mb-2"
            >
              mdi-receipt-text-outline
            </v-icon>

            <div>
              Todavía no hay facturas registradas
            </div>
          </v-card-text>

          <v-list
            v-else
            density="compact"
          >
            <v-list-item
              v-for="factura in facturasRecientes"
              :key="factura.id"
              class="px-0"
            >
              <template #prepend>
                <v-icon color="primary">
                  mdi-receipt
                </v-icon>
              </template>

              <v-list-item-title>
                {{ factura.numero || `Factura #${factura.id}` }}
              </v-list-item-title>

              <v-list-item-subtitle>
                {{ factura.cliente }}
                <br />
                {{ factura.fecha }}
              </v-list-item-subtitle>

              <template #append>
                <div class="text-right">
                  <v-chip
                    :color="
                      factura.estado === 'pagada'
                        ? 'success'
                        : 'warning'
                    "
                    size="small"
                    class="mb-1"
                  >
                    {{
                      factura.estado === 'pagada'
                        ? 'Pagada'
                        : 'Crédito'
                    }}
                  </v-chip>

                  <div class="font-weight-bold">
                    ${{ formatearMoneda(factura.total) }}
                  </div>
                </div>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar
      v-model="snackbar"
      :timeout="3000"
    >
      {{ mensajeSnack }}
    </v-snackbar>
  </div>
</template>