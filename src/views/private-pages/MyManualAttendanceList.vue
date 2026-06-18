<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import { useManualAttendanceStore } from '@/stores/manual-attendance'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const manualAttendanceStore = useManualAttendanceStore()

const now = new Date()
const selectedYear = ref(String(now.getFullYear()))

const years = computed(() => {
  const cur = now.getFullYear()
  const list = []
  for (let y = cur + 1; y >= cur - 5; y--) list.push(String(y))
  return list
})

const fetchData = (year) => manualAttendanceStore.fetchUserManualAttendances({ year })

watch(selectedYear, (y) => { if (y) fetchData(y) }, { immediate: true })

const goBack = () => router.go(-1)

const list = computed(() => manualAttendanceStore.manualAttendances || [])

const summary = computed(() => {
  const out = { total: list.value.length, pending: 0, approved: 0, rejected: 0 }
  for (const r of list.value) {
    const s = (r.status || '').toLowerCase()
    if (s === 'approved') out.approved++
    else if (s === 'rejected') out.rejected++
    else out.pending++
  }
  return out
})

const formatDate = (v) => {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatTime = (v) => {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d) ? v : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const punchLabel = (r) => {
  const pt = r.punch_type
  const ot = r.offsite_type || r.offside_type
  if (pt === 'entry') return 'Entry'
  if (pt === 'exit') return 'Exit'
  if (pt === 'both') return 'Both'
  if (ot === 'pre') return 'Pre-office'
  if (ot === 'post') return 'Post-office'
  if (ot === 'both') return 'Both'
  return pt || ot || '—'
}

const typeIcon = (r) => {
  const t = (r.type || '').toLowerCase()
  if (t.includes('offsite') || t.includes('offside') || r.offsite_type || r.offside_type)
    return { icon: 'fas fa-map-marker-alt', color: 'text-violet-500', label: 'Offsite' }
  return { icon: 'fas fa-building', color: 'text-blue-500', label: 'In-office' }
}

const parseDateValue = (v) => {
  if (!v) return null
  const d = new Date(String(v).replace(' ', 'T'))
  return Number.isNaN(d.getTime()) ? null : d
}

const displayDate = (v) => {
  const d = parseDateValue(v)
  if (!d) return '-'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const attendanceDate = (r) => r?.check_in || r?.check_out

const displayTime = (v) => {
  const d = parseDateValue(v)
  if (!d) return null
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const displayPunch = (r) => {
  const pt = r?.punch_type
  const ot = r?.offsite_type
  if (pt === 'entry') return 'Entry'
  if (pt === 'exit') return 'Exit'
  if (pt === 'both') return 'Both'
  if (ot === 'pre') return 'Pre'
  if (ot === 'post') return 'Post'
  if (ot === 'both') return 'Both'
  return pt || ot || '-'
}

const kindMeta = (r) => {
  const type = r?.type || ''
  if (type === 'Forget Punch') {
    return { icon: 'fas fa-fingerprint', label: 'Forget Punch', class: 'bg-amber-50 text-amber-700 ring-amber-100' }
  }
  if (type === 'Offsite Work') {
    return { icon: 'fas fa-map-marker-alt', label: 'Offsite Work', class: 'bg-violet-50 text-violet-700 ring-violet-100' }
  }
  if (type === 'Home Office') {
    return { icon: 'fas fa-home', label: 'Home Office', class: 'bg-blue-50 text-blue-700 ring-blue-100' }
  }
  if (type === 'Remote Work') {
    return { icon: 'fas fa-laptop-house', label: 'Remote Work', class: 'bg-sky-50 text-sky-700 ring-sky-100' }
  }

  return { icon: 'fas fa-user-clock', label: type || '-', class: 'bg-gray-50 text-gray-700 ring-gray-100' }
}

const rowAccent = (status) => {
  const s = (status || '').toLowerCase()
  if (s === 'approved') return 'border-l-[3px] border-l-emerald-400'
  if (s === 'rejected') return 'border-l-[3px] border-l-red-400'
  return 'border-l-[3px] border-l-amber-400'
}

const badgeClass = (status) => {
  const s = (status || '').toLowerCase()
  if (['approved', 'accepted'].includes(s)) return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (['rejected', 'declined', 'cancelled'].includes(s)) return 'bg-red-50 text-red-700 ring-red-200'
  return 'bg-amber-50 text-amber-800 ring-amber-200'
}

const canDelete = (r) => !r.status || r.status === 'Pending'

function deleteApplication(id) {
  if (confirm('Delete this manual attendance request?')) {
    manualAttendanceStore.deleteManualAttendance(id)
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/40">

    <!-- ── Sticky toolbar ── -->
    <div class="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">

      <!-- Top row -->
      <div class="flex items-center gap-2 px-4 py-2">
        <button class="btn-3 py-1 text-xs" @click="goBack">
          <i class="far fa-arrow-left text-[11px]"></i>
          <span class="hidden sm:inline">Back</span>
        </button>

        <button
          type="button"
          class="btn-3 py-1 text-xs"
          title="Reload"
          @click="fetchData(selectedYear)"
        >
          <i class="fas fa-sync text-[11px]" :class="{ 'animate-spin': manualAttendanceStore.loading }"></i>
        </button>

        <h1 class="flex-1 text-center text-sm font-bold text-gray-900 tracking-tight">
          Manual Attendance Requests
        </h1>

        <!-- Year selector -->
        <select
          v-model="selectedYear"
          class="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>

        <RouterLink :to="{ name: 'ManualAttendanceAdd' }" class="btn-2 py-1 text-xs">
          <i class="far fa-plus text-[11px]"></i>
          <span class="hidden sm:inline">Request</span>
        </RouterLink>
      </div>

      <!-- Stats pill bar -->
      <div class="flex items-center gap-x-3 flex-wrap px-4 pb-2 text-[11px]">
        <span class="font-medium text-gray-500">{{ selectedYear }}</span>
        <span class="text-gray-300">|</span>

        <span class="flex items-center gap-1 text-gray-700">
          <i class="fas fa-layer-group text-[9px] text-gray-400"></i>
          <b>{{ summary.total }}</b> total
        </span>

        <span v-if="summary.pending" class="flex items-center gap-1 text-amber-700">
          <i class="fas fa-hourglass-half text-[9px]"></i>
          <b>{{ summary.pending }}</b> pending
        </span>

        <span v-if="summary.approved" class="flex items-center gap-1 text-emerald-700">
          <i class="fas fa-check-circle text-[9px]"></i>
          <b>{{ summary.approved }}</b> approved
        </span>

        <span v-if="summary.rejected" class="flex items-center gap-1 text-red-600">
          <i class="fas fa-times-circle text-[9px]"></i>
          <b>{{ summary.rejected }}</b> rejected
        </span>
      </div>
    </div>

    <!-- ── Content ── -->
    <div class="px-4 py-3">

      <LoaderView v-if="manualAttendanceStore.loading" class="py-16" />

      <div v-else class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">

        <!-- Table -->
        <div v-if="list.length" class="overflow-x-auto">
          <table class="min-w-[760px] w-full text-sm">

            <thead>
              <tr class="bg-gray-50 border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-500">
                <th class="w-8 px-3 py-2.5 text-center">#</th>
                <th class="px-3 py-2.5 text-left min-w-[120px]">Created Date</th>
                <th class="px-3 py-2.5 text-left min-w-[120px]">Attendance Date</th>
                <th class="px-3 py-2.5 text-center min-w-[120px]">Kind</th>
                <th class="px-3 py-2.5 text-center w-24">Punch</th>
                <th class="px-3 py-2.5 text-center min-w-[140px]">Check-In → Out</th>
                <th class="px-3 py-2.5 text-center w-24">Status</th>
                <th class="px-3 py-2.5 text-center w-16">Act.</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="(rec, index) in list"
                :key="rec?.id"
                class="group hover:bg-gray-50/70 transition-colors"
                :class="rowAccent(rec?.status)"
              >
                <!-- # -->
                <td class="px-3 py-2.5 text-center text-xs font-medium text-gray-400">
                  {{ index + 1 }}
                </td>

                <!-- Created Date -->
                <td class="px-3 py-2.5">
                  <div class="text-xs font-semibold text-gray-900 whitespace-nowrap">
                    {{ displayDate(rec?.created_at) }}
                  </div>
                  <div v-if="rec?.reason" class="mt-0.5 text-[10px] text-gray-400 truncate max-w-[150px]" :title="rec.reason">
                    {{ rec.reason }}
                  </div>
                </td>

                <!-- Attendance Date -->
                <td class="px-3 py-2.5">
                  <div class="text-xs font-semibold text-gray-900 whitespace-nowrap">
                    {{ displayDate(attendanceDate(rec)) }}
                  </div>
                </td>

                <!-- Kind (offsite vs in-office) -->
                <td class="px-3 py-2.5 text-center">
                  <span
                    class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset"
                    :class="kindMeta(rec).class"
                    :title="kindMeta(rec).label"
                  >
                    <i :class="[kindMeta(rec).icon, 'text-[9px]']"></i>
                    {{ kindMeta(rec).label }}
                  </span>
                </td>

                <!-- Punch type -->
                <td class="px-3 py-2.5 text-center">
                  <span class="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                    {{ displayPunch(rec) }}
                  </span>
                </td>

                <!-- Check-In → Check-Out -->
                <td class="px-3 py-2.5 text-center">
                  <div class="text-[11px] text-gray-700 whitespace-nowrap tabular-nums">
                    <template v-if="displayTime(rec?.check_in) || displayTime(rec?.check_out)">
                      <span class="font-medium">{{ displayTime(rec?.check_in) || '—' }}</span>
                      <span class="text-gray-300 mx-0.5">→</span>
                      <span class="font-medium">{{ displayTime(rec?.check_out) || '—' }}</span>
                    </template>
                    <span v-else class="text-gray-300">—</span>
                  </div>
                </td>

                <!-- Status -->
                <td class="px-3 py-2.5 text-center">
                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset whitespace-nowrap"
                    :class="badgeClass(rec?.status)"
                  >
                    {{ rec?.status || 'Pending' }}
                  </span>
                </td>

                <!-- Actions -->
                <td class="px-3 py-2.5">
                  <div class="flex items-center justify-center gap-1">
                    <RouterLink
                      :to="{ name: 'ManualAttendanceShow', params: { id: rec?.id } }"
                      class="inline-flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                      title="View"
                    >
                      <i class="far fa-eye text-[10px]"></i>
                    </RouterLink>
                    <button
                      v-if="canDelete(rec)"
                      type="button"
                      class="inline-flex h-6 w-6 items-center justify-center rounded-md border border-red-100 text-red-400 hover:border-red-300 hover:text-red-600 transition-colors"
                      title="Delete"
                      @click="deleteApplication(rec?.id)"
                    >
                      <i class="far fa-trash text-[10px]"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>

          </table>
        </div>

        <!-- Empty state -->
        <div v-else class="flex flex-col items-center justify-center py-16 text-center">
          <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <i class="fas fa-user-clock text-xl text-gray-300"></i>
          </div>
          <p class="font-semibold text-gray-700 text-sm">No requests for {{ selectedYear }}</p>
          <p class="mt-1 text-xs text-gray-400">Submit a request if your attendance was missed</p>
          <RouterLink :to="{ name: 'ManualAttendanceAdd' }" class="btn-2 mt-4 py-1.5 text-xs">
            <i class="far fa-plus text-[11px]"></i> New Request
          </RouterLink>
        </div>

      </div>
    </div>

  </div>
</template>

