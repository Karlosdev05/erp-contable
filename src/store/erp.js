import { reactive, watch } from 'vue'

const STORAGE_KEY = 'erp-contable-data'

const datosIniciales = {
  contactos: [],
  facturas: [],
  asientos: [],
  cuentas: [
    { id: 1, codigo: '1101', nombre: 'Caja', categoria: 'activo' },
    { id: 2, codigo: '1102', nombre: 'Bancos', categoria: 'activo' },
    { id: 3, codigo: '1103', nombre: 'Clientes', categoria: 'activo' },
    { id: 4, codigo: '2101', nombre: 'Proveedores', categoria: 'pasivo' },
    { id: 5, codigo: '2102', nombre: 'IVA por pagar', categoria: 'pasivo' },
    { id: 6, codigo: '4101', nombre: 'Ventas', categoria: 'ingreso' },
    { id: 7, codigo: '5101', nombre: 'Costo de ventas', categoria: 'gasto' }
  ]
}

function cargarDatos() {
  const guardado = localStorage.getItem(STORAGE_KEY)

  if (!guardado) {
    return datosIniciales
  }

  try {
    return JSON.parse(guardado)
  } catch {
    return datosIniciales
  }
}

export const erp = reactive(cargarDatos())

watch(
  erp,
  (nuevoEstado) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevoEstado))
  },
  { deep: true }
)

export function useErp() {
  return {
    erp
  }
}