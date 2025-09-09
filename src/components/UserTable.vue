<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['edit', 'delete', 'push-one', 'remove-one'])

const q = ref('')

function roleTag(v) {
  return Number(v) === 14 ? 'Admin' : 'User'
}

const total = computed(() => props.items.length)

const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return props.items
  // name / userid / cardno — ব্রাউজার-ভিত্তিক ফিল্টার
  return props.items.filter((u) => {
    const name = String(u?.name ?? '').toLowerCase()
    const id = String(u?.userid ?? '').toLowerCase()
    const card = String(u?.cardno ?? '').toLowerCase()
    return name.includes(term) || id.includes(term) || card.includes(term)
  })
})

function clearSearch() {
  q.value = ''
}
</script>

<template>
  <div class="bg-white border rounded-xl overflow-hidden">
    <div class="p-3 border-b flex items-center gap-3">
      <div class="text-sm text-slate-600">
        Total: <b>{{ total }}</b>
        <template v-if="q">
          <span class="text-slate-400"> • </span>
          Showing: <b>{{ filtered.length }}</b>
        </template>
      </div>

      <!-- 🔎 ব্রাউজার-ভিত্তিক সার্চ -->
      <div class="ml-auto flex items-center gap-2">
        <input
          v-model="q"
          @keyup.enter=""
          type="text"
          placeholder="Search name / enroll / card"
          class="border rounded px-3 py-1.5 text-sm w-64"
        />
        <button class="btn-outline" @click="clearSearch" :disabled="!q">
          <i class="fas fa-times mr-1"></i> Clear
        </button>
      </div>

      <div v-if="loading" class="text-xs text-slate-500">
        <i class="fas fa-circle-notch fa-spin"></i> Loading…
      </div>
    </div>

    <div class="overflow-auto">
      <table class="w-full text-sm">
        <thead class="text-left bg-slate-50">
          <tr>
            <th class="px-3 py-2 border-b">Enroll</th>
            <th class="px-3 py-2 border-b">Name</th>
            <th class="px-3 py-2 border-b">Role</th>
            <th class="px-3 py-2 border-b">FPs</th>
            <th class="px-3 py-2 border-b w-64">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in filtered" :key="u.id" class="border-b">
            <td class="px-3 py-2 font-mono text-xs">{{ u.userid }}</td>
            <td class="px-3 py-2">{{ u.name }}</td>
            <td class="px-3 py-2">
              <span
                :class="
                  Number(u.role) === 14
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                "
                class="px-2 py-0.5 rounded text-xs"
              >
                {{ roleTag(u.role) }}
              </span>
            </td>
            <td class="px-3 py-2">{{ u.finger_count ?? 0 }}</td>
            <td class="px-3 py-2">
              <div class="flex flex-wrap gap-2">
                <button class="btn" @click="$emit('edit', u)">
                  <i class="fas fa-edit mr-1"></i> Edit
                </button>
                <button class="btn" @click="$emit('delete', u)">
                  <i class="fas fa-trash mr-1"></i> Delete
                </button>
                <button class="btn" @click="$emit('push-one', u)">
                  <i class="fas fa-upload mr-1"></i> Push to Device
                </button>
                <button class="btn" @click="$emit('remove-one', u)">
                  <i class="fas fa-user-slash mr-1"></i> Remove from Device
                </button>
              </div>
            </td>
          </tr>

          <tr v-if="!filtered.length">
            <td colspan="6" class="px-3 py-4 text-center text-slate-500">No users found</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.btn {
  @apply inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 text-xs hover:bg-slate-50;
}
.btn-outline {
  @apply inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 text-sm text-slate-700 hover:bg-slate-50;
}
</style>
