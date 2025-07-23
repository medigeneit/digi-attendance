<script setup>
import RequirementEditForm from '@/components/requirements/RequirementEditForm.vue'

import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
</script>

<template>
  <div class="container mx-auto p-6">
    <RequirementEditForm
      :requirementId="route.params.id"
      @update="() => router.back()"
      @cancelClick="() => router.back()"
    />
  </div>
</template>
