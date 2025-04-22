<template>
  <div class="space-y-4">
    <h2 class="text-xl font-semibold">Scheduled Meetings</h2>

    <div v-for="(group, label) in groupedMeetings" :key="label" class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-gray-700">{{ label }}</h3>
        <span class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded" v-if="label === 'Today'"
          >Today</span
        >
      </div>

      <div class="space-y-3">
        <div
          v-for="(meeting, index) in group"
          :key="index"
          class="rounded-lg border bg-white p-4 shadow hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-start justify-between">
            <div>
              <h4 class="font-medium text-gray-800">{{ meeting.title }}</h4>
              <p class="text-sm text-gray-500">{{ meeting.time }}</p>
              <p class="text-sm text-gray-500">{{ meeting.location }}</p>
              <div class="flex items-center gap-1 mt-2">
                <div class="flex -space-x-2">
                  <div
                    v-for="(participant, pIndex) in meeting.participants.slice(0, 3)"
                    :key="pIndex"
                    class="w-6 h-6 rounded-full bg-gray-200 text-[10px] font-bold flex items-center justify-center text-gray-700 border"
                  >
                    {{ getInitials(participant) }}
                  </div>
                </div>
                <span v-if="meeting.participants.length > 3" class="text-xs text-gray-500 ml-2">
                  +{{ meeting.participants.length - 3 }} more
                </span>
              </div>
            </div>
            <div class="flex flex-col gap-2 text-sm">
              <button class="px-3 py-1 border rounded hover:bg-gray-100">Join</button>
              <button class="text-blue-600 hover:underline">Details</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const meetings = [
  {
    title: 'Daily Standup',
    time: '9:00 AM - 9:30 AM',
    participants: ['John Doe', 'Sarah Johnson', 'Mike Chen', 'Emily Taylor', 'Alex Wong'],
    location: 'Zoom Meeting',
    day: 'Today',
  },
  {
    title: 'E-commerce Sprint Planning',
    time: '2:00 PM - 3:30 PM',
    participants: ['John Doe', 'Sarah Johnson', 'Mike Chen'],
    location: 'Conference Room A',
    day: 'Today',
  },
  {
    title: 'Design Review',
    time: '11:00 AM - 12:00 PM',
    participants: ['Emily Taylor', 'Mike Chen', 'Alex Wong'],
    location: 'Design Lab',
    day: 'Tomorrow',
  },
  {
    title: 'Bug Triage Meeting',
    time: '3:00 PM - 4:00 PM',
    participants: ['John Doe', 'Sarah Johnson', 'Mike Chen'],
    location: 'Conference Room B',
    day: 'Tomorrow',
  },
]

const getInitials = (name) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

const groupedMeetings = meetings.reduce((acc, cur) => {
  if (!acc[cur.day]) acc[cur.day] = []
  acc[cur.day].push(cur)
  return acc
}, {})
</script>

<style scoped></style>
