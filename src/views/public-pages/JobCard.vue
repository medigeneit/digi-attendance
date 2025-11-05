<template>
  <article class="border rounded-xl p-4 bg-white hover:shadow-md transition">
    <h3 class="text-lg font-semibold">
      <RouterLink :to="{ name: 'careers.show', params: { slug: job.slug } }" class="hover:underline">
        {{ job.title }}
      </RouterLink>
    </h3>
    <p class="text-sm text-gray-600 mt-1 line-clamp-3" v-html="job.summary"></p>

    <div class="mt-3 text-sm flex flex-wrap gap-2">
      <span v-if="job.department?.name" class="px-2 py-1 rounded bg-gray-100 border">
        {{ job.department.name }}
      </span>
      <span v-if="job.employment_type" class="px-2 py-1 rounded bg-gray-100 border">
        {{ job.employment_type }}
      </span>
      <span v-if="job.workplace" class="px-2 py-1 rounded bg-gray-100 border">
        {{ job.workplace }}
      </span>
      <span v-if="job.experience_level" class="px-2 py-1 rounded bg-gray-100 border">
        {{ job.experience_level }}
      </span>
    </div>

    <div class="mt-3 text-xs text-gray-500">
      <span v-if="job.application_deadline">Deadline: {{ job.application_deadline }}</span>
    </div>

    <div class="mt-4">
      <RouterLink :to="{ name: 'careers.show', params: { slug: job.slug } }"
                  class="inline-block px-4 py-2 rounded-lg border hover:bg-gray-50">
        Details
      </RouterLink>
    </div>
  </article>
</template>

<script setup>
defineProps({
  job: { type: Object, required: true }
});
</script>
