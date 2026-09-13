import { ref } from 'vue'

// Estado compartido de asientos contables
export const asientosGlobales = ref([])

export function registrarAsientoGlobal(nuevoAsiento) {
  asientosGlobales.value.push({
    id: asientosGlobales.value.length + 1,
    ...nuevoAsiento
  })
}