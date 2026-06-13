<script setup>
import UnitModal from '@/components/UnitModal.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { useUnitStore } from '@/stores/unit'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const unitStore = useUnitStore()
const router = useRouter()
const toast = useToast()

const showUnitModal = ref(false)
const showDeleteModal = ref(false)
const selectedUnit = ref(null)

const filters = ref({
  q: '',
  status: '',
})

const units = computed(() => unitStore.units || [])
const searchText = computed(() =>
  String(filters.value.q || '')
    .trim()
    .toLowerCase(),
)

const visibleUnits = computed(() =>
  units.value.filter((unit) => {
    if (filters.value.status && unit.status !== filters.value.status) return false
    if (!searchText.value) return true

    return [unit.short_name, unit.project_code, unit.name, unit.status]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(searchText.value)
  }),
)

const stats = computed(() => {
  const active = units.value.filter((unit) => String(unit.status).toLowerCase() === 'active').length
  const unitCodes = new Set(units.value.map((unit) => unit.short_name).filter(Boolean))

  return {
    total: units.value.length,
    visible: visibleUnits.value.length,
    active,
    unitCodes: unitCodes.size,
  }
})

const unitRows = computed(() =>
  visibleUnits.value.map((unit, unitIndex, rows) => {
    const unitCode = unit.short_name || ''
    const firstIndex = rows.findIndex((item) => (item.short_name || '') === unitCode)

    return {
      unit,
      unitIndex,
      isFirstUnitCodeRow: firstIndex === unitIndex,
      unitCodeRowspan: rows.filter((item) => (item.short_name || '') === unitCode).length,
    }
  }),
)

const openAddModal = () => {
  selectedUnit.value = null
  showUnitModal.value = true
}

const closeUnitModal = () => {
  showUnitModal.value = false
}

const openEditModal = (unit) => {
  selectedUnit.value = unit
  showUnitModal.value = true
}

const openDeleteModal = (unit) => {
  selectedUnit.value = unit
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
}

const handleSave = async (unit) => {
  try {
    if (unit.id) {
      await unitStore.updateUnit(unit.id, unit)
      toast.success('Unit updated successfully!')
    } else {
      await unitStore.createUnit(unit)
      toast.success('Unit added successfully!')
    }
  } catch {
    toast.error(unitStore.error || 'Failed to save unit!')
  } finally {
    closeUnitModal()
  }
}

const handleDelete = async () => {
  if (!selectedUnit.value?.id) {
    toast.error('Invalid unit selected for deletion!')
    return
  }

  try {
    await unitStore.deleteUnit(selectedUnit.value.id)
    toast.success('Unit deleted successfully!')
  } catch {
    toast.error(unitStore.error || 'Failed to delete unit!')
  } finally {
    closeDeleteModal()
  }
}

