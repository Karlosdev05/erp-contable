import { ref, watch } from 'vue'

const ASIENTOS_KEY = 'erp-asientos'
const CUENTAS_KEY = 'erp-cuentas'

// ============================
// FUNCIONES AUXILIARES
// ============================

const cargarDatos = (clave, valorInicial) => {
  if (typeof window === 'undefined') {
    return valorInicial
  }

  const datosGuardados = window.localStorage.getItem(clave)

  if (!datosGuardados) {
    return valorInicial
  }

  try {
    const datos = JSON.parse(datosGuardados)

    return Array.isArray(datos)
      ? datos
      : valorInicial
  } catch {
    return valorInicial
  }
}

const obtenerSiguienteId = (registros) => {
  return (
    Math.max(
      0,
      ...registros.map((registro) => Number(registro.id))
    ) + 1
  )
}

// ============================
// CUENTAS CONTABLES
// ============================

const cuentasIniciales = [
  '1101 Caja',
  '1102 Bancos',
  '1103 Clientes',
  '1104 Inventarios',
  '2101 Proveedores',
  '2102 IVA por Pagar',
  '4101 Ventas',
  '5101 Costo de Ventas'
]

export const cuentasGlobales = ref(
  cargarDatos(CUENTAS_KEY, cuentasIniciales)
)

// ============================
// ASIENTOS CONTABLES
// ============================

export const asientosGlobales = ref(
  cargarDatos(ASIENTOS_KEY, [])
)

// ============================
// PERSISTENCIA AUTOMÁTICA
// ============================

watch(
  cuentasGlobales,
  (nuevasCuentas) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        CUENTAS_KEY,
        JSON.stringify(nuevasCuentas)
      )
    }
  },
  { deep: true }
)

watch(
  asientosGlobales,
  (nuevosAsientos) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        ASIENTOS_KEY,
        JSON.stringify(nuevosAsientos)
      )
    }
  },
  { deep: true }
)

// ============================
// REGISTRAR ASIENTO
// ============================

export function registrarAsientoGlobal(nuevoAsiento) {
  const nuevoId = obtenerSiguienteId(
    asientosGlobales.value
  )

  asientosGlobales.value.push({
    ...nuevoAsiento,
    id: nuevoId,
    partidas: nuevoAsiento.partidas.map((partida) => ({
      cuenta: partida.cuenta,
      debe: Number(partida.debe || 0),
      haber: Number(partida.haber || 0)
    }))
  })
}

// ============================
// ELIMINAR ASIENTO
// ============================

export function eliminarAsientoGlobal(id) {
  const indice = asientosGlobales.value.findIndex(
    (asiento) => asiento.id === id
  )

  if (indice !== -1) {
    asientosGlobales.value.splice(indice, 1)
  }
}