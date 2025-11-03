<script setup>
import { ref, watch, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

/* ---------- Props & Emits ---------- */
const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'add' }, // 'add' | 'edit'
  model: { type: Object, default: () => ({}) },
  nextOrder: { type: Number, default: 0 },
})
const emit = defineEmits(['close', 'submit'])

/* ---------- Options ---------- */
const statusOptions = [
  { value: 'BLOCKED',   label: 'Blocked' },
  { value: 'COMPLETED', label: 'Completed' },
]
const handoverOptions = [
  { value: 'departmental_incharge',  label: 'Departmental In-charge',  icon: 'building' },
  { value: 'technical_support_team', label: 'Technical Support Team',  icon: 'wrench' },
  { value: 'it_incharge',            label: 'IT In-charge',            icon: 'chip' },
  { value: 'hr_department',          label: 'HR Department',           icon: 'users' },
  { value: 'inventory_incharge',     label: 'Inventory In-charge',     icon: 'users' },
]

// map handover_to -> org role key (soft filter for users list)
const roleKeyMap = {
  departmental_incharge: 'DEPT_INCHARGE',
  technical_support_team: 'TECH_SUPPORT',
  it_incharge: 'IT_INCHARGE',
  hr_department: 'HR',
  inventory_incharge: 'INVENTORY_KEEPER',
}

/* ---------- State ---------- */
const form = ref({
  item_key: '',
  label: '',
  required: false,
  order_no: 0,
  status: 'BLOCKED',
  handover_to: 'departmental_incharge',
  handover_to_id: '', // selected user id
})
const errors = ref({})
const submitting = ref(false)
const autoKey = ref(true)
const firstInputRef = ref(null)
const errorSummaryRef = ref(null)

/* Receiver show/hide logic:
   departmental_incharge হলে Receiver User hide হবে */
const showReceiver = computed(() => form.value.handover_to !== 'departmental_incharge')

/* ---------- Users (from store) ---------- */
const users = computed(() => userStore.users ?? userStore.items ?? [])

/* Searchable receiver picker state */
const userBoxRef = ref(null)
const userDropdownOpen = ref(false)
const userQuery = ref('')

const selectedUser = computed(() =>
  users.value.find(u => String(u?.id) === String(form.value.handover_to_id))
)

const filteredUsers = computed(() => {
  let list = users.value || []
  const key = roleKeyMap[form.value.handover_to]
  if (key) {
    list = list.filter(u => {
      const roles = (u.roles || u.role_names || u.roleKeys || [])
      const roleKey = u.role_key || u.primary_role || null
      return (Array.isArray(roles) && roles.includes(key)) || roleKey === key || !roles?.length
    })
  }
  const q = userQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(u => {
      const name = (u.name || '').toLowerCase()
      const email = (u.email || '').toLowerCase()
      const phone = (u.phone || u.phone_number || '').toLowerCase()
      const dept  = (u.department?.name || u.dept_name || '').toLowerCase()
      return name.includes(q) || email.includes(q) || phone.includes(q) || dept.includes(q)
    })
  }
  return list.slice(0, 50)
})

function pickUser(u) {
  form.value.handover_to_id = u.id
  userQuery.value = u.name || `#${u.id}`
  userDropdownOpen.value = false
}

function clearPickedUser() {
  form.value.handover_to_id = ''
  userQuery.value = ''
  nextTick(() => openUsersDropdown())
}

function openUsersDropdown() {
  if (!showReceiver.value) return
  userDropdownOpen.value = true
  if (!userQuery.value && selectedUser.value?.name) {
    userQuery.value = selectedUser.value.name
  }
}

/* click outside to close dropdown */
function onDocClick(e) {
  if (!props.open) return
  if (userBoxRef.value && !userBoxRef.value.contains(e.target)) {
    userDropdownOpen.value = false
  }
}
onMounted(() => document.addEventListener('click', onDocClick, { capture: true }))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick, { capture: true }))

/* ---------- Utils ---------- */
const maxKeyLen = 80
function slugKey(s) {
  return (s ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxKeyLen)
}
const title = computed(() => props.mode === 'edit' ? 'Edit Checklist Item' : 'Add Checklist Item')
const isEdit = computed(() => props.mode === 'edit')
const submitDisabled = computed(() => submitting.value)

/* ---------- Populate on open ---------- */
watch(() => props.open, async (v) => {
  if (!v) return
  if (isEdit.value) {
    form.value = {
      item_key: props.model?.item_key ?? '',
      label: props.model?.label ?? '',
      required: !!props.model?.required,
      order_no: Number(props.model?.order_no ?? 0),
      status: props.model?.status ?? 'BLOCKED',
      handover_to: props.model?.handover_to ?? 'departmental_incharge',
      handover_to_id: props.model?.handover_to_id ?? '',
    }
    autoKey.value = false
  } else {
    form.value = {
      item_key: '',
      label: '',
      required: false,
      order_no: Number(props.nextOrder ?? 0),
      status: 'BLOCKED',
      handover_to: 'departmental_incharge',
      handover_to_id: '',
    }
    autoKey.value = true
  }
  errors.value = {}
  submitting.value = false
  await nextTick()
  firstInputRef.value?.focus()
}, { immediate: true })

