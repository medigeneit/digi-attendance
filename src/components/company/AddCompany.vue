<script setup>
import { reactive } from 'vue'
import { useCompanyStore } from '@/stores/company'

const emit = defineEmits(['close', 'saved'])

const form = reactive({
  name: '',
  short_name: '',
  address: '',
  phone: '',
  email: '',
  status: 'Active',
})

const store = useCompanyStore()

const saveCompany = async () => {
  await store.createCompany(form)
  emit('saved')
  emit('close')
}
</script>

<template>
  <div class="modal-bg">
    <div class="modal-card">
      <h2 class="text-xl font-bold mb-4">Add New Company</h2>
      <form @submit.prevent="saveCompany">
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
            Save
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
