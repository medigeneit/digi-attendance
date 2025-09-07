<script setup>
import { computed, shallowRef } from 'vue'
import DraggableList from '../common/DraggableList.vue'
import MultiselectDropdown from '../MultiselectDropdown.vue'
import SelectDropdown from '../SelectDropdown.vue'
import UserChip from '../user/UserChip.vue'
import TaskUserChip from './TaskUserChip.vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  employees: { type: Array, required: true },
  listType: { type: String, default: 'employee' }, //employee, supervisor
  isRemovable: { type: Boolean, default: false },
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

const userIds = shallowRef([])

function handleUserIdsPriorityUpdate(newList) {
  userIds.value = [...newList]
  console.log({ newList })
}

const getEmployees = computed(() => {
  return props.employees.filter((emp) => !userIds.value.includes(emp.id))
})
</script>

<template>
  <div>
    {{ userIds }}
    <SelectDropdown v-model="userIds" multiple :options="employees" class="mb-8">
      <template #selected-options="{ items, removeItem, getOption }">
        <div class="w-full">
          <DraggableList
            :items="items || []"
            handle="handle"
            class="mb-2 flex flex-col gap-x-4 gap-y-3 w-full"
            @itemsUpdate="handleUserIdsPriorityUpdate"
          >
            <template #item="{ item: userId, index }">
              <UserChip
                :user="getOption(userId)"
                :isRemovable="index > 0"
                :isSortable="index > 0"
                @removeClick="() => removeItem(userId)"
                :class="['w-full flex', index === 0 ? 'size-10' : 'size-8']"
              >
                <template #after>
                  <button
                    class="btn-icon size-6 ml-auto"
                    @click.prevent.stop="removeItem(userId)"
                    v-if="index > 0"
                  >
                    &times;
                  </button>

                  <button
                    type="button"
                    v-if="index > 0 && userType !== 'supervisor'"
                    class="btn-icon size-6 handle"
                  >
                    <i class="fas fa-arrows"></i>
                  </button>
                  <div
                    v-else
                    class="btn-icon size-8 ml-auto bg-blue-200 text-blue-800 border-blue-300"
                  >
                    <i class="fas fa-user-crown text-xl"></i>
                  </div>
                </template>
              </UserChip>
            </template>
          </DraggableList>

          <!-- <UserChip v-for="userId in items" :key="userId" :user="getOption(userId)" class=" ">
            <template #after>
              <button class="btn-icon size-6" @click.prevent="removeItem(userId)">&times;</button>
            </template>
          </UserChip> -->
        </div>
      </template>
      <template #option="{ option }">
        <UserChip :user="option" />
      </template>
    </SelectDropdown>

    <MultiselectDropdown
      v-model="selectedUsers"
      :options="employees"
      :multiple="true"
      track-by="id"
      label="label"
      placeholder="Select users"
      class="[&_.multiselect]:w-auto [&_.multiselect]:border [&_.multiselect]:h-full"
    >
      <template #selection="{ ...attrs }">
        <template v-if="listType == 'supervisor'">
          <div class="mb-2 flex flex-wrap gap-x-4 gap-y-3 pb-0.5">
            <TaskUserChip
              v-for="user in attrs?.values || []"
              :key="user.id"
              :user="user"
              userType="supervisor"
              :isRemovable="isRemovable"
              @removeClick="() => handleUserRemove(user)"
              class="h-10 items-center flex [&_.user-avatar]:h-8 [&_.clear-icon]:size-8"
            />
          </div>
        </template>

        <DraggableList
          v-else
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
              @removeClick="() => handleUserRemove(user)"
            />
          </template>
        </DraggableList>
      </template>
      <template #option="{ option: user }">
        <UserChip :user="user" class="w-full" />
      </template>
    </MultiselectDropdown>
  </div>
</template>
