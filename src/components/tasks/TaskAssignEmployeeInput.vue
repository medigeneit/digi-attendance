<script setup>
import { computed } from 'vue'
import DraggableList from '../common/DraggableList.vue'
import SelectDropdown from '../SelectDropdown.vue'
import UserChip from '../user/UserChip.vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  employees: { type: Array, required: true },
  listType: { type: String, default: 'employee' }, //employee, supervisor
  placeholder: { type: String, default: '' }, //employee, supervisor
  isRemovable: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const selectedUserIds = computed({
  get() {
    return props.modelValue
  },
  set(val) {
    emit('update:modelValue', val)
  },
})

function handleUserIdsPriorityUpdate(newList) {
  selectedUserIds.value = [...newList]
  console.log({ newList })
  // emit('update:modelValue', newList)
}

function isSupervisor() {
  return props.listType === 'supervisor'
}

function isMainEmployee(index) {
  return props.listType === 'employee' && index === 0
}
</script>

<template>
  <SelectDropdown
    v-model="selectedUserIds"
    :options="employees"
    :placeholder="placeholder"
    class="border-sky-200 bg-sky-50"
    multiple
    hide-selected-value
  >
    <template #selected-options="{ items, removeItem, getOption }">
      <div class="w-full">
        <DraggableList
          :items="items || []"
          handle="handle"
          class="flex flex-col gap-x-4 gap-y-1.5 w-full"
          @itemsUpdate="handleUserIdsPriorityUpdate"
        >
          <template #item="{ item: userId, index }">
            <UserChip
              :user="getOption(userId)"
              :isRemovable="index > 0"
              :isSortable="index > 0"
              @removeClick="() => removeItem(userId)"
              avatar-size="large"
              :avatar-class="['transition', isMainEmployee(index) ? '!size-8 ' : '']"
              :class="[
                'w-full flex bg-white !shadow ',
                isMainEmployee(index) ? 'size-10 :size-12' : 'size-8',
              ]"
            >
              <template #title-bottom v-if="isMainEmployee(index)">
                <span class="text-xs italic text-gray-400">Responsible for Task</span>
              </template>
              <template #after>
                <button
                  class="btn-icon size-6 ml-auto font-bold text-xl text-red-600/60 hover:text-red-600"
                  @click.prevent.stop="removeItem(userId)"
                  v-if="!isMainEmployee(index) || isSupervisor()"
                >
                  &times;
                </button>

                <button
                  type="button"
                  v-if="items.length > 1 && (!isMainEmployee(index) || isSupervisor())"
                  class="btn-icon size-6 handle text-gray-500 hover:text-gray-800"
                  @click.stop="() => null"
                >
                  <i class="fas fa-arrows"></i>
                </button>

                <div
                  v-if="isSupervisor()"
                  class="btn-icon size-6 bg-blue-200 text-blue-800 border-blue-300"
                >
                  <i class="fas fa-user-cowboy text-base"></i>
                </div>
                <div
                  v-else-if="isMainEmployee(index)"
                  class="btn-icon size-8 ml-auto bg-blue-200 text-blue-800 border-blue-300"
                >
                  <i class="fas fa-user-crown text-xl"></i>
                </div>
              </template>
            </UserChip>
          </template>
        </DraggableList>
      </div>
    </template>
    <template #option="{ option }">
      <UserChip :user="option" />
    </template>
  </SelectDropdown>
</template>
