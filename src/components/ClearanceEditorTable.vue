<script setup>
import HandoverSelect from './HandoverSelect.vue'
import StatusSegment from './StatusSegment.vue'
import StatusPill from './StatusPill.vue'

const props = defineProps({
  rows: { type: Array, default: () => [] }, // itemsForTable
})
const emit = defineEmits(['update:row']) // (tid, patch)
</script>

<template>
  <div class="card overflow-hidden">
    <div class="px-4 py-3 border-b bg-white flex items-center justify-between">
      <div class="text-sm text-gray-600">Assigned items: <b>{{ rows.length }}</b></div>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-3 py-2 text-left">#</th>
            <th class="px-3 py-2 text-left">Item</th>
            <th class="px-3 py-2 text-left">Handover</th>
            <th class="px-3 py-2 text-left">Present Condition</th>
            <th class="px-3 py-2 text-left">Receiver</th>
            <th class="px-3 py-2 text-left">Status</th>
            <th class="px-3 py-2 text-left">Remarks</th>
            <th class="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(r, i) in rows"
            :key="r.template_item_id"
            class="border-t"
          >
            <td class="px-3 py-2">{{ i+1 }}</td>
            <td class="px-3 py-2">
              <div class="font-medium">{{ r.label }}</div>
              <div v-if="r._isDirty" class="text-xs text-amber-600">unsaved</div>
            </td>
            <td class="px-3 py-2">
              <HandoverSelect
                :model-value="r.handover_status"
                @update:model-value="v => emit('update:row', r.template_item_id, { handover_status: v })"
              />
            </td>
            <td class="px-3 py-2">
              <input
                :value="r.present_condition"
                @input="e => emit('update:row', r.template_item_id, { present_condition: e.target.value })"
                class="input"
                placeholder="e.g., OK / scratches..."
              />
            </td>
            <td class="px-3 py-2">
              <input
                :value="r.receiver_name"
                @input="e => emit('update:row', r.template_item_id, { receiver_name: e.target.value })"
                class="input"
                placeholder="Receiver name"
              />
            </td>
            <td class="px-3 py-2">
              <StatusSegment
                :model-value="r.status"
                @update:model-value="v => emit('update:row', r.template_item_id, { status: v })"
              />
            </td>
            <td class="px-3 py-2">
              <input
                :value="r.remarks"
                @input="e => emit('update:row', r.template_item_id, { remarks: e.target.value })"
                class="input"
                placeholder="Remarks"
              />
            </td>
            <td class="px-3 py-2">
              <StatusPill :v="r.status" />
            </td>
          </tr>
          <tr v-if="rows.length===0">
            <td colspan="8" class="px-3 py-8 text-center text-gray-500">No items</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
