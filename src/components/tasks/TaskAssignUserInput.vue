<script setup>
import { computed } from 'vue'
import DraggableList from '../common/DraggableList.vue'
import MultiselectDropdown from '../MultiselectDropdown.vue'
import UserChip from '../user/UserChip.vue'
import TaskUserChip from './TaskUserChip.vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  employees: { type: Array, required: true },
  listType: { type: String, default: 'employee' }, //employee, supervisor
})

const emit = defineEmits(['update:modelValue'])

function handleUserRemove(user) {
  const newValue = props.modelValue.filter((su) => su.id !== user.id)
  console.log({ newValue })
  emit('update:modelValue', newValue)
}

const selectedUsers = computed({
  get() {
    return props.modelValue
  },
  set(val) {
    emit('update:modelValue', val)
  },
})

function handlePriorityUpdate(a) {
  emit('update:modelValue', a)
}
</script>

<template>
  <MultiselectDropdown
    v-model="selectedUsers"
    :options="employees"
    :multiple="true"
    track-by="id"
    label="label"
    placeholder="Select users"
  >
    <template #selection="{ ...attrs }">
      <DraggableList
        :items="attrs?.values || []"
        handle="handle"
        class="mb-2 flex flex-wrap gap-x-4 gap-y-3"
        @itemsUpdate="handlePriorityUpdate"
      >
        <template #item="{ item: user, index }">
          <TaskUserChip
            :user="user"
            :userType="
              index === 0 && listType == 'employee'
                ? 'main-employee'
                : listType == 'supervisor'
                  ? listType
                  : 'employee'
            "
            :isRemovable="index > 0"
            :isSortable="index > 0"
            @removeClick="() => handleUserRemove(user)"
          />
        </template>
      </DraggableList>
    </template>
    <template #option="{ option: user }">
      <UserChip :user="user" />
    </template>
  </MultiselectDropdown>
</template>