/* ---------- Auto-generate key ---------- */
watch(() => form.value.label, (v) => {
  if (!isEdit.value && autoKey.value) {
    form.value.item_key = slugKey(v)
  }
})

/* Reset receiver when strategy changes; also collapse dropdown */
watch(() => form.value.handover_to, () => {
  form.value.handover_to_id = ''
  userQuery.value = ''
  userDropdownOpen.value = false
})

/* ---------- Validation ---------- */
function validate() {
  const e = {}

  if (!isEdit.value) {
    if (!form.value.item_key.trim()) e.item_key = 'Item key is required'
    else if (form.value.item_key.length > maxKeyLen) e.item_key = `Max ${maxKeyLen} characters`
    else if (!/^[a-z0-9_]+$/.test(form.value.item_key)) e.item_key = 'Use lowercase letters, numbers, underscores only'
  }

  if (!form.value.label.trim()) e.label = 'Label is required'

  if (form.value.order_no == null || isNaN(form.value.order_no) || form.value.order_no < 0) {
    e.order_no = 'Order must be 0 or a positive number'
  }

  if (!statusOptions.some(s => s.value === form.value.status)) {
    e.status = 'Invalid status'
  }

  if (!handoverOptions.some(h => h.value === form.value.handover_to)) {
    e.handover_to = 'Select a valid handover target'
  }

  // Receiver required only when Receiver section is visible
  if (showReceiver.value && !String(form.value.handover_to_id || '').trim()) {
    e.handover_to_id = 'Please select the receiver user'
  }

  errors.value = e
  return Object.keys(e).length === 0
}

/* ---------- Keyboard / Close ---------- */
function close() { if (!submitting.value) emit('close') }

