<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import UserChip from '../user/UserChip.vue'

const props = defineProps({
  users: { type: Array, required: true, default: () => [] },
  maxItems: { type: Number, default: 2 },
  routeTo: { type: Function, default: () => null },
  isTargetTask: { Boolean, default: false },
  listType: { String, default: 'employee' },
})

const slicedUsers = computed(() => {
  return props.users.slice(0, 2)
})

const hiddenUsers = computed(() => {
  return props.users.slice(2)
})

function routerLinkTo(item) {
  if (typeof props.routeTo == 'function') {
    return props.routeTo(item)
  }
}

const ItemComponent = computed(() => {
  if (typeof props.routeTo == 'function') {
    return RouterLink
  }
  return 'div'
})
</script>
<template>
  <div class="relative">
    <div v-if="props.users.length === 0" class="text-gray-500 text-xs">
      {{ listType == 'supervisors' ? 'No Supervisor assigned' : 'Not Assigned To Anyone' }}
    </div>
    <component
      v-else
      :is="ItemComponent"
      v-for="(item, index) in slicedUsers"
      :key="index"
      :to="routerLinkTo(item)"
    >
      <UserChip
        class="flex items-center gap-2 border rounded-full border-gray-300 shadow-sm"
        :class="{
          '!bg-yellow-400': isTargetTask,
          ' !bg-blue-100': !isTargetTask && listType == 'employee' && index === 0,
        }"
        :user="item"
      >
        <template #after v-if="index === 0 || listType == 'supervisors'">
          <div
            class="border rounded-full size-6 flex justify-center items-center border-blue-300 bg-blue-100"
          >
            <i class="fas fa-user-cowboy text-blue-500" v-if="listType == 'supervisors'"></i>
            <i class="fas fa-user-crown text-blue-300" v-else></i>
          </div>
        </template>
      </UserChip>
    </component>

    <div v-if="hiddenUsers.length > 0" class="text-sm text-gray-500 group/users">
      <div class="cursor-pointer hover:underline text-blue-600">
        + {{ hiddenUsers.length }} more users
      </div>

      <div
        class="hidden absolute group-hover/users:block right-0 p-3 bg-white rounded shadow-lg z-30"
      >
        <component
          :is="ItemComponent"
          v-for="(item, index) in hiddenUsers"
          :key="index"
          :to="routerLinkTo(item)"
          class="w-full block mb-2"
        >
          <UserChip
            class="flex items-center gap-2 border rounded-full border-gray-300 shadow-sm w-full"
            :class="{ '!bg-yellow-400': isTargetTask }"
            :user="item"
          />
        </component>
      </div>
    </div>
  </div>
</template>
