<script setup>
import { computed, ref } from 'vue'
import {
  asientosGlobales,
  cuentasGlobales,
  registrarAsientoGlobal,
  eliminarAsientoGlobal
} from '../store/contabilidad'

// ============================
// ESTADO
// ============================

const asientos = asientosGlobales
const cuentas = cuentasGlobales

const fecha = ref(
  new Date().toISOString().substring(0, 10)
)

const concepto = ref('')

const partidas = ref([
  {
    cuenta: '',
    debe: 0,
    haber: 0
  },
  {
    cuenta: '',
    debe: 0,
    haber: 0
  }
])

const formRef = ref(null)
const snackbar = ref(false)
const mensajeSnack = ref('')

// ============================
// FUNCIONES AUXILIARES
// ============================

const redondear = (valor) => {
  return Number(Number(valor || 0).toFixed(2))
}

const formatearMoneda = (valor) => {
  return Number(valor || 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const mostrarMensaje = (mensaje) => {
  mensajeSnack.value = mensaje
  snackbar.value = true
}

// ============================
// CÁLCULOS CONTABLES
// ============================

const totalDebe = computed(() => {
  return redondear(
    partidas.value.reduce((total, partida) => {
      return total + Number(partida.debe || 0)
    }, 0)
  )
})

const totalHaber = computed(() => {
  return redondear(
    partidas.value.reduce((total, partida) => {
      return total + Number(partida.haber || 0)
    }, 0)
  )
})

const diferencia = computed(() => {
  return redondear(
    totalDebe.value - totalHaber.value
  )
})

const partidasValidas = computed(() => {
  if (partidas.value.length < 2) {
    return false
  }

  return partidas.value.every((partida) => {
    const debe = Number(partida.debe || 0)
    const haber = Number(partida.haber || 0)

    const tieneCuenta =
      String(partida.cuenta || '').trim().length > 0

    const valoresPositivos =
      debe >= 0 && haber >= 0

    const soloUnLado =
      (debe > 0 && haber === 0) ||
      (haber > 0 && debe === 0)

    return (
      tieneCuenta &&
      valoresPositivos &&
      soloUnLado
    )
  })
})

const esValido = computed(() => {
  return (
    fecha.value !== '' &&
    concepto.value.trim() !== '' &&
    partidasValidas.value &&
    totalDebe.value > 0 &&
    totalDebe.value === totalHaber.value
  )
})

const asientosOrdenados = computed(() => {
  return [...asientos.value].sort(
    (a, b) => Number(b.id) - Number(a.id)
  )
})

// ============================
// MÉTODOS DE PARTIDAS
// ============================

const agregarPartida = () => {
  partidas.value.push({
    cuenta: '',
    debe: 0,
    haber: 0
  })
}

const eliminarPartida = (indice) => {
  if (partidas.value.length <= 2) {
    mostrarMensaje(
      'El asiento debe tener al menos dos partidas'
    )

    return
  }

  partidas.value.splice(indice, 1)
}

const limpiarFormulario = () => {
  fecha.value = new Date()
    .toISOString()
    .substring(0, 10)

  concepto.value = ''

  partidas.value = [
    {
      cuenta: '',
      debe: 0,
      haber: 0
    },
    {
      cuenta: '',
      debe: 0,
      haber: 0
    }
  ]

  formRef.value?.resetValidation()
}

// ============================
// REGISTRAR ASIENTO
// ============================

const registrarAsiento = async () => {
  const resultado = await formRef.value?.validate()

  if (resultado && !resultado.valid) {
    return
  }

  if (!concepto.value.trim()) {
    mostrarMensaje(
      'Escribe el concepto del asiento'
    )

    return
  }

  if (!partidasValidas.value) {
    mostrarMensaje(
      'Cada partida debe tener una cuenta y un solo valor: Debe o Haber'
    )

    return
  }

  if (totalDebe.value !== totalHaber.value) {
    mostrarMensaje(
      'El total del Debe debe ser igual al total del Haber'
    )

    return
  }

  registrarAsientoGlobal({
    fecha: fecha.value,
    concepto: concepto.value.trim(),
    partidas: partidas.value.map((partida) => ({
      cuenta: partida.cuenta,
      debe: Number(partida.debe || 0),
      haber: Number(partida.haber || 0)
    }))
  })

  limpiarFormulario()

  mostrarMensaje(
    'Asiento registrado correctamente'
  )
}

// ============================
// ELIMINAR ASIENTO
// ============================

const eliminarAsiento = (id) => {
  const confirmar = window.confirm(
    '¿Deseas eliminar este asiento contable?'
  )

  if (!confirmar) {
    return
  }

  eliminarAsientoGlobal(id)

  mostrarMensaje(
    'Asiento eliminado correctamente'
  )
}
</script>

<template>
  <div>
    <h1 class="text-h4 mb-4">
      Motor Contable - Partida Doble
    </h1>

    <v-alert
      type="info"
      variant="tonal"
      class="mb-4"
    >
      <strong>Principio de partida doble:</strong>
      la suma del Debe debe ser igual a la suma del Haber.
    </v-alert>

    <!-- FORMULARIO DE ASIENTO -->
    <v-card class="pa-4">
      <v-card-title class="px-0">
        Nuevo asiento contable
      </v-card-title>

      <v-form
        ref="formRef"
        @submit.prevent="registrarAsiento"
      >
        <v-card-text class="px-0">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="fecha"
                label="Fecha"
                type="date"
                variant="outlined"
                :rules="[
                  (valor) => !!valor || 'Campo obligatorio'
                ]"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="concepto"
                label="Concepto"
                variant="outlined"
                :rules="[
                  (valor) =>
                    !!valor?.trim() ||
                    'Campo obligatorio'
                ]"
              />
            </v-col>
          </v-row>

          <v-divider class="my-4" />

          <!-- PARTIDAS -->
          <v-table density="comfortable">
            <thead>
              <tr>
                <th>Cuenta</th>
                <th
                  class="text-right"
                  style="width: 180px"
                >
                  Debe
                </th>
                <th
                  class="text-right"
                  style="width: 180px"
                >
                  Haber
                </th>
                <th style="width: 60px"></th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="(partida, indice) in partidas"
                :key="indice"
              >
                <td>
                  <v-select
                    v-model="partida.cuenta"
                    :items="cuentas"
                    label="Seleccionar cuenta"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </td>

                <td>
                  <v-text-field
                    v-model.number="partida.debe"
                    type="number"
                    min="0"
                    step="0.01"
                    variant="outlined"
                    density="compact"
                    hide-details
                    :disabled="Number(partida.haber) > 0"
                  />
                </td>

                <td>
                  <v-text-field
                    v-model.number="partida.haber"
                    type="number"
                    min="0"
                    step="0.01"
                    variant="outlined"
                    density="compact"
                    hide-details
                    :disabled="Number(partida.debe) > 0"
                  />
                </td>

                <td>
                  <v-btn
                    icon="mdi-delete"
                    size="small"
                    color="error"
                    variant="text"
                    title="Eliminar partida"
                    @click="eliminarPartida(indice)"
                  />
                </td>
              </tr>

              <tr class="bg-grey-lighten-4 font-weight-bold">
                <td class="text-right">
                  TOTALES:
                </td>

                <td class="text-right">
                  ${{ formatearMoneda(totalDebe) }}
                </td>

                <td class="text-right">
                  ${{ formatearMoneda(totalHaber) }}
                </td>

                <td></td>
              </tr>
            </tbody>
          </v-table>

          <v-btn
            type="button"
            variant="outlined"
            class="mt-4"
            @click="agregarPartida"
          >
            <v-icon start>
              mdi-plus
            </v-icon>

            Agregar partida
          </v-btn>

          <!-- ESTADO DE VALIDACIÓN -->
          <v-alert
            v-if="esValido"
            type="success"
            variant="tonal"
            class="mt-4"
          >
            Asiento cuadrado. Listo para registrar.
          </v-alert>

          <v-alert
            v-else-if="diferencia !== 0"
            type="error"
            variant="tonal"
            class="mt-4"
          >
            Diferencia:
            ${{ formatearMoneda(Math.abs(diferencia)) }}.
            El asiento todavía no cuadra.
          </v-alert>

          <v-alert
            v-else
            type="info"
            variant="tonal"
            class="mt-4"
          >
            Completa el concepto, las cuentas y los importes
            para registrar el asiento.
          </v-alert>
        </v-card-text>

        <v-card-actions class="px-0">
          <v-spacer />

          <v-btn
            type="submit"
            color="primary"
            size="large"
            :disabled="!esValido"
          >
            <v-icon start>
              mdi-content-save
            </v-icon>

            Registrar asiento
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>

    <!-- LIBRO DIARIO -->
    <v-card class="mt-6 pa-4">
      <v-card-title class="px-0">
        Libro diario
      </v-card-title>

      <v-card-text
        v-if="asientosOrdenados.length === 0"
        class="text-center text-grey pa-8"
      >
        <v-icon
          size="48"
          class="mb-2"
        >
          mdi-book-open-outline
        </v-icon>

        <div>
          Todavía no hay asientos registrados.
        </div>
      </v-card-text>

      <v-card-text
        v-else
        class="px-0"
      >
        <v-expansion-panels>
          <v-expansion-panel
            v-for="asiento in asientosOrdenados"
            :key="asiento.id"
          >
            <v-expansion-panel-title>
              <v-chip
                size="small"
                class="mr-2"
              >
                #{{ asiento.id }}
              </v-chip>

              <strong>
                {{ asiento.concepto }}
              </strong>

              <v-spacer />

              <span class="text-caption text-grey mr-4">
                {{ asiento.fecha }}
              </span>

              <v-chip
                color="success"
                size="small"
              >
                ${{ formatearMoneda(
                  asiento.partidas.reduce(
                    (total, partida) =>
                      total + Number(partida.debe || 0),
                    0
                  )
                ) }}
              </v-chip>
            </v-expansion-panel-title>

            <v-expansion-panel-text>
              <v-table density="compact">
                <thead>
                  <tr>
                    <th>Cuenta</th>
                    <th class="text-right">
                      Debe
                    </th>
                    <th class="text-right">
                      Haber
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="(partida, indice) in asiento.partidas"
                    :key="indice"
                  >
                    <td>
                      {{ partida.cuenta }}
                    </td>

                    <td class="text-right">
                      <span v-if="Number(partida.debe) > 0">
                        ${{ formatearMoneda(partida.debe) }}
                      </span>
                    </td>

                    <td class="text-right">
                      <span v-if="Number(partida.haber) > 0">
                        ${{ formatearMoneda(partida.haber) }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </v-table>

              <div class="d-flex justify-end mt-3">
                <v-btn
                  color="error"
                  variant="text"
                  size="small"
                  @click="eliminarAsiento(asiento.id)"
                >
                  <v-icon start>
                    mdi-delete
                  </v-icon>

                  Eliminar asiento
                </v-btn>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
    </v-card>

    <v-snackbar
      v-model="snackbar"
      :timeout="3000"
    >
      {{ mensajeSnack }}
    </v-snackbar>
  </div>
</template>