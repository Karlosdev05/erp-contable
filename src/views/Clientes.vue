<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import TarjetaKPI from '../components/TarjetaKPI.vue'

const STORAGE_KEY = 'erp-clientes'

// ============================
// ESTADO
// ============================

const cargarClientes = () => {
  const datosGuardados = localStorage.getItem(STORAGE_KEY)

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

const clientes = ref(cargarClientes())

const busqueda = ref('')
const dialog = ref(false)
const editando = ref(false)
const formRef = ref(null)

const formularioVacio = () => ({
  id: 0,
  nombre: '',
  rfc: '',
  email: '',
  telefono: '',
  direccion: '',
  tipo: 'cliente',
  saldo: 0
})

const formulario = ref(formularioVacio())

// Guardar automáticamente cada cambio
watch(
  clientes,
  (nuevosClientes) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(nuevosClientes)
    )
  },
  { deep: true }
)

// ============================
// VALIDACIONES
// ============================

const reglas = {
  requerido: (valor) => {
    return String(valor ?? '').trim().length > 0 ||
      'Campo obligatorio'
  },

  rfc: (valor) => {
    const rfc = String(valor ?? '').trim().toUpperCase()

    return /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc) ||
      'RFC inválido. Ejemplo: DNO900101ABC'
  },

  email: (valor) => {
    const email = String(valor ?? '').trim()

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      'Correo electrónico inválido'
  },

  telefono: (valor) => {
  const telefono = String(valor ?? '').trim()

  return /^\d{11}$/.test(telefono) ||
    'El teléfono debe tener exactamente 11 dígitos'
  },

  rfcUnico: (valor) => {
    const rfc = String(valor ?? '').trim().toUpperCase()

    const existe = clientes.value.some((cliente) => {
      return cliente.rfc.toUpperCase() === rfc &&
        cliente.id !== formulario.value.id
    })

    return !existe || 'Ya existe un registro con este RFC'
  }
}


const actualizarTelefono = (valor) => {
  formulario.value.telefono = String(valor ?? '')
    .replace(/\D/g, '')
    .slice(0, 11)
}

// ============================
// DATOS CALCULADOS
// ============================

const clientesFiltrados = computed(() => {
  const termino = busqueda.value.trim().toLowerCase()

  if (!termino) {
    return clientes.value
  }

  return clientes.value.filter((cliente) => {
    return (
      cliente.nombre.toLowerCase().includes(termino) ||
      cliente.rfc.toLowerCase().includes(termino) ||
      cliente.email.toLowerCase().includes(termino) ||
      cliente.tipo.toLowerCase().includes(termino)
    )
  })
})

const totalClientes = computed(() => {
  return clientes.value.filter(
    (cliente) => cliente.tipo === 'cliente'
  ).length
})

const totalProveedores = computed(() => {
  return clientes.value.filter(
    (cliente) => cliente.tipo === 'proveedor'
  ).length
})

const saldoNeto = computed(() => {
  return clientes.value.reduce((total, cliente) => {
    return total + Number(cliente.saldo || 0)
  }, 0)
})

