<script setup>
import { reactive, watch, computed } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  user: { type: Object, default: null },
})
const emit = defineEmits(['close', 'save'])

const form = reactive({
  userid: '',
  name: '',
  role: 0,
  cardno: '',
  password: '',
  is_active: true,
})

watch(
  () => props.user,
  (u) => {
    if (u) {
      form.userid = u.userid ?? ''
      form.name = u.name ?? ''
      form.role = Number(u.role ?? 0)
      form.cardno = u.cardno ?? ''
      form.password = '' // ইচ্ছা হলে ফাঁকা রাখো
      form.is_active = u.is_active ?? true
    } else {
      form.userid = ''
      form.name = ''
      form.role = 0
      form.cardno = ''
      form.password = ''
      form.is_active = true
    }
  },
  { immediate: true },
)

const isEdit = computed(() => !!props.user)

function close() {
  emit('close')
}

function save() {
  const payload = {
    userid: form.userid,
    name: form.name,
    role: Number(form.role),
    cardno: form.cardno || null,
    password: form.password || null,
    is_active: !!form.is_active,
  }
  emit('save', payload)
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 grid place-items-center bg-black/30">
    <div class="bg-white rounded-xl shadow-lg w-[560px] max-w-[95vw]">
      <div class="px-4 py-3 border-b flex items-center justify-between">
        <div class="font-semibold">{{ isEdit ? 'Edit User' : 'New User' }}</div>
        <button class="text-slate-500 hover:text-slate-800" @click="close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="p-4 space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-slate-600 mb-1">Enroll (userid)</label>
            <input
              v-model="form.userid"
              :readonly="isEdit"
              type="text"
              maxlength="9"
              class="border rounded px-3 py-1.5 w-full"
              placeholder="e.g. 1001"
            />
          </div>
          <div>
            <label class="block text-xs text-slate-600 mb-1">Name</label>
            <input
              v-model="form.name"
              type="text"
              maxlength="24"
              class="border rounded px-3 py-1.5 w-full"
            />
          </div>

          <div>
            <label class="block text-xs text-slate-600 mb-1">Role</label>
            <select v-model.number="form.role" class="border rounded px-3 py-1.5 w-full">
              <option :value="0">User</option>
              <option :value="14">Admin</option>
            </select>
          </div>

          <div>
            <label class="block text-xs text-slate-600 mb-1">Card No</label>
            <input v-model="form.cardno" type="text" class="border rounded px-3 py-1.5 w-full" />
          </div>

          <div>
            <label class="block text-xs text-slate-600 mb-1">Password</label>
            <input
              v-model="form.password"
              type="text"
              maxlength="8"
              class="border rounded px-3 py-1.5 w-full"
              placeholder="(optional)"
            />
          </div>

          <div class="flex items-center gap-2">
            <input id="active" v-model="form.is_active" type="checkbox" class="h-4 w-4" />
            <label for="active" class="text-sm">Active</label>
          </div>
        </div>
      </div>

      <div class="px-4 py-3 border-t flex items-center justify-end gap-2">
        <button class="btn" @click="close">Cancel</button>
        <button class="btn-primary" @click="save">{{ isEdit ? 'Update' : 'Create' }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn {
  @apply inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 text-sm hover:bg-slate-50;
}
.btn-primary {
  @apply inline-flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 text-white text-sm hover:bg-slate-700;
}
</style>
