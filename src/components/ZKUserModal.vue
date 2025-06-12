<script setup>
import { reactive, watch, computed, ref } from 'vue'
import { useZKUserStore } from '@/stores/zk-user'

const emit = defineEmits(['close', 'saved'])

const props = defineProps({
  editUser: Object,
  show: Boolean,
})

const store = useZKUserStore()

const form = reactive({
  zk_userid: '',
  name: '',
  password: '',
  role: 0,
  cardno: '',
})

const isEditMode = computed(() => !!props.editUser)
const showPassword = ref(false)

watch(
  () => props.editUser,
  (user) => {
    if (user) {
      form.zk_userid = user.zk_userid || ''
      form.name = user.name || ''
      form.password = user.password || ''
      form.role = user.role || 0
      form.cardno = user.cardno || ''
    } else {
      form.zk_userid = ''
      form.name = ''
      form.password = ''
      form.role = 0
      form.cardno = ''
    }
  },
  { immediate: true },
)

const save = async () => {
  const data = { ...form }
  if (isEditMode.value) {
    await store.updateUser(props.editUser.id, data)
  } else {
    await store.createUser(data)
  }
  emit('saved')
  emit('close')
}
</script>

<template>
  <div v-if="show" class="modal-bg">
    <div class="modal-card">
      <h2 class="text-xl font-bold mb-4 text-center">
        {{ isEditMode ? 'Edit User' : 'Add User' }}
      </h2>
      <form @submit.prevent="save" class="space-y-4">
        <div>
          <label class="block">User ID</label>
          <input v-model="form.zk_userid" type="text" class="input-1" required />
        </div>
        <div>
          <label class="block">Name</label>
          <input v-model="form.name" type="text" class="input-1" required />
        </div>
        <div>
          <label class="block">Password</label>
          <div class="relative">
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              class="input-1"
            />
            <span
              class="absolute inset-y-0 right-3 flex items-center cursor-pointer"
              @click="showPassword = !showPassword"
            >
              <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'" />
            </span>
          </div>
        </div>
        <div>
          <label class="block">Role</label>
          <select v-model="form.role" class="input-1">
            <option :value="0">User</option>
            <option :value="14">Admin</option>
          </select>
        </div>
        <div>
          <label class="block">Card No</label>
          <input v-model="form.cardno" type="text" class="input-1" />
        </div>
        <div class="flex justify-end gap-4 mt-4">
          <button
            type="button"
            @click="emit('close')"
            class="px-4 py-2 bg-gray-500 text-white rounded"
          >
            Cancel
          </button>
          <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded">Save</button>
        </div>
      </form>
    </div>
  </div>
</template>
