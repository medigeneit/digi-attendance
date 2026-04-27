<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'

import LoaderView from '@/components/common/LoaderView.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'
import CompanyBankAccountModal from '@/components/settings/CompanyBankAccountModal.vue'

import { useCompanyStore } from '@/stores/company'
import { useCompanyBankAccountStore } from '@/stores/companyBankAccount'

const router = useRouter()
const toast = useToast()
const companyStore = useCompanyStore()
const bankAccountStore = useCompanyBankAccountStore()

const filters = ref({
  company_id: '',
  status: '',
  q: '',
})

const showModal = ref(false)
const showDeleteModal = ref(false)
const selected = ref(null)
const saving = ref(false)

const companies = computed(() => companyStore.companies || [])
const rows = computed(() => bankAccountStore.items || [])
const q = computed(() => String(filters.value.q || '').trim().toLowerCase())

const companyName = (companyId) => {
  const c = (companies.value || []).find((x) => String(x.id) === String(companyId))
  return c ? (c.short_name ? `${c.name} (${c.short_name})` : c.name) : `Company #${companyId}`
}

const visibleRows = computed(() => {
  if (!q.value) return rows.value || []
  return (rows.value || []).filter((row) => {
    const hay = [
      companyName(row.company_id),
      row.bank_name,
      row.branch_name,
      row.account_name,
      row.account_number,
      row.routing_number,
      row.swift_code,
      row.currency_code,
      row.account_type,
      row.status,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return hay.includes(q.value)
  })
})

const stats = computed(() => ({
  total: (rows.value || []).length,
  visible: (visibleRows.value || []).length,
}))

const load = async () => {
  await companyStore.fetchCompanies()
  await bankAccountStore.fetchCompanyBankAccounts({
    company_id: filters.value.company_id || undefined,
    status: filters.value.status || undefined,
  })
}

const openAddModal = () => {
  selected.value = null
  showModal.value = true
}

const openEditModal = (row) => {
  selected.value = row
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const openDelete = (row) => {
  selected.value = row
  showDeleteModal.value = true
}

const closeDelete = () => {
  showDeleteModal.value = false
}

const handleSave = async (payload) => {
  saving.value = true
  try {
    const data = { ...payload }
    delete data.id

    if (data.company_id !== '' && data.company_id !== null && data.company_id !== undefined) {
      data.company_id = Number(data.company_id)
    }

    if (payload?.id) {
      await bankAccountStore.updateCompanyBankAccount(payload.id, data)
      toast.success('Bank account updated successfully!')
    } else {
      await bankAccountStore.createCompanyBankAccount(data)
      toast.success('Bank account added successfully!')
    }

    await load()
  } catch (e) {
    toast.error(bankAccountStore.error || e?.response?.data?.message || 'Failed to save bank account!')
  } finally {
    saving.value = false
    closeModal()
  }
}

const handleDelete = async () => {
  if (!selected.value?.id) return
  saving.value = true
  try {
    await bankAccountStore.deleteCompanyBankAccount(selected.value.id)
    toast.success('Bank account deleted successfully!')
    await load()
  } catch (e) {
    toast.error(bankAccountStore.error || e?.response?.data?.message || 'Failed to delete bank account!')
  } finally {
    saving.value = false
    closeDelete()
  }
}

onMounted(async () => {
  try {
    await load()
  } catch {
    toast.error('Failed to load bank accounts.')
  }
})

let filterTimer = null
watch(
  () => [filters.value.company_id, filters.value.status],
  () => {
    if (filterTimer) clearTimeout(filterTimer)
    filterTimer = setTimeout(() => load(), 250)
  },
)
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-4">
    <div class="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50 p-5 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <button class="btn-3" @click="router.go(-1)">
            <i class="far fa-arrow-left"></i>
            <span class="hidden md:flex">Back</span>
          </button>
          <div>
            <h1 class="text-2xl font-bold text-slate-900">Company Bank Accounts</h1>
            <p class="mt-1 text-sm text-slate-500">Maintain company-wise salary bank accounts.</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="text-xs text-slate-500">
            Showing <span class="font-bold text-slate-800">{{ stats.visible }}</span> of
            <span class="font-bold text-slate-800">{{ stats.total }}</span>
          </div>
          <button class="btn-2" @click="openAddModal">
            <i class="far fa-plus"></i>
            <span>Add New</span>
          </button>
        </div>
      </div>
    </div>

    <div class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="grid gap-3 lg:grid-cols-[1fr_0.7fr_1fr_auto] items-end">
        <div>
          <label class="mb-1 block text-xs font-medium text-slate-600">Company</label>
          <select v-model="filters.company_id" class="input-light">
            <option value="">All Companies</option>
            <option v-for="c in companies" :key="c.id" :value="c.id">
              {{ c.short_name ? `${c.name} (${c.short_name})` : c.name }}
            </option>
          </select>
        </div>

        <div>
          <label class="mb-1 block text-xs font-medium text-slate-600">Status</label>
          <select v-model="filters.status" class="input-light">
            <option value="">All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div>
          <label class="mb-1 block text-xs font-medium text-slate-600">Search</label>
          <input v-model="filters.q" type="text" class="input-light" placeholder="Search bank, account, routing, company..." />
        </div>

        <button class="btn-3 h-[44px]" @click="load">
          <i class="far fa-search"></i> Load
        </button>
      </div>
    </div>

    <div class="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full table-auto">
          <thead>
            <tr class="bg-slate-50 text-slate-700 text-sm leading-normal">
              <th class="py-3 px-3 text-left">#</th>
              <th class="py-3 px-3 text-left">Company</th>
              <th class="py-3 px-3 text-left">Bank</th>
              <th class="py-3 px-3 text-left">Account</th>
              <th class="py-3 px-3 text-left">Routing / SWIFT</th>
              <th class="py-3 px-3 text-center">Default</th>
              <th class="py-3 px-3 text-center">Status</th>
              <th class="py-3 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody class="text-slate-700 text-sm">
            <tr v-if="bankAccountStore.loading">
              <td colspan="8" class="py-10">
                <LoaderView />
              </td>
            </tr>

            <template v-else-if="visibleRows && visibleRows.length">
              <tr
                v-for="(row, index) in visibleRows"
                :key="row.id"
                class="border-t border-slate-100 hover:bg-blue-50/40"
              >
                <td class="py-3 px-3 text-left font-semibold text-slate-600">{{ index + 1 }}</td>
                <td class="py-3 px-3 text-left whitespace-nowrap">
                  <div class="font-semibold text-slate-900">{{ companyName(row.company_id) }}</div>
                  <div class="text-xs text-slate-500">ID: {{ row.company_id }}</div>
                </td>
                <td class="py-3 px-3 text-left">
                  <div class="font-semibold text-slate-900">{{ row.bank_name }}</div>
                  <div class="text-xs text-slate-500">{{ row.branch_name || '-' }}</div>
                </td>
                <td class="py-3 px-3 text-left">
                  <div class="font-semibold text-slate-900">{{ row.account_number }}</div>
                  <div class="text-xs text-slate-500">
                    {{ row.account_name || '-' }} · {{ row.currency_code || 'BDT' }}
                    <span v-if="row.account_type">· {{ row.account_type }}</span>
                  </div>
                </td>
                <td class="py-3 px-3 text-left">
                  <div class="text-xs">
                    <span class="font-semibold text-slate-500">Routing:</span> {{ row.routing_number || '-' }}
                  </div>
                  <div class="text-xs">
                    <span class="font-semibold text-slate-500">SWIFT:</span> {{ row.swift_code || '-' }}
                  </div>
                </td>
                <td class="py-3 px-3 text-center">
                  <span
                    class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                    :class="row.is_default ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'"
                  >
                    {{ row.is_default ? 'Yes' : 'No' }}
                  </span>
                </td>
                <td class="py-3 px-3 text-center">
                  <span
                    class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                    :class="String(row.status).toLowerCase() === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'"
                  >
                    {{ row.status }}
                  </span>
                </td>
                <td class="py-3 px-3 text-center">
                  <div class="flex item-center justify-center gap-2">
                    <button
                      class="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
                      @click="openEditModal(row)"
                      title="Edit"
                    >
                      <i class="fas fa-edit"></i>
                    </button>
                    <button
                      class="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50"
                      @click="openDelete(row)"
                      title="Delete"
                    >
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </template>

            <tr v-else>
              <td colspan="8" class="py-14 text-center">
                <div class="mx-auto max-w-md">
                  <div class="text-3xl text-slate-300"><i class="far fa-folder-open"></i></div>
                  <div class="mt-2 text-sm font-semibold text-slate-800">No bank accounts found</div>
                  <div class="mt-1 text-xs text-slate-500">Try changing filters, or add a new company bank account.</div>
                  <button class="btn-2 mx-auto mt-4" @click="openAddModal">
                    <i class="far fa-plus"></i> Add New
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <CompanyBankAccountModal
      :show="showModal"
      :saving="saving"
      :bank-account="selected"
      :companies="companies"
      @close="closeModal"
      @save="handleSave"
    />

    <DeleteModal
      :show="showDeleteModal"
      :title="'Delete Bank Account'"
      :message="`Are you sure you want to delete ${selected?.bank_name || 'this item'} (${selected?.account_number || '-'})?`"
      @close="closeDelete"
      @confirm="handleDelete"
    />
  </div>
</template>

