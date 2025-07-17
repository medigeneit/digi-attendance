<script setup>
import RequirementAddForm from '@/components/requirements/RequirementAddForm.vue'
import { useDepartmentStore } from '@/stores/department'
import { useProjectStore } from '@/stores/useProjectStore'
import { useRequirementStore } from '@/stores/useRequirementStore'

import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
const store = useRequirementStore()
const router = useRouter()

const projectStore = useProjectStore()

const project_id = ref('')
const title = ref('')
const description = ref('')
const priority = ref('MEDIUM')
const loading = ref(false)
const departmentStore = useDepartmentStore()
const { departments } = storeToRefs(departmentStore)
const { projects } = storeToRefs(projectStore)
const selectedDepartment = ref('')
const department_id = computed(() => selectedDepartment.value?.id)

onMounted(() => {
  departmentStore.fetchDepartments()
  projectStore.fetchProjects()
})

const submit = async () => {
  loading.value = true
  await store.createRequirement({
    project_id: project_id.value,
    title: title.value,
    department_id: department_id.value,
    description: [description.value],
    priority: priority.value,
  })
  loading.value = false

  if (!store.error) {
    router.push({ name: 'RequirementList' })
  }
}
</script>

<template>
  <div class="container mx-auto p-6">
    <RequirementAddForm />
  </div>
</template>
