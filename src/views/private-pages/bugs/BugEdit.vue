<script setup>
import { useBugStore } from '@/stores/useBugStore'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const store = useBugStore()
const route = useRoute()
const router = useRouter()

const bugId = route.params.id
const loading = ref(false)

const form = ref({
  title: '',
  description: '',
  status: '',
})

onMounted(async () => {
  await store.fetchBug(bugId) // optional: API fallback
  form.value = {
    title: store.bug?.title || '',
    description: store.bug?.description || '',
    status: store.bug?.status || '',
  }
  // const bug = store.bugs.find((b) => b.id == bugId);
  // if (bug) {
  //   store.bug = bug;
  //   form.value = {
  //     title: bug.title,
  //     description: bug.description || "",
  //     status: bug.status || "",
  //   };
  // } else {

  // }
})

const update = async () => {
  loading.value = true
  await store.updateBug(bugId, form.value)
  loading.value = false

  if (!store.error) {
    router.push({ name: 'BugList' })
  }
}
</script>

<template>
  <div class="container mx-auto p-6">
    <div class="max-w-xl mx-auto bg-white shadow-lg rounded-lg p-6">
      <h2 class="text-2xl font-semibold text-gray-800 mb-4">Edit Bug</h2>

      <form v-if="store.bug" @submit.prevent="update">
        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">Bug Title</label>
          <input
            v-model="form.title"
            required
            placeholder="Enter bug title"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div>
          <label class="block text-gray-700 font-medium mb-2">Status</label>
          <select
            v-model="form.status"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="OPEN">OPEN</option>
            <option value="SOLVED">SOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>

        <div class="mb-4">
          <label class="block text-gray-700 font-medium mb-2">Description (Optional)</label>
          <textarea
            v-model="form.description"
            rows="4"
            placeholder="Enter bug description"
            class="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-red-500"
          ></textarea>
        </div>

        <div v-if="store.error" class="mb-4 text-red-500 font-medium">
          {{ store.error }}
        </div>

        <div class="flex items-center gap-4">
          <button
            :disabled="loading"
            type="submit"
            class="bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-2 rounded transition"
          >
            {{ loading ? 'Updating...' : 'Update Bug' }}
          </button>

          <button
            type="button"
            @click="router.push({ name: 'BugList' })"
            class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-5 py-2 rounded transition"
          >
            Cancel
          </button>
        </div>
      </form>

      <div v-else class="text-center text-gray-500 py-6">Bug not found.</div>
    </div>
  </div>
</template>
