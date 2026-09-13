<script setup>
defineProps({
  titulo: {
    type: String,
    required: true
  },
  valor: {
    type: [Number, String],
    required: true
  },
  icono: {
    type: String,
    default: 'mdi-information'
  },
  color: {
    type: String,
    default: 'primary'
  }
})
</script>

<template>
  <v-card :color="color" variant="tonal" class="h-100" min-height="100">
    <v-card-text class="d-flex align-center h-100">
      <v-icon size="40" class="mr-3">{{ icono }}</v-icon>
      <div>
        <div class="text-h5 font-weight-bold">{{ valor }}</div>
        <div class="text-caption">{{ titulo }}</div>
      </div>
    </v-card-text>
  </v-card>
</template>