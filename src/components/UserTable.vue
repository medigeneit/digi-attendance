<script setup>
const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['edit', 'delete', 'push-one', 'remove-one'])

function roleTag(v) {
  return Number(v) === 14 ? 'Admin' : 'User'
}
</script>

<template>
  <div class="bg-white border rounded-xl overflow-hidden">
    <div class="p-3 border-b flex items-center justify-between">
      <div class="text-sm text-slate-600">
        Total: <b>{{ items.length }}</b>
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
            <th class="px-3 py-2 border-b">Card</th>
            <th class="px-3 py-2 border-b">FPs</th>
            <th class="px-3 py-2 border-b w-64">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in items" :key="u.id" class="border-b">
            <td class="px-3 py-2 font-mono text-xs">{{ u.zk_userid }}</td>
            <td class="px-3 py-2">{{ u.name }}</td>
            <td class="px-3 py-2">
              <span
                :class="
                  Number(u.role) === 14
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                "
                class="px-2 py-0.5 rounded text-xs"
                >{{ roleTag(u.role) }}</span
              >
            </td>
            <td class="px-3 py-2">{{ u.cardno ?? '' }}</td>
            <td class="px-3 py-2">{{ u.fingerprints_count ?? 0 }}</td>
            <td class="px-3 py-2">
              <div class="flex flex-wrap gap-2">
                <button class="btn" @click="$emit('edit', u)">
                  <i class="fas fa-edit mr-1"></i> Edit
                </button>
                <button class="btn" @click="$emit('delete', u)">
                  <i class="fas fa-trash mr-1"></i> Delete
                </button>
                <!-- এখন সবসময় ক্লিকেবল → parent মোডাল খুলবে -->
                <button class="btn" @click="$emit('push-one', u)">
                  <i class="fas fa-upload mr-1"></i> Push to Device
                </button>
                <button class="btn" @click="$emit('remove-one', u)">
                  <i class="fas fa-user-slash mr-1"></i> Remove from Device
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!items.length">
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
</style>
