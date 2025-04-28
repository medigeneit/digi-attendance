<script setup>
import { useNoticeStore } from '@/stores/notice'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
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
    console.log('sdf')

    await noticeStore.fetchFeedbacks(
      props.noticeId, // প্রথম প্যারামিটার: noticeId
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
</script>

<template>
  <div class="space-y-6">
    <!-- Search Input -->
    <div class="flex justify-center">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search by User Name..."
        class="border border-gray-300 rounded-lg p-2 w-full max-w-md focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>

    <!-- Feedback List -->
    <div class="bg-white rounded-lg shadow-md p-6 space-y-4">
      <h3 class="title-md text-center mb-4">User Feedbacks</h3>

      <div v-if="isLoading" class="text-center text-gray-500">Loading...</div>

      <div v-else>
        <div v-if="feedbacks.length" class="divide-y">
          <div v-for="feedback in feedbacks" :key="feedback.id" class="py-4 flex items-start gap-4">
            <div class="flex-shrink-0">
              <div
                class="h-10 w-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold"
              >
                {{ feedback.user.name.charAt(0) }}
              </div>
            </div>
            <div class="flex-1">
              <p class="text-gray-800 font-semibold">
                {{ feedback.user.name }} ({{ feedback?.user?.department?.name }})
              </p>
              <p class="text-gray-600 text-sm mt-1">{{ feedback.feedback }}</p>
            </div>
            <div class="text-gray-400 text-xs">
              {{ new Date(feedback.created_at).toLocaleDateString() }}
            </div>
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
