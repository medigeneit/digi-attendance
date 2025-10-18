<script setup>
const model = defineModel({ type: String, default: 'NA' })
const opts = [
  {v:'YES', t:'Yes'},
  {v:'NO',  t:'No'},
  {v:'NA',  t:'N/A'},
]
</script>
<template>
  <select v-model="model" class="input-1">
    <option v-for="o in opts" :key="o.v" :value="o.v">{{ o.t }}</option>
  </select>
</template>
