<script setup>
const props = defineProps({
  companies: { type: Array, default: () => [] },
  departments: { type: Array, default: () => [] },
  companyId: { type: [String, Number], default: '' },
  departmentId: { type: [String, Number], default: '' },
})
const emit = defineEmits(['update:companyId', 'update:departmentId'])
</script>
<template>
  <div class="grid sm:grid-cols-2 gap-4">
    <div class="flex flex-row justify-center items-center gap-2">
      <label for="title" class="text-sm text-gray-700 shrink-0 w-20 text-right">Company</label>
      <select
        :value="companyId"
        @change="$emit('update:companyId', $event.target.value)"
        class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
      >
        <option value="">-- Company --</option>
        <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div class="flex flex-row justify-center items-center gap-2">
      <label for="title" class="text-sm text-gray-700 shrink-0 w-20 text-right">Department</label>
      <select
        :value="departmentId"
        :disabled="!companyId"
        @change="$emit('update:departmentId', $event.target.value)"
        class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60"
      >
        <option value="">-- Department --</option>
        <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
      </select>
    </div>
  </div>
</template>
