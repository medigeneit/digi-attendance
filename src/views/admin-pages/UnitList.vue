<script setup>
import UnitModal from '@/components/UnitModal.vue'
import DeleteModal from '@/components/common/DeleteModal.vue'
import HeaderWithButtons from '@/components/common/HeaderWithButtons.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import { useUnitStore } from '@/stores/unit'
import { onMounted, ref } from 'vue'
import { useToast } from 'vue-toastification'

const unitStore = useUnitStore()
const toast = useToast()

const showUnitModal = ref(false)
const showDeleteModal = ref(false)
const selectedUnit = ref(null)

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
  <div class="my-container space-y-2">
    <HeaderWithButtons title="Unit List" @add="openAddModal" />

    <div class="overflow-x-auto">
      <table class="min-w-full table-auto bg-white shadow-md rounded-lg overflow-hidden">
        <thead>
          <tr class="bg-gray-200 text-gray-700 text-sm leading-normal">
            <th class="py-3 px-2 text-left">#</th>
            <th class="py-3 px-2 text-left">Name</th>
            <th class="py-3 px-2 text-left">Short Name</th>
            <th class="py-3 px-2 text-center">Status</th>
            <th class="py-3 px-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody class="text-gray-600 text-sm">
          <tr v-if="unitStore.loading" class="hover:bg-gray-200">
            <td colspan="5">
              <LoaderView />
            </td>
          </tr>
          <template v-else-if="unitStore.units && unitStore.units.length">
            <tr
              v-for="(unit, index) in unitStore.units"
              :key="unit.id"
              class="border-b border-gray-200 hover:bg-blue-200"
            >
              <td class="py-3 px-2 text-left">
                <p class="font-medium">{{ index + 1 }}</p>
              </td>
              <td class="py-3 px-2 text-left">
                <p class="font-medium">{{ unit.name }}</p>
              </td>
              <td class="py-3 px-2 text-left whitespace-nowrap">
                <p class="font-medium">{{ unit.short_name }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <p class="font-medium">{{ unit.status }}</p>
              </td>
              <td class="py-3 px-2 text-center">
                <div class="flex item-center justify-center gap-4">
                  <button @click="openEditModal(unit)" class="text-blue-600 hover:text-blue-800">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button @click="openDeleteModal(unit)" class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </template>
          <tr v-else>
            <td colspan="5" class="text-center text-red-500 py-4">No units found</td>
          </tr>
        </tbody>
      </table>
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
