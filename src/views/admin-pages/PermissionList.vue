<script setup>
import UserChip from '@/components/user/UserChip.vue'
import { useUserPermissionStore } from '@/stores/userPermissionStore'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const userPermissionStore = useUserPermissionStore()
const router = useRouter()
const { userPermissions: permissions, loading } = storeToRefs(userPermissionStore) // loading না থাকলে remove

const q = ref('')
const companyId = ref('all')
const onlyAllDept = ref(false)

const goBack = () => router.back()

const editPermission = (id) => router.push({ name: 'PermissionEdit', params: { id } })
const deletePermission = async (id) => {
  if (!confirm('Delete this permission?')) return
  await userPermissionStore.deletePermission(id)
}

onMounted(() => {
  userPermissionStore.fetchUserPermissions()
})

/** Group by user */
const permissionUsers = computed(() => {
  const list = permissions.value || []
  return list.reduce((users, permission) => {
    const user = permission?.user
    if (!user?.id) return users

    const found = users.find((u) => u.id === user.id)
    if (found) {
      found.permissions.push(permission)
      return users
    }

    return [
      ...users,
      {
        ...user,
        permissions: [permission],
      },
    ]
  }, [])
})

const companies = computed(() => {
  const map = new Map()
  ;(permissions.value || []).forEach(p => {
    const c = p?.company
    if (c?.id) map.set(String(c.id), c)
  })
  return Array.from(map.values()).sort((a, b) => String(a.name).localeCompare(String(b.name)))
})

/** Helpers */
const isAllDepartment = (perm) => {
  const ids = perm?.department_ids
  if (Array.isArray(ids)) return ids.includes('*')
  if (typeof ids === 'string') return ids === '*' || ids.includes('*')
  return false
}

const normalizedRows = computed(() => {
  // Flatten rows so filtering/sorting becomes easy
  const rows = []
  permissionUsers.value.forEach(u => {
    ;(u.permissions || []).forEach((perm, idx) => {
      rows.push({
        user: u,
        perm,
        isFirstForUser: idx === 0,
        rowspan: (u.permissions || []).length || 1,
      })
    })
  })
  return rows
})

const filteredRows = computed(() => {
  let rows = normalizedRows.value

  const term = q.value.trim().toLowerCase()
  if (term) {
    rows = rows.filter(r => {
      const u = r.user || {}
      const p = r.perm || {}
      const deptText = Array.isArray(p.departments) ? p.departments.join(', ') : ''
      return (
        String(u.name || '').toLowerCase().includes(term) ||
        String(u.email || '').toLowerCase().includes(term) ||
        String(p.company?.name || '').toLowerCase().includes(term) ||
        deptText.toLowerCase().includes(term)
      )
    })
  }

  if (companyId.value !== 'all') {
    rows = rows.filter(r => String(r.perm?.company?.id || '') === String(companyId.value))
  }

  if (onlyAllDept.value) {
    rows = rows.filter(r => isAllDepartment(r.perm))
  }

  return rows
})

/** Serial number (after filtering) */
const serialByRowKey = computed(() => {
  const map = new Map()
  let i = 0
  filteredRows.value.forEach(r => {
    map.set(r.perm.id, ++i)
  })
  return map
})

