<script setup>
import UserChip from '@/components/user/UserChip.vue'
import { useUserPermissionStore } from '@/stores/userPermissionStore'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const userPermissionStore = useUserPermissionStore()
const router = useRouter()
const { userPermissions: permissions, loading } = storeToRefs(userPermissionStore)

const q = ref('')
const companyId = ref('all')
const onlyAllDept = ref(false)

const goBack = () => router.back()
const editPermission = (userId) => router.push({ name: 'PermissionEdit', params: { id: userId } })

const deletePermission = async (id) => {
  if (!confirm('Delete this permission?')) return
  await userPermissionStore.deletePermission(id)
}

onMounted(() => {
  userPermissionStore.fetchUserPermissions()
})

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
  ;(permissions.value || []).forEach((p) => {
    const c = p?.company
    if (c?.id) map.set(String(c.id), c)
  })
  return Array.from(map.values()).sort((a, b) => String(a.name).localeCompare(String(b.name)))
})

const isAllDepartment = (perm) => {
  const ids = perm?.department_ids
  if (Array.isArray(ids)) return ids.includes('*')
  if (typeof ids === 'string') return ids === '*' || ids.includes('*')
  return false
}

const normalizedRows = computed(() => {
  const rows = []
  permissionUsers.value.forEach((u) => {
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
    rows = rows.filter((r) => {
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
    rows = rows.filter((r) => String(r.perm?.company?.id || '') === String(companyId.value))
  }

  if (onlyAllDept.value) {
    rows = rows.filter((r) => isAllDepartment(r.perm))
  }

  return rows
})

const serialByRowKey = computed(() => {
  const map = new Map()
  let i = 0
  filteredRows.value.forEach((r) => {
    map.set(r.perm.id, ++i)
  })
  return map
})

const deptChips = (perm) => {
  if (isAllDepartment(perm)) return [{ label: 'All', all: true }]
  const arr = Array.isArray(perm?.departments) ? perm.departments : []
  return arr.map((d) => ({ label: d, all: false }))
}

</script>

<template>
  <div class="mx-auto max-w-6xl space-y-5 px-4 py-6">
    <div class="flex items-center justify-between gap-3">
      <button
        class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        @click="goBack"
      >
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:inline">Back</span>
      </button>

      <div class="text-center">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">Access Control</p>
        <h1 class="mt-1 text-2xl font-semibold text-slate-900">Data Scope Permissions</h1>
        <p class="mt-1 text-xs text-slate-500">Manage company and department level access.</p>
      </div>

      <RouterLink
        :to="{ name: 'PermissionsAdd' }"
        class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
      >
        <span class="text-lg leading-none">+</span>
        Add New
      </RouterLink>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div class="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          <div class="relative w-full sm:w-96">
            <i class="far fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              v-model="q"
              type="text"
              placeholder="Search user, email, company, department..."
              class="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <select
            v-model="companyId"
            class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="all">All companies</option>
            <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>

          <label class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <input v-model="onlyAllDept" type="checkbox" class="h-4 w-4 rounded border-slate-300" />
            Show All departments only
          </label>
        </div>

        <div class="text-xs text-slate-500">
          Showing <span class="font-semibold text-slate-700">{{ filteredRows.length }}</span> permissions
        </div>
      </div>

      <div class="overflow-x-auto border-t border-slate-200">
        <table class="min-w-full text-sm">
          <thead class="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th class="w-12 px-4 py-3 text-left">#</th>
              <th class="px-4 py-3 text-left">User</th>
              <th class="px-4 py-3 text-left">Company</th>
              <th class="px-4 py-3 text-left">Departments</th>
              <th class="w-28 px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100">
            <tr v-if="loading" class="bg-white">
              <td colspan="5" class="px-4 py-10 text-center text-slate-500">Loading permissions...</td>
            </tr>

            <template v-else>
              <tr v-for="r in filteredRows" :key="r.perm.id" class="hover:bg-slate-50/60">
                  <td class="whitespace-nowrap px-4 py-3 text-slate-500">
                    {{ serialByRowKey.get(r.perm.id) }}
                  </td>

                  <td v-if="r.isFirstForUser" class="px-4 py-3 align-top" :rowspan="r.rowspan">
                    <UserChip :user="r.user" />
                  </td>

                  <td class="px-4 py-3 text-slate-700">
                    <div class="font-medium text-slate-900">{{ r.perm.company?.name || '-' }}</div>
                    <div class="text-xs text-slate-500">Company ID: {{ r.perm.company?.id || '-' }}</div>
                  </td>

                  <td class="px-4 py-3">
                    <div class="flex max-w-xl flex-wrap gap-1.5">
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
                          :title="deptChips(r.perm).slice(4).map((x) => x.label).join(', ')"
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
                        @click="editPermission(r.user.id)"
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

              <tr v-if="!filteredRows.length">
                <td colspan="5" class="px-4 py-12 text-center">
                  <div class="mx-auto max-w-sm">
                    <div class="font-semibold text-slate-900">No permissions found</div>
                    <p class="mt-1 text-sm text-slate-500">Try clearing filters or add a new permission.</p>
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
