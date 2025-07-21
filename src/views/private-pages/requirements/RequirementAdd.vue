<script setup>
import RequirementAddForm from '@/components/requirements/RequirementAddForm.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

function handleRequirementCreate(response) {
  const requirement = response.data?.requirement || null
  if (requirement) {
    router.push({ name: 'RequirementShow', params: { id: requirement.id } })
  }
}
</script>

<template>
  <div class="container mx-auto p-6">
    <RequirementAddForm @create="handleRequirementCreate" />
  </div>
</template>