const formatearMoneda = (valor) => {
  return Number(valor || 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// ============================
// ACCIONES
// ============================

const abrirNuevo = async () => {
  editando.value = false
  formulario.value = formularioVacio()
  dialog.value = true

  await nextTick()
  formRef.value?.resetValidation()
}

const abrirEditar = async (cliente) => {
  editando.value = true

  formulario.value = {
    ...formularioVacio(),
    ...cliente
  }

  dialog.value = true

  await nextTick()
  formRef.value?.resetValidation()
}

const guardar = async () => {
  const resultado = await formRef.value?.validate()

  if (!resultado?.valid) {
    return
  }

  const registro = {
    id: Number(formulario.value.id),
    nombre: formulario.value.nombre.trim(),
    rfc: formulario.value.rfc.trim().toUpperCase(),
    email: formulario.value.email.trim().toLowerCase(),
    telefono: formulario.value.telefono.trim(),
    direccion: formulario.value.direccion.trim(),
    tipo: formulario.value.tipo,
    saldo: Number(formulario.value.saldo || 0)
  }

  if (editando.value) {
    const indice = clientes.value.findIndex(
      (cliente) => cliente.id === registro.id
    )

    if (indice !== -1) {
      clientes.value[indice] = registro
    }
  } else {
    const nuevoId =
      Math.max(
        0,
        ...clientes.value.map((cliente) => Number(cliente.id))
      ) + 1

    clientes.value.push({
      ...registro,
      id: nuevoId
    })
  }

  dialog.value = false
  formulario.value = formularioVacio()
}

const eliminar = (id) => {
  const cliente = clientes.value.find(
    (registro) => registro.id === id
  )

  if (!cliente) {
    return
  }

  const confirmar = window.confirm(
    `¿Deseas eliminar a ${cliente.nombre}?`
  )

  if (!confirmar) {
    return
  }

  const indice = clientes.value.findIndex(
    (registro) => registro.id === id
  )

  if (indice !== -1) {
    clientes.value.splice(indice, 1)
  }
}
</script>

<template>
  <div>
    <!-- INDICADORES -->
    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <TarjetaKPI
          titulo="Clientes activos"
          :valor="totalClientes"
          icono="mdi-account-group"
          color="primary"
        />
      </v-col>

      <v-col cols="12" md="4">
        <TarjetaKPI
          titulo="Proveedores"
          :valor="totalProveedores"
          icono="mdi-truck-delivery"
          color="secondary"
        />
      </v-col>

      <v-col cols="12" md="4">
        <TarjetaKPI
          titulo="Saldo neto"
          :valor="`$${formatearMoneda(saldoNeto)}`"
          icono="mdi-cash-multiple"
          color="success"
        />
      </v-col>
    </v-row>

    <!-- TABLA -->
    <v-card>
      <v-card-title class="d-flex align-center pa-4">
        <span>Catálogo de Clientes y Proveedores</span>

        <v-spacer />

        <v-text-field
          v-model="busqueda"
          prepend-inner-icon="mdi-magnify"
          label="Buscar..."
          variant="outlined"
          density="compact"
          hide-details
          clearable
          style="max-width: 300px"
          class="mr-3"
        />

        <v-btn
          color="primary"
          @click="abrirNuevo"
        >
          <v-icon start>
            mdi-plus
          </v-icon>

          Nuevo
        </v-btn>
      </v-card-title>

      <v-data-table
        :headers="[
          { title: 'Nombre', key: 'nombre' },
          { title: 'RFC', key: 'rfc' },
          { title: 'Email', key: 'email' },
          { title: 'Teléfono', key: 'telefono' },
          { title: 'Tipo', key: 'tipo' },
          { title: 'Saldo', key: 'saldo', align: 'end' },
          {
            title: 'Acciones',
            key: 'acciones',
            sortable: false,
            align: 'center'
          }
        ]"
        :items="clientesFiltrados"
        :items-per-page="5"
        no-data-text="No hay registros para mostrar"
      >
        <template #item.tipo="{ item }">
          <v-chip
            :color="
              item.tipo === 'cliente'
                ? 'primary'
                : 'secondary'
            "
            size="small"
          >
            {{ item.tipo === 'cliente' ? 'Cliente' : 'Proveedor' }}
          </v-chip>
        </template>

        <template #item.saldo="{ item }">
          <span
            :class="
              Number(item.saldo) >= 0
                ? 'text-success'
                : 'text-error'
            "
          >
            ${{ formatearMoneda(item.saldo) }}
          </span>
        </template>

        <template #item.acciones="{ item }">
          <v-btn
            icon="mdi-pencil"
            size="small"
            color="primary"
            variant="text"
            title="Editar"
            @click="abrirEditar(item)"
          />

          <v-btn
            icon="mdi-delete"
            size="small"
            color="error"
            variant="text"
            title="Eliminar"
            @click="eliminar(item.id)"
          />
        </template>
      </v-data-table>
    </v-card>

    <!-- FORMULARIO -->
    <v-dialog
      v-model="dialog"
      max-width="600"
      persistent
    >
      <v-card>
        <v-card-title class="pa-4">
          {{ editando ? 'Editar' : 'Nuevo' }} registro
        </v-card-title>

        <v-form
          ref="formRef"
          @submit.prevent="guardar"
        >
          <v-card-text>
            <v-text-field
              v-model="formulario.nombre"
              label="Razón social"
              :rules="[reglas.requerido]"
              variant="outlined"
              class="mb-2"
            />

            <v-text-field
              v-model="formulario.rfc"
              label="RFC"
              :rules="[
                reglas.requerido,
                reglas.rfc,
                reglas.rfcUnico
              ]"
              variant="outlined"
              hint="Ejemplo: DNO900101ABC"
              persistent-hint
              class="mb-2"
            />

            <v-text-field
              v-model="formulario.email"
              label="Correo electrónico"
              type="email"
              :rules="[reglas.requerido, reglas.email]"
              variant="outlined"
              class="mb-2"
            />

            <v-text-field
              v-model="formulario.telefono"
              label="Teléfono"
              type="text"
              inputmode="numeric"
              maxlength="11"
              counter="11"
              variant="outlined"
              class="mb-2"
              :rules="[
                reglas.requerido,
                reglas.telefono
                      ]"
                @update:model-value="actualizarTelefono"
            />

            <v-text-field
              v-model="formulario.direccion"
              label="Dirección"
              :rules="[reglas.requerido]"
              variant="outlined"
              class="mb-2"
            />

            <v-select
              v-model="formulario.tipo"
              :items="[
                { title: 'Cliente', value: 'cliente' },
                { title: 'Proveedor', value: 'proveedor' }
              ]"
              label="Tipo"
              :rules="[reglas.requerido]"
              variant="outlined"
              class="mb-2"
            />

            <v-text-field
              v-model.number="formulario.saldo"
              label="Saldo inicial"
              type="number"
              variant="outlined"
              prefix="$"
            />
          </v-card-text>

          <v-card-actions class="pa-4">
            <v-spacer />

            <v-btn
              type="button"
              @click="dialog = false"
            >
              Cancelar
            </v-btn>

            <v-btn
              type="submit"
              color="primary"
            >
              <v-icon start>
                mdi-content-save
              </v-icon>

              Guardar
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>
    </v-dialog>
  </div>
</template>