onMounted(async () => {
  await unitStore.fetchUnits()
})
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-2">
    <div class="border border-slate-200 bg-white p-2 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex min-w-[260px] items-center gap-2">
          <button
            class="inline-flex h-8 w-8 items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Back"
            @click="router.go(-1)"
          >
            <i class="far fa-arrow-left"></i>
          </button>
          <div>
            <h1 class="text-base font-semibold leading-tight text-slate-900">
              Unit Project Mapping
            </h1>
            <div class="text-[11px] leading-tight text-slate-500">Unit, project code/name</div>
          </div>
        </div>

        <div class="flex flex-1 flex-wrap items-center justify-end gap-1.5">
          <span class="border border-slate-200 px-2 py-1 text-[11px] text-slate-600">
            <strong class="text-slate-900">{{ stats.visible }}</strong
            >/{{ stats.total }} rows
          </span>
          <span class="border border-slate-200 px-2 py-1 text-[11px] text-slate-600">
            <strong class="text-slate-900">{{ stats.unitCodes }}</strong> units
          </span>
          <span
            class="border border-emerald-100 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700"
          >
            <strong>{{ stats.active }}</strong> active
          </span>
          <button
            class="inline-flex h-8 items-center gap-1.5 bg-slate-900 px-2.5 text-xs font-semibold text-white hover:bg-slate-700"
            @click="openAddModal"
          >
            <i class="far fa-plus"></i>
            Add New
          </button>
        </div>
      </div>
    </div>

    <div class="border border-slate-200 bg-white p-2 shadow-sm">
      <div class="grid items-end gap-2 md:grid-cols-[1fr_150px_auto]">
        <div>
          <div class="relative">
            <i
              class="far fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"
            ></i>
            <input
              v-model="filters.q"
              type="text"
              class="h-8 w-full border border-slate-200 bg-white pl-8 pr-2 text-xs text-slate-800 outline-none focus:border-slate-400"
              placeholder="Unit code, project code, project name..."
            />
          </div>
        </div>

        <div>
          <select
            v-model="filters.status"
            class="h-8 w-full border border-slate-200 bg-white px-2 text-xs text-slate-800 outline-none focus:border-slate-400"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <button
          class="inline-flex h-8 items-center justify-center gap-1.5 border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          @click="unitStore.fetchUnits()"
        >
          <i class="far fa-sync"></i>
          Refresh
        </button>
      </div>
    </div>

    <div class="overflow-hidden border border-slate-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="min-w-full table-fixed">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <th class="w-12 px-2 py-1.5 text-left font-semibold">#</th>
              <th class="w-32 px-2 py-1.5 text-left font-semibold">Unit Code</th>
              <th class="w-28 px-2 py-1.5 text-left font-semibold">Project Code</th>
              <th class="px-2 py-1.5 text-left font-semibold">Project Name</th>
              <th class="w-24 px-2 py-1.5 text-center font-semibold">Status</th>
              <th class="w-20 px-2 py-1.5 text-center font-semibold">Action</th>
            </tr>
          </thead>
          <tbody class="text-xs text-slate-700">
            <tr v-if="unitStore.loading">
              <td colspan="6" class="py-8">
                <LoaderView />
              </td>
            </tr>
            <template v-else-if="unitRows.length">
              <tr
                v-for="row in unitRows"
                :key="row.unit.id"
                class="border-b border-slate-100 hover:bg-slate-50"
              >
                <td class="px-2 py-1.5 align-top font-semibold text-slate-500">
                  {{ row.unitIndex + 1 }}
                </td>
                <td
                  v-if="row.isFirstUnitCodeRow"
                  :rowspan="row.unitCodeRowspan"
                  class="border-r border-slate-100 bg-slate-50/60 px-2 py-1.5 align-middle"
                >
                  <div class="font-semibold text-slate-900">{{ row.unit.short_name }}</div>
                  <div class="text-[10px] leading-tight text-slate-500">
                    {{ row.unitCodeRowspan }} project{{ row.unitCodeRowspan > 1 ? 's' : '' }}
                  </div>
                </td>
                <td class="px-2 py-1.5 align-top">
                  <span
                    class="inline-flex min-w-8 items-center justify-center border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700"
                  >
                    {{ row.unit.project_code || '-' }}
                  </span>
                </td>
                <td class="px-2 py-1.5 align-top">
                  <div class="font-medium text-slate-900">{{ row.unit.name }}</div>
                </td>
                <td class="px-2 py-1.5 text-center align-top">
                  <span
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold"
                    :class="
                      String(row.unit.status).toLowerCase() === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    "
                  >
                    <span
                      class="h-1.5 w-1.5 rounded-full"
                      :class="
                        String(row.unit.status).toLowerCase() === 'active'
                          ? 'bg-emerald-500'
                          : 'bg-rose-500'
                      "
                    ></span>
                    {{ row.unit.status }}
                  </span>
                </td>
                <td class="px-2 py-1.5 text-center align-top">
                  <div class="flex items-center justify-center gap-1">
                    <button
                      @click="openEditModal(row.unit)"
                      class="inline-flex h-6 w-6 items-center justify-center border border-slate-200 text-[11px] text-slate-700 hover:bg-slate-50"
                      title="Edit"
                    >
                      <i class="fas fa-edit"></i>
                    </button>
                    <button
                      @click="openDeleteModal(row.unit)"
                      class="inline-flex h-6 w-6 items-center justify-center border border-rose-200 text-[11px] text-rose-700 hover:bg-rose-50"
                      title="Delete"
                    >
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </template>
            <tr v-else>
              <td colspan="6" class="py-8 text-center">
                <div class="mx-auto max-w-md">
                  <div class="text-2xl text-slate-300"><i class="far fa-folder-open"></i></div>
                  <div class="mt-1 text-xs font-semibold text-slate-800">
                    No unit projects found
                  </div>
                  <div class="mt-0.5 text-[11px] text-slate-500">
                    Try a different filter, or create a new unit project row.
                  </div>
                  <button
                    class="mx-auto mt-3 inline-flex h-8 items-center gap-1.5 bg-slate-900 px-2.5 text-xs font-semibold text-white hover:bg-slate-700"
                    @click="openAddModal"
                  >
                    <i class="far fa-plus"></i>
                    Add New
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-if="!unitStore.loading && unitRows.length"
        class="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-500"
      >
        <span>
          Showing <strong class="text-slate-800">{{ stats.visible }}</strong> rows across
          <strong class="text-slate-800">{{ stats.unitCodes }}</strong> unit codes
        </span>
        <span>Sorted by unit code and project code</span>
      </div>
    </div>

    <UnitModal
      :show="showUnitModal"
      :unit="selectedUnit"
      @close="closeUnitModal"
      @save="handleSave"
    />

    <DeleteModal
      :show="showDeleteModal"
      :title="'Delete Unit'"
      :message="`Are you sure you want to delete ${selectedUnit?.name}?`"
      @close="closeDeleteModal"
      @confirm="handleDelete"
    />
  </div>
</template>
