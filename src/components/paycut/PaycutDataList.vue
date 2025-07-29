<script setup>
import UpdateApprovalTime from './UpdateOrCreate.vue'
import DisplayFormattedWorkingHours from './DisplayFormattedWorkingHours.vue'

import { usePaycutStore } from '@/stores/paycut'
const paycutStore = usePaycutStore()
const props = defineProps({
  paycuts: Array
})

const emit = defineEmits(['updated'])

const handleDelete = async (id) => {
  const confirmDelete = window.confirm('Are you sure you want to delete this paycut?')
  if (!confirmDelete) return

  await paycutStore.deletePaycut(id)
  emit('updated') // refresh the list in parent
}
</script>

<template>
  <table class="table-auto w-full border text-sm">
    <thead>
      <tr class="bg-gray-200 text-left">
        <th class="p-2">#</th>
        <th class="p-2">Employee</th>
        <th class="p-2">Paycut Hours</th>
        <th class="p-2">Reason</th>
        <th class="p-2">Note</th>
        <th class="p-2">Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(cut, index) in paycuts"
        :key="cut.id"
        class="border-t hover:bg-gray-50"
      >
        <td class="p-2">{{ index + 1 }}</td>
        <td class="p-2">{{ cut.user?.name || 'N/A' }}</td>
        <td class="p-2">
            <DisplayFormattedWorkingHours :workingHours="cut.paycut_hours"/>
        </td>
        <td class="p-2">{{ cut.reason || '-' }}</td>
        <td class="p-2">{{ cut.note || '-' }}</td>
        <td class="p-2 flex gap-2">
          <UpdateApprovalTime
            :userId="cut.user_id"
            :month="cut.month"
            @updated="emit('updated')"
          />
          <button
            class="text-red-500 hover:text-red-700 text-xs"
            ty
            @click="handleDelete(cut.id)"
        >
            <i class="fas fa-trash-alt"></i>
        </button>
        </td>
      </tr>
    </tbody>
  </table>
</template>
