<script setup>
import { reactive, watch, computed } from 'vue'
import { useUserStore } from '../../stores/user'
import { useAuthStore } from '../../stores/auth'

const emit = defineEmits(['close', 'updated'])

const props = defineProps({
  user: Object,
})

const form = reactive({
  name: '',
  phone: '',
  email: '',
  role: '',
  address: '',
  user_id: null,
  is_active: true,
})

const authStore = useAuthStore()

const isDeveloper = computed(() => authStore.user && authStore.user.role === 'Developer')

watch(
  () => props.user,
  (newUser) => {
    form.name = newUser.name || ''
    form.phone = newUser.phone || ''
    form.email = newUser.email || ''
    form.role = newUser.role || 'Operator'
    form.address = newUser.address || ''
    form.user_id = newUser.user_id || null
    form.is_active = newUser.is_active ?? true
  },
  { immediate: true },
)

const store = useUserStore()

const updateUser = async () => {
  const dataToSend = {
    name: form.name,
    phone: form.phone,
    email: form.email,
    role: form.role,
    address: form.address,
    user_id: form.user_id,
    is_active: form.is_active,
  }

  await store.updateUser(props.user.id, dataToSend)
  await store.fetchUsers()

  emit('updated')
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
    <div class="card-bg md:p-8 p-4 mx-4">
      <h2 class="text-xl font-bold text-center">ইউজার সম্পাদনা</h2>
      <form @submit.prevent="updateUser" class="space-y-4">
        <div class="grid gap-2">
          <div class="">
            <label class="">নাম</label>
            <input v-model="form.name" type="text" class="w-full p-2 border rounded" required />
          </div>

          <div class="">
            <label class="">ফোন</label>
            <input v-model="form.phone" type="text" class="w-full p-2 border rounded" required />
          </div>

          <div class="">
            <label class="">ইমেইল</label>
            <input v-model="form.email" type="email" class="w-full p-2 border rounded" />
          </div>

          <div class="">
            <label class="">মেশিন আইডি</label>
            <input v-model="form.user_id" type="number" class="w-full p-2 border rounded" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="">
              <label class="">ভূমিকা (Role)</label>
              <select v-model="form.role" class="w-full p-2 border rounded" required>
                <option value="employee">Operator</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
                <!-- Show "Developer" option only if the current user is a developer -->
                <option v-if="isDeveloper" value="Developer">Developer</option>
              </select>
            </div>

            <div class="">
              <label class="">সক্রিয় অবস্থা</label>
              <select v-model="form.is_active" class="w-full p-2 border rounded">
                <option :value="true">Active</option>
                <option :value="false">Inactive</option>
              </select>
            </div>
          </div>

          <div class="">
            <label class="">ঠিকানা</label>
            <input v-model="form.address" type="text" class="w-full p-2 border rounded" />
          </div>
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