const deptChips = (perm) => {
  if (isAllDepartment(perm)) return [{ label: 'All', all: true }]
  const arr = Array.isArray(perm?.departments) ? perm.departments : []
  return arr.map(d => ({ label: d, all: false }))
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-6 space-y-5">
    <!-- Header -->
    <div class="flex items-center justify-between gap-3">
      <button
        class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        @click="goBack"
      >
        <span class="text-base">←</span>
        <span class="hidden md:inline">Back</span>
      </button>

      <div class="text-center">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">Access Control</p>
        <h1 class="mt-1 text-2xl font-semibold text-slate-900">Permissions</h1>
        <p class="mt-1 text-xs text-slate-500">Manage user-level access by company and department.</p>
      </div>

      <RouterLink
        :to="{ name: 'PermissionsAdd' }"
        class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
      >
        <span class="text-lg leading-none">+</span>
        Add New
      </RouterLink>
    </div>

    <!-- Toolbar -->
    <div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col sm:flex-row gap-2 sm:items-center w-full">
          <!-- Search -->
          <div class="relative w-full sm:w-96">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
            <input
              v-model="q"
              type="text"
              placeholder="Search user, email, company, department..."
              class="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <!-- Company filter -->
          <select
            v-model="companyId"
            class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="all">All companies</option>
            <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>

          <!-- Toggle -->
          <label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <input type="checkbox" v-model="onlyAllDept" class="h-4 w-4 rounded border-slate-300" />
            Show “All departments” only
          </label>
        </div>

        <div class="text-xs text-slate-500">
          Showing <span class="font-semibold text-slate-700">{{ filteredRows.length }}</span> permissions
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto border-t border-slate-200">
        <table class="min-w-full text-sm">
          <thead class="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th class="text-left px-4 py-3 w-12">#</th>
              <th class="text-left px-4 py-3">User</th>
              <th class="text-left px-4 py-3">Company</th>
              <th class="text-left px-4 py-3">Departments</th>
              <th class="text-right px-4 py-3 w-28">Actions</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100">
            <tr v-if="loading" class="bg-white">
              <td colspan="5" class="px-4 py-10 text-center text-slate-500">
                Loading permissions...
              </td>
            </tr>

            <template v-else>
              <template v-for="r in filteredRows" :key="r.perm.id">
                <tr class="hover:bg-slate-50/60">
                  <td class="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {{ serialByRowKey.get(r.perm.id) }}
                  </td>

                  <!-- user cell once with rowspan -->
                  <td
                    v-if="r.isFirstForUser"
                    class="px-4 py-3 align-top"
                    :rowspan="r.rowspan"
                  >
                    <div class="flex items-start gap-3">
                      <UserChip :user="r.user" />
                    </div>
                  </td>

                  <td class="px-4 py-3 text-slate-700">
                    <div class="font-medium text-slate-900">{{ r.perm.company?.name || '-' }}</div>
                    <div class="text-xs text-slate-500">Company ID: {{ r.perm.company?.id || '-' }}</div>
                  </td>

                  <td class="px-4 py-3">
                    <div class="flex flex-wrap gap-1.5 max-w-xl">
                      <template v-if="deptChips(r.perm)[0]?.all">
                        <span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          All departments
                        </span>
                      </template>

                      <template v-else>
                        <span
                          v-for="(d, i) in deptChips(r.perm).slice(0, 4)"
                          :key="i"
                          class="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700"
                          :title="d.label"
                        >
                          {{ d.label }}
                        </span>

                        <span
                          v-if="deptChips(r.perm).length > 4"
                          class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"
                          :title="deptChips(r.perm).slice(4).map(x => x.label).join(', ')"
                        >
                          +{{ deptChips(r.perm).length - 4 }} more
                        </span>

                        <span v-if="!deptChips(r.perm).length" class="text-xs text-slate-500">-</span>
                      </template>
                    </div>
                  </td>

                  <td class="px-4 py-3 text-right">
                    <div class="inline-flex items-center gap-2">
                      <button
                        class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
                        title="Edit"
                        @click="editPermission(r.perm.id)"
                      >
                        <i class="far fa-pencil-alt"></i>
                      </button>
                      <button
                        class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-red-600 hover:bg-red-50"
                        title="Delete"
                        @click="deletePermission(r.perm.id)"
                      >
                        <i class="far fa-trash-alt"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </template>

              <tr v-if="!filteredRows.length">
                <td colspan="5" class="px-4 py-12 text-center">
                  <div class="mx-auto max-w-sm">
                    <div class="text-slate-900 font-semibold">No permissions found</div>
                    <p class="mt-1 text-sm text-slate-500">
                      Try clearing filters or add a new permission.
                    </p>
                    <RouterLink
                      :to="{ name: 'PermissionsAdd' }"
                      class="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      + Add Permission
                    </RouterLink>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
