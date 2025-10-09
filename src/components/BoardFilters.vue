<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Object, required: true }, // { type, companyId, departmentId, search }
  companies: { type: Array, default: () => [] }, // optional: যদি তোমার কাছে কোম্পানির লিস্ট থাকে
  departments: { type: Array, default: () => [] } // optional: ডিপার্টমেন্ট লিস্ট (company অনুযায়ী)
})
const emit = defineEmits(['update:modelValue','submit'])

const local = ref({ ...props.modelValue })

watch(() => props.modelValue, (v) => { local.value = { ...v } })

function update() {
  emit('update:modelValue', { ...local.value })
}
</script>

<template>
  <div class="flex flex-wrap items-end gap-3">
    <div>
      <label class="block text-xs text-gray-500 mb-1">Type</label>
      <select v-model="local.type" class="border rounded px-2 py-1" @change="update">
        <option value="joining">Joining</option>
        <option value="exit">Exit</option>
      </select>
    </div>

    <div>
      <label class="block text-xs text-gray-500 mb-1">Company</label>
      <select v-model="local.companyId" class="border rounded px-2 py-1" @change="update">
        <option :value="null">All</option>
        <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div>
      <label class="block text-xs text-gray-500 mb-1">Department</label>
      <select v-model="local.departmentId" class="border rounded px-2 py-1" @change="update">
        <option :value="null">All</option>
        <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
      </select>
    </div>

    <div class="flex-1 min-w-[200px]">
      <label class="block text-xs text-gray-500 mb-1">Search</label>
      <input v-model.trim="local.search" @keyup.enter="emit('submit')" class="border rounded px-3 py-1 w-full" placeholder="Search name/email..." />
    </div>

    <button class="px-3 py-1.5 rounded bg-gray-900 text-white"
            @click="emit('submit')">Apply</button>
  </div>
</template>
