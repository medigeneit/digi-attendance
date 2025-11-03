<template>
  <div class="w-full p-1">
    <table class="w-full rounded-b" v-if="tasks?.length > 0">
      <thead>
        <tr>
          <td
            class="border text-center text-xs text-gray-400 bg-gray-50/80 w-[30px] sticky -top-4 z-20"
          >
            SL
          </td>
          <td
            class="border text-center text-xs text-gray-400 bg-gray-50/80 sticky -top-4 z-20 px-2 whitespace-nowrap"
          >
            Task
          </td>
          <td
            class="border text-center text-xs text-gray-400 bg-gray-50/80 sticky -top-4 z-20 px-2 whitespace-nowrap"
          >
            Assign Person
          </td>

          <td
            class="border text-center text-xs text-gray-400 bg-gray-50/80 sticky -top-4 z-20 px-2 whitespace-nowrap"
          >
            Deadline
          </td>

          <td
            class="border text-center text-xs text-gray-400 bg-gray-50/80 -top-4 z-20 sticky right-0 border-l bg-sky-50 px-2 whitespace-nowrap"
          >
            Status
          </td>
        </tr>
      </thead>
      <tbody>
        <template v-for="(requirement, requirementIndex) in requirements" :key="requirement.id">
          <tr class="group/dept">
            <th colspan="10" class="font-semibold" :class="[requirementIndex > 0 ? '' : '']">
              <div
                class="text-left -mx-[2px] -mb-[1px] py-2 px-2 flex items-center border border-b-0 rounded-t bg-emerald-50"
                :class="[
                  requirement.id === 0 ? 'text-gray-500' : 'text-sky-800',
                  requirementIndex > 0 ? 'mt-4' : '',
                  // requirement.id === 0 ? 'bg-gray-50' : 'bg-gray-50',
                ]"
              >
                <div class="flex gap-1 items-start text-base">
                  <div class="font-bold text-lime-600">{{ requirementIndex + 1 }}.</div>
                  <p v-if="requirement.id === 0">{{ requirement.title }}</p>
                  <RouterLink
                    v-else
                    :to="`requirements/show/${requirement.id}`"
                    class="line-clamp-2 hover:underline"
                  >
                    {{ requirement.title }}
                  </RouterLink>
                </div>

                <div class="ml-auto">
                  <button
                    v-if="route?.name == 'RequirementTaskList'"
                    @click="
                      emits(
                        'clickAddTask',
                        {
                          requirement_id: requirement?.id,
                          from_department_id: requirement?.from_department_id,
                          to_department_id: requirement?.to_department_id,
                        },
                        {
                          requirement_id: true,
                          from_department_id: true,
                          to_department_id: true,
                        },
                      )
                    "
                    class="btn-2 whitespace-nowrap h-6 px-3 opacity-70 group-hover/dept:opacity-100"
                  >
                    <i class="fas fa-plus-circle"></i>
                    Add Task
                  </button>
                </div>
              </div>
            </th>
          </tr>
          <TaskTableRow
            v-for="(task, taskIndex) in requirement.tasks"
            :key="task.id"
            :task="task"
            :indexing="`${requirementIndex + 1}.${taskIndex + 1}`"
            @editClick="(t) => emits('editClick', t)"
            @employeeAssignClick="(t) => emits('employeeAssignClick', t)"
            :taskLinkTo="taskLinkTo"
            :hideButtons="hideButtons"
          />
        </template>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import TaskTableRow from '@/components/tasks/TaskTableRow.vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps({
  tasks: { type: Array, required: true, default: () => [] },
  hideButtons: { type: Boolean, default: false },
  parentTreeLevel: { type: Number },
  maxItem: { Number, default: 5 },
  isMyTask: { type: Boolean, default: false },
  taskLinkTo: { type: Function, default: null },
})

const route = useRoute()

const requirements = computed(() => {
  return props.tasks
    .reduce((requirements, task) => {
      const key = task.requirement?.id || '-'

      const requirementList = [...requirements]

      const foundRequirement = requirementList.find((d) => d?.key == key)

      if (!foundRequirement) {
        requirementList.push({
          key: key,
          position: task?.requirement ? 0 : 1,
          ...(task?.requirement || { title: '(Other tasks)', id: 0 }),
          tasks: [task],
        })
      } else {
        foundRequirement.tasks = [...foundRequirement.tasks, task]
      }

      return requirementList
    }, [])
    .sort((requirementA, requirementB) => requirementA.position - requirementB.position)
})

// @editClick="(taskId) => (editingId = taskId)"

const emits = defineEmits(['editClick', 'addClick', 'employeeAssignClick', 'clickAddClick'])
</script>
