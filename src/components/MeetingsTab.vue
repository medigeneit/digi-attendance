<template>
  <div class="space-y-4">
    <h2 class="text-xl font-semibold">Scheduled Meetings</h2>
    <div class="space-y-2">
      <div class="space-y-3">
        <div
          v-for="(meeting, index) in formattedMeetings"
          :key="index"
          class="rounded-lg border bg-white p-4 shadow hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-start justify-between">
            <div>
              <h4 class="font-medium text-gray-800">{{ meeting?.title }}</h4>
              <p class="text-sm text-gray-500">{{ meeting.start_time }} - {{ meeting.end_time }}</p>
              <div class="flex items-center gap-1 mt-2">
                <div class="flex -space-x-2">
                  <div
                    v-for="(participant, pIndex) in meeting.users.slice(0, 2)"
                    :key="pIndex"
                    class="w-6 h-6 rounded-full bg-gray-200 text-[10px] font-bold flex items-center justify-center text-gray-700 border"
                  >
                    {{ getInitials(participant) }}
                  </div>
                </div>
                <span v-if="meeting.users.length > 2" class="text-xs text-gray-500 ml-2">
                  +{{ meeting.users.length - 2 }} more
                </span>
              </div>
            </div>
            <div class="flex flex-col gap-2 text-sm">
              {{ meeting?.day }}
              <button class="text-blue-600 hover:underline">Details</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useMeetingStore } from '@/stores/useMeetingStore'
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'

const meetingStore = useMeetingStore()
const { meetings } = storeToRefs(meetingStore)

onMounted(() => {
  meetingStore.fetchMeetings()
})

const getInitials = (name) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

const formattedMeetings = computed(() => {
  return meetings.value.map((meeting) => {
    const start = new Date(meeting.start_time)
    const end = new Date(meeting.end_time)

    const formatTime = (date) =>
      date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })

    const formatDay = (date) => {
      const today = new Date()
      const meetingDate = new Date(date)
      const isToday = meetingDate.toDateString() === today.toDateString()

      const tomorrow = new Date()
      tomorrow.setDate(today.getDate() + 1)
      const isTomorrow = meetingDate.toDateString() === tomorrow.toDateString()

      if (isToday) return 'Today'
      if (isTomorrow) return 'Tomorrow'

      return meetingDate.toLocaleDateString()
    }

    return {
      title: meeting.title,
      start_time: formatTime(start),
      end_time: formatTime(end),
      users: meeting.users.map((u) => u.name),
      day: formatDay(meeting.start_time),
    }
  })
})
</script>
