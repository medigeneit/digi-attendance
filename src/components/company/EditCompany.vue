<script setup>
import { reactive, watch } from 'vue'
import { useCompanyStore } from '@/stores/company'

const emit = defineEmits(['close', 'updated'])

const props = defineProps({
  company: Object,
})

const form = reactive({
  name: '',
  short_name: '',
  address: '',
  phone: '',
  email: '',
  status: '',
})

watch(
  () => props.company,
  (newCompany) => {
    form.name = newCompany.name || ''
    form.short_name = newCompany.short_name || ''
    form.address = newCompany.address || ''
    form.phone = newCompany.phone || ''
    form.email = newCompany.email || ''
    form.status = newCompany.status || 'Inactive'
  },
  { immediate: true }
)

const store = useCompanyStore()

const updateCompany = async () => {
  await store.updateCompany(props.company.id, form)
  emit('updated')
  emit('close')
}
</script>

<template>
  <div class="modal-bg">
    <div class="modal-card">
      <h2 class="text-xl font-bold mb-4">Edit Company</h2>
      <form @submit.prevent="updateCompany">
        <div class="mb-4">
          <label class="block mb-2">Name</label>
          <input v-model="form.name" type="text" class="w-full p-2 border rounded" required />
        </div>
        <div class="mb-4">
          <label class="block mb-2">Short Name</label>
          <input v-model="form.short_name" type="text" class="w-full p-2 border rounded" required />
        </div>
        <div class="mb-4">
          <label class="block mb-2">Address</label>
          <input v-model="form.address" type="text" class="w-full p-2 border rounded" required />
        </div>
        <div class="mb-4">
          <label class="block mb-2">Phone</label>
          <input v-model="form.phone" type="text" class="w-full p-2 border rounded" required />
        </div>
        <div class="mb-4">
          <label class="block mb-2">Email</label>
          <input v-model="form.email" type="email" class="w-full p-2 border rounded" required />
        </div>
        <div class="mb-4">
          <label class="block mb-2">Status</label>
          <select v-model="form.status" class="w-full p-2 border rounded">
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="error">Error</option>
          </select>
        </div>
        <div class="flex justify-center gap-4">
          <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Update
          </button>
          <button
            type="button"
            @click="emit('close')"
            class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
