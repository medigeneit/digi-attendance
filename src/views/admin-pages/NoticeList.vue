<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useNoticeStore } from '@/stores/notice'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const noticeStore = useNoticeStore()

const { notices } = storeToRefs(noticeStore)

onMounted(() => {
  noticeStore.fetchNotices()
})

const goBack = () => {
  router.go(-1)
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

const groupedNotice = computed(() => {
  const grouped = {}
  notices.value.forEach((notice) => {
    const companyName = notice.company?.name || 'Unknown Company'
    if (!grouped[companyName]) {
      grouped[companyName] = []
    }
    grouped[companyName].push(notice)
  })
  return grouped
})
</script>

<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>

      <h1 class="title-md md:title-lg flex-wrap text-center">Notice List</h1>

      <RouterLink :to="{ name: 'NoticeAdd' }" class="btn-2">
        <span class="hidden md:flex">Add New</span>
        <i class="far fa-plus"></i>
      </RouterLink>
    </div>
    <div v-if="noticeStore.isLoading" class="text-center py-4">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <div v-for="(notices, companyName) in groupedNotice" :key="companyName">
        <h2 class="title-md">{{ companyName }}</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full table-auto bg-white shadow-md rounded-lg overflow-hidden">
            <thead>
              <tr class="bg-gray-200">
                <th class="border border-gray-300 px-2 text-left">#</th>
                <th class="border border-gray-300 px-2 text-left">Title</th>
                <th class="border border-gray-300 px-2 text-left">Type</th>
                <th class="border border-gray-300 px-2 text-left">Company</th>
                <th class="border border-gray-300 px-2 text-left">Department</th>
                <th class="border border-gray-300 px-2 text-left">Published Date</th>
                <th class="border border-gray-300 px-2 text-left">Expired Date</th>
                <th class="border border-gray-300 px-2 text-left">Show Employee</th>
                <th class="border border-gray-300 px-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(notice, index) in notices"
                :key="notice.id"
                class="border-b border-gray-200 hover:bg-gray-100"
              >
                <td class="border border-gray-300 px-2">{{ index + 1 }}</td>
                <td class="border border-gray-300 px-2">{{ notice?.title }}</td>
                <td class="border border-gray-300 px-2">
                  {{ notice?.type === 1 ? 'General Notice' : 'Policy' }}
                </td>
                <td class="border border-gray-300 px-2">{{ notice?.company?.name }}</td>
                <td class="border border-gray-300 px-2">
                  <span v-for="(department, index) in notice?.departments" :key="department.id">
                    {{ department?.name }}
                    {{ index < notice?.departments.length - 1 ? ', ' : '' }}
                  </span>
                </td>
                <td class="border border-gray-300 px-2">{{ formatDate(notice?.published_at) }}</td>
                <td class="border border-gray-300 px-2">
                  {{ formatDate(notice?.expired_at) || 'নেই' }}
                </td>
                <td class="border border-gray-300 px-2 text-center">
                  {{ notice?.user_feedback_count }}
                </td>
                <td class="border border-gray-300 px-2">
                  <div class="flex gap-2">
                    <RouterLink
                      :to="{ name: 'NoticeShow', params: { id: notice.id } }"
                      class="btn-icon"
                    >
                      <i class="far fa-eye"></i>
                    </RouterLink>
                    <RouterLink
                      :to="{ name: 'NoticeEdit', params: { id: notice.id } }"
                      class="btn-icon"
                    >
                      <i class="far fa-edit"></i>
                    </RouterLink>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