function onKeydown(e) {
  if (!props.open) return
  if (e.key === 'Escape') {
    e.stopPropagation()
    close()
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'enter') {
    e.preventDefault()
    submit()
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

/* ---------- Lifecycle ---------- */
onMounted(() => {
  try { userStore.fetchUsers?.() } catch (e) {}
})

/* ---------- Submit ---------- */
async function submit() {
  if (!validate()) {
    await nextTick()
    const firstKey = Object.keys(errors.value)[0]
    if (firstKey) {
      const el = document.querySelector(`[data-field="${firstKey}"]`)
      el?.focus?.()
      errorSummaryRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    return
  }
  submitting.value = true
  try {
    emit('submit', {
      ...form.value,
      handover_to_id: showReceiver.value
        ? (form.value.handover_to_id ? Number(form.value.handover_to_id) : null)
        : null, // departmental_incharge হলে null পাঠাবো, backend resolver dept-incharge resolve করবে
    })
  } finally {
    submitting.value = false
  }
}

/* ---------- Icons ---------- */
function Icon({ name }) {
  switch (name) {
    case 'building': return `
      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M3 21h18M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M9 8h6M9 12h6M9 16h6"/>
      </svg>`
    case 'wrench': return `
      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M14.7 6.3a4 4 0 1 0-5.66 5.66l7.07 7.07a2 2 0 0 0 2.83-2.83L11.87 9.13"/>
      </svg>`
    case 'chip': return `
      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
        <rect x="7" y="7" width="10" height="10" rx="2"/>
        <path d="M7 2v3M12 2v3M17 2v3M7 19v3M12 19v3M17 19v3M2 7h3M2 12h3M2 17h3M19 7h3M19 12h3M19 17h3"/>
      </svg>`
    case 'users': return `
      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="3"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a3 3 0 0 1 0 5.74"/>
      </svg>`
    default: return ''
  }
}
function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase() || '').join('')
}
</script>

<template>
  <transition
    enter-active-class="transition ease-out duration-150"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition ease-in duration-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="open"
      class="fixed inset-0 top-10 z-50 flex items-start md:items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
      @click.self="close"
      aria-modal="true"
      role="dialog"
      :aria-label="title"
    >
      <div class="w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-gray-900 dark:text-gray-100">
        <!-- Header -->
        <div class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
          <h3 class="text-base md:text-lg font-semibold tracking-tight">{{ title }}</h3>
          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:hover:bg-gray-800"
            @click="close"
            title="Close (Esc)"
          >✕</button>
        </div>

        <!-- Error Summary -->
        <div v-if="Object.keys(errors).length" ref="errorSummaryRef" class="mx-4 mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-rose-700 text-sm dark:bg-rose-950/30 dark:border-rose-900">
          Please fix the highlighted fields.
        </div>

        <!-- Body (compact spacing) -->
        <div class="px-4 py-3 space-y-2">
          <!-- Basics -->
          <div class="rounded-xl border border-gray-100 dark:border-gray-800">
            <div class="border-b px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 dark:border-gray-800">Basics</div>
            <div class="p-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div v-if="!isEdit">
                <div class="flex items-center justify-between">
                  <label for="item_key" class="block text-sm font-medium">Item Key</label>
                  <label class="flex items-center gap-2 text-xs text-gray-600">
                    <input type="checkbox" v-model="autoKey" class="h-4 w-4" />
                    Auto
                  </label>
                </div>
                <div class="relative">
                  <input
                    ref="firstInputRef"
                    id="item_key"
                    v-model.trim="form.item_key"
                    :readonly="autoKey"
                    maxlength="80"
                    type="text"
                    data-field="item_key"
                    class="mt-1 w-full rounded-lg border px-3 py-2 outline-none transition focus:ring-2 focus:ring-gray-900/20 dark:bg-gray-900 dark:border-gray-700"
                    placeholder="e.g., nid_copy"
                    aria-invalid="true"
                  />
                  <div class="pointer-events-none absolute right-2 top-2 text-[11px] text-gray-400">{{ form.item_key.length }}/{{ maxKeyLen }}</div>
                </div>
                <p class="mt-1 text-xs text-gray-500">Preview: <code>checklist.{{ form.item_key || '...' }}</code></p>
                <p v-if="errors.item_key" class="text-xs text-rose-600">{{ errors.item_key }}</p>
              </div>

              <div :class="isEdit ? 'sm:col-span-2' : ''">
                <label for="label" class="block text-sm font-medium">Label</label>
                <input
                  id="label"
                  v-model.trim="form.label"
                  type="text"
                  data-field="label"
                  class="mt-1 w-full rounded-lg border px-3 py-2 outline-none transition focus:ring-2 focus:ring-gray-900/20 dark:bg-gray-900 dark:border-gray-700"
                  placeholder="e.g., National ID Copy"
                />
                <p v-if="errors.label" class="mt-1 text-xs text-rose-600">{{ errors.label }}</p>
              </div>
            </div>
          </div>

          <!-- Handover To -->
          <div class="rounded-xl border border-gray-100 dark:border-gray-800">
            <div class="border-b px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 dark:border-gray-800">Handover To</div>
            <div class="p-3">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label
                  v-for="opt in handoverOptions"
                  :key="opt.value"
                  class="group inline-flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm cursor-pointer transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  :class="form.handover_to === opt.value ? 'ring-2 ring-gray-900/20 bg-gray-50 dark:bg-gray-800' : ''"
                >
                  <div class="flex items-center gap-2">
                    <span class="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-gray-100 text-gray-700 group-hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200" v-html="Icon({ name: opt.icon })"></span>
                    <span>{{ opt.label }}</span>
                  </div>
                  <input v-model="form.handover_to" type="radio" :value="opt.value" class="h-4 w-4" data-field="handover_to" />
                </label>
              </div>

              <!-- Auto info when departmental_incharge -->
              <div v-if="!showReceiver" class="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
                <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-800/60 dark:text-amber-100">★</span>
                Receiver will be resolved automatically to the Department In-charge during checklist generation.
              </div>

              <p v-if="errors.handover_to" class="mt-2 text-xs text-rose-600">{{ errors.handover_to }}</p>
            </div>
          </div>

          <!-- Receiver User (hidden when departmental_incharge) -->
          <div v-if="showReceiver" class="rounded-xl border border-gray-100 dark:border-gray-800" ref="userBoxRef">
            <div class="border-b px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 dark:border-gray-800">Receiver User</div>
            <div class="p-3">
              <!-- Selected pill -->
              <div v-if="selectedUser" class="mb-2 inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-sm dark:border-gray-700">
                <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                  <img v-if="selectedUser.photo || selectedUser.avatar_url" :src="selectedUser.photo || selectedUser.avatar_url" alt="" class="h-6 w-6 rounded-full object-cover" />
                  <span v-else class="text-[11px] font-semibold text-gray-600 dark:text-gray-200">{{ initials(selectedUser.name) }}</span>
                </span>
                <span class="font-medium">{{ selectedUser.name }}</span>
                <span v-if="selectedUser.department?.name" class="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {{ selectedUser.department.name }}
                </span>
                <button class="ml-1 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" @click="clearPickedUser" title="Clear">✕</button>
              </div>

              <!-- Combobox -->
              <div class="relative">
                <label for="handover_user" class="block text-sm font-medium">Search & Select Receiver</label>
                <div class="mt-1 flex items-center gap-2 rounded-lg border px-2 py-1.5 dark:bg-gray-900 dark:border-gray-700">
                  <svg class="h-4 w-4 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-3.5-3.5" />
                  </svg>
                  <input
                    id="handover_user"
                    v-model="userQuery"
                    @focus="openUsersDropdown"
                    @input="openUsersDropdown"
                    type="text"
                    autocomplete="off"
                    placeholder="Type name, email, phone or department..."
                    class="w-full bg-transparent outline-none"
                    data-field="handover_to_id"
                  />
                  <button
                    v-if="form.handover_to_id"
                    @click="clearPickedUser"
                    class="rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                    type="button"
                    title="Clear"
                  >Clear</button>
                </div>

                <!-- Dropdown -->
                <div
                  v-if="userDropdownOpen"
                  class="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900"
                >
                  <div class="max-h-64 overflow-auto">
                    <template v-if="filteredUsers.length">
                      <button
                        v-for="u in filteredUsers"
                        :key="u.id"
                        type="button"
                        class="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                        @click="pickUser(u)"
                      >
                        <span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                          <img v-if="u.photo || u.avatar_url" :src="u.photo || u.avatar_url" alt="" class="h-8 w-8 rounded-full object-cover" />
                          <span v-else class="text-xs font-semibold text-gray-600 dark:text-gray-200">{{ initials(u.name) }}</span>
                        </span>
                        <span class="flex min-w-0 flex-col">
                          <span class="truncate text-sm font-medium">{{ u.name || ('#'+u.id) }}</span>
                          <span class="truncate text-[12px] text-gray-500">
                            {{ u.email || '—' }} • {{ u.phone || u.phone_number || '—' }}
                          </span>
                        </span>
                        <span class="ml-auto flex items-center gap-1">
                          <span v-if="u.department?.name" class="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            {{ u.department.name }}
                          </span>
                          <span v-if="(u.role_key || (u.roles && u.roles[0]))" class="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            {{ u.role_key || u.roles?.[0] }}
                          </span>
                        </span>
                      </button>
                    </template>
                    <div v-else class="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      No users found. Refine your search.
                    </div>
                  </div>
                </div>
              </div>

              <p v-if="errors.handover_to_id" class="mt-2 text-xs text-rose-600">{{ errors.handover_to_id }}</p>
            </div>
          </div>

          <!-- Compact two-column: Display & Status -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="rounded-xl border border-gray-100 dark:border-gray-800">
              <div class="border-b px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 dark:border-gray-800">Display & Order</div>
              <div class="px-3 py-2 grid grid-cols-1 gap-3">
                <label class="inline-flex items-center gap-2">
                  <input v-model="form.required" type="checkbox" class="h-4 w-4" data-field="required" />
                  <span class="text-sm">Required</span>
                </label>
                <div>
                  <label for="order_no" class="block text-sm font-medium">Order</label>
                  <input
                    id="order_no"
                    v-model.number="form.order_no"
                    type="number"
                    min="0"
                    data-field="order_no"
                    class="mt-1 w-full rounded-lg border px-3 py-2 outline-none transition focus:ring-2 focus:ring-gray-900/20 dark:bg-gray-900 dark:border-gray-700"
                    placeholder="0"
                  />
                  <p v-if="errors.order_no" class="mt-1 text-xs text-rose-600">{{ errors.order_no }}</p>
                </div>
              </div>
            </div>

            <div class="rounded-xl border border-gray-100 dark:border-gray-800">
              <div class="border-b px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 dark:border-gray-800">Status</div>
              <div class="px-3 py-2">
                <div class="flex flex-wrap gap-2">
                  <label
                    v-for="opt in statusOptions"
                    :key="opt.value"
                    class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm cursor-pointer transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    :class="form.status === opt.value ? 'ring-2 ring-gray-900/20' : ''"
                  >
                    <input v-model="form.status" type="radio" :value="opt.value" class="h-4 w-4" data-field="status" />
                    <span class="inline-flex items-center gap-1">
                      <span class="inline-block h-2.5 w-2.5 rounded-full" :class="{ 'bg-amber-500': opt.value==='BLOCKED', 'bg-emerald-500': opt.value==='COMPLETED' }" />
                      {{ opt.label }}
                    </span>
                  </label>
                </div>
                <p v-if="errors.status" class="mt-2 text-xs text-rose-600">{{ errors.status }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="sticky bottom-0 flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-3 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
          <button
            class="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-700 dark:hover:bg-gray-800"
            @click="close"
            :disabled="submitDisabled"
          >
            Cancel
          </button>
          <button
            class="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm text-white transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-60"
            @click="submit"
            :disabled="submitDisabled"
            title="Submit (Ctrl+Enter)"
          >
            <svg v-if="submitting" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity="0.25"/>
              <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
            </svg>
            {{ isEdit ? 'Update' : 'Create' }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>
