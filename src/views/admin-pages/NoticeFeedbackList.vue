<script setup>
import { useNoticeStore } from '@/stores/notice'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
const router = useRouter()
const route = useRoute()
const noticeStore = useNoticeStore()

// Custom debounce function
function debounce(func, wait = 300) {
  let timeout
  return function (...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      func.apply(this, args)
    }, wait)
  }
}

// Props থেকে noticeId নিবো
const props = defineProps({
  noticeId: {
    type: [String, Number],
    required: true,
  },
})

const searchQuery = ref('')
const currentPage = ref(1)
const perPage = 20
const isLoading = ref(false)

const { feedbacks, totalFeedbacks } = storeToRefs(noticeStore)

const fetchFeedbacks = async (reset = false) => {
  try {
    isLoading.value = true

    if (reset) {
      feedbacks.value = []
      currentPage.value = 1
    }

    await noticeStore.fetchFeedbacks(
      route?.params?.id, // প্রথম প্যারামিটার: noticeId
      {
        params: {
          page: currentPage.value,
          per_page: perPage,
          search: searchQuery.value,
        },
      },
    )
  } catch (error) {
    console.error('Error fetching feedbacks:', error)
  } finally {
    isLoading.value = false
  }
}

const canLoadMore = computed(() => {
  return feedbacks.value.length < totalFeedbacks.value
})

const loadMore = () => {
  if (canLoadMore.value) {
    currentPage.value++
    fetchFeedbacks()
  }
}

// Debounced Fetch
const debouncedFetchFeedbacks = debounce(() => {
  fetchFeedbacks(true)
}, 400)

watch(searchQuery, () => {
  debouncedFetchFeedbacks()
})

onMounted(() => {
  fetchFeedbacks()
})

const exportToExcel = async () => {
  await noticeStore.downloadFeedbackUserExcel(
    route?.params?.id, // প্রথম প্যারামিটার: noticeId
    {
      page: currentPage.value,
      per_page: perPage,
      search: searchQuery.value,
    },
  )
}
</script>

<template>
  <div class="space-y-6">
    <!-- Search Input -->
    <div class="flex flex-col sm:flex-row justify-center items-center gap-4 mb-4">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search by User Name..."
        class="border border-gray-300 rounded-lg p-2 w-full max-w-md focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <button
        @click="exportToExcel"
        class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
      >
        Export to Excel
      </button>
    </div>

    <!-- Feedback List -->
    <div class="bg-white max-w-6xl mx-auto rounded-lg shadow-md p-6 space-y-4">
      <h3 class="title-md text-center mb-4">Employee Feedbacks</h3>

      <div v-if="isLoading" class="text-center text-gray-500">Loading...</div>

      <div v-else>
        <div v-if="feedbacks.length">
          <div class="overflow-x-auto bg-white rounded-xl shadow-md">
            <table class="min-w-full text-sm text-left text-gray-700">
              <thead class="bg-gray-100 text-gray-900 sticky top-0 z-10">
                <tr>
                  <th class="px-6 py-3">#</th>
                  <th class="px-6 py-3">User</th>
                  <th class="px-6 py-3">Company</th>
                  <th class="px-6 py-3">Department</th>
                  <th class="px-6 py-3">Feedback</th>
                  <th class="px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr
                  v-for="(user, index) in feedbacks"
                  :key="user.id"
                  class="hover:bg-blue-50 transition"
                >
                  <td class="px-6 py-4 whitespace-nowrap font-medium">{{ user?.id }}</td>
                  <td class="px-6 py-4 whitespace-nowrap">{{ user?.name }}</td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    {{ user?.company?.name || 'N/A' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    {{ user?.department?.name || 'N/A' }}
                  </td>
                  <td class="px-6 py-4">{{ user?.feedback?.feedback }}</td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div v-if="user?.feedback">
                      {{ new Date(user?.feedback?.submitted_at).toLocaleDateString() }}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div v-else class="text-center text-gray-400 italic">No feedbacks found.</div>

        <!-- Load More Button -->
        <div v-if="canLoadMore && !isLoading" class="flex justify-center mt-6">
          <button
            @click="loadMore"
            class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            Load More
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
