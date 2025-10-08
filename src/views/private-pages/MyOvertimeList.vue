<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import DisplayFormattedWorkingHours from '@/components/overtime/DisplayFormattedWorkingHours.vue'
import { useAuthStore } from '@/stores/auth'
import { useOvertimeStore } from '@/stores/overtime'
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const overtimeStore = useOvertimeStore()
const authStore = useAuthStore()

onMounted(() => {
  fetchOvertimeListData()
})

const goBack = () => {
  router.go(-1)
}

const myOvertimes = computed(() => overtimeStore.overtimes || [])

/* ---------- fetch ---------- */
watch(
  () => overtimeStore.selectedMonth,
  (newMonth) => {
    if (newMonth) fetchOvertimeListData(newMonth)
  },
)

const fetchOvertimeListData = async (selectedMonth = null) => {
  overtimeStore.fetchUserOvertimes({ month: selectedMonth || overtimeStore.selectedMonth })
}

function deleteApplication(applicationId) {
  const confirmed = confirm('Are you sure you want to delete this application?')
  if (confirmed) {
    overtimeStore.deleteOvertime(applicationId)
  }
}

/* ---------- helpers: normalize to minutes ---------- */
const toMinutes = (val) => {
  if (val == null || val === '') return 0

  if (typeof val === 'number') {
    // Heuristic:
    //  - >= 100 => already minutes (likely)
    //  - else   => treat as hours (float)
    return val >= 100 ? Math.round(val) : Math.round(val * 60)
  }

  if (typeof val === 'string') {
    const s = val.trim()
      .replace(/\+/g, ' ')       // tolerate query-encoded plus
      .replace(/\s+/g, ' ')

    // 1) "14h 14m" / "14h" / "14m"
    const h = s.match(/(\d+)\s*h/i)
    const m = s.match(/(\d+)\s*m/i)
    if (h || m) {
      const hh = h ? parseInt(h[1], 10) : 0
      const mm = m ? parseInt(m[1], 10) : 0
      return hh * 60 + mm
    }

    // 2) "14:14"
    if (/^\d{1,2}:\d{1,2}$/.test(s)) {
      const [hh, mm] = s.split(':').map((x) => parseInt(x, 10))
      if (Number.isFinite(hh) && Number.isFinite(mm)) return hh * 60 + mm
    }

    // 3) "14.25"
    const num = Number(s)
    if (Number.isFinite(num)) {
      return num >= 100 ? Math.round(num) : Math.round(num * 60)
    }
  }

  return 0
}

/* ---------- totals ---------- */
const totalRequestedMinutes = computed(() => {
  const list = overtimeStore.overtimes || []
  return list.reduce((sum, o) => sum + (Number(o?.request_overtime_hours) || 0), 0)
})

const totalApprovedMinutes = computed(() => {
  const list = overtimeStore.overtimes || []
  return list.reduce((sum, o) => sum + (Number(o?.approval_overtime_hours) || 0), 0)
})

const statusSummary = computed(() => {
  const out = { pending: 0, approved: 0, rejected: 0, other: 0, total: myOvertimes.value.length }
  for (const ot of myOvertimes.value) {
    const s = String(ot.status || 'Pending').toLowerCase()
    if (s === 'approved') out.approved++
    else if (s === 'rejected') out.rejected++
    else if (s === 'pending' || s === 'applied') out.pending++
    else out.other++
  }
  return out
})
</script>

<template>
  <div class="space-y-2 px-4">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <button class="btn-3 py-1" @click="goBack">
          <i class="far fa-arrow-left"></i>
          <span class="hidden md:flex">Back</span>
        </button>

        <div>
          <button @click="fetchOvertimeListData" type="button" class="btn-3 space-x-1 py-1">
            <i class="fas fa-sync text-lg" :class="{ 'animate-spin': overtimeStore.loading }"></i>
            <span class="hidden md:inline"> Reload </span>
          </button>
        </div>

        <RouterLink :to="{ name: 'MyOvertimeAdd' }" class="btn-2">
          <i class="far fa-plus"></i>
          <span class="hidden md:flex">Overtime</span>
        </RouterLink>
      </div>

      <h1 class="title-md md:title-lg flex-wrap text-center">
        Overtime of {{ overtimeStore.selectedMonthDisplay }}
      </h1>

      <div class="flex gap-4">
        <div>
          <input id="monthSelect" type="month" v-model="overtimeStore.selectedMonth" class="input-1" />
        </div>
      </div>
    </div>

    <!-- summary strip -->
    <div class="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs md:text-sm">
      <div class="rounded-md border bg-white p-2">
        <div class="text-slate-500">Applications</div>
        <div class="font-semibold">{{ statusSummary.total }}</div>
      </div>
      <div class="rounded-md border bg-white p-2">
        <div class="text-slate-500">Requested</div>
        <div class="font-semibold">
          <DisplayFormattedWorkingHours :workingHours="totalRequestedMinutes" />
        </div>
      </div>
      <div class="rounded-md border bg-white p-2">
        <div class="text-slate-500">Approved</div>
        <div class="font-semibold">
          <DisplayFormattedWorkingHours :workingHours="totalApprovedMinutes" />
        </div>
      </div>
      <div class="rounded-md border bg-white p-2">
        <div class="text-slate-500">Pending</div>
        <div class="font-semibold">{{ statusSummary.pending }}</div>
      </div>
      <div class="rounded-md border bg-white p-2">
        <div class="text-slate-500">Approved / Rejected</div>
        <div class="font-semibold">{{ statusSummary.approved }} / {{ statusSummary.rejected }}</div>
      </div>
    </div>

    <div v-if="overtimeStore?.loading" class="text-center py-4">
      <LoaderView />
    </div>

    <div v-else class="space-y-4">
      <div class="overflow-x-auto">
        <table class="min-w-full table-auto border-collapse border border-gray-200 bg-white rounded-md text-sm">
          <thead>
            <tr class="bg-gray-200 *:py-1">
              <th class="border border-gray-300 px-2 text-center">#</th>
              <th class="border border-gray-300 px-2 text-center">Date</th>
              <th class="border border-gray-300 px-2 text-center">Type</th>
              <th class="border border-gray-300 px-2 text-center">Shift</th>
              <th class="border border-gray-300 px-2 text-center">Check-In</th>
              <th class="border border-gray-300 px-2 text-center">Check-Out</th>
              <th class="border border-gray-300 px-2 text-center">Working (hour)</th>
              <th class="border border-gray-300 px-2 text-center">Request (hour)</th>
              <th class="border border-gray-300 px-2 text-center">Approved (hour)</th>
              <th class="border border-gray-300 px-2 text-center">Status</th>
              <th class="border border-gray-300 px-2 text-center">Details</th>
              <th class="border border-gray-300 px-2 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="(overtime, index) in myOvertimes"
              :key="overtime?.id"
              class="border-b border-gray-200 hover:bg-blue-200 *:py-2"
            >
              <td class="border border-gray-300 px-2 text-center">{{ index + 1 }}</td>
              <td class="border border-gray-300 px-2 text-center">
                {{
                  new Date(overtime.date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })
                }}
              </td>
              <td class="border border-gray-300 px-2 text-center">
                {{ overtime.duty_type }}
              </td>
              <td class="border border-gray-300 px-2 text-center">
                {{ overtime.shift }}
              </td>
              <td class="border border-gray-300 px-2 text-center">
                {{ overtime.check_in || '- : -' }}
              </td>
              <td class="border border-gray-300 px-2 text-center">
                {{ overtime.check_out || '- : -' }}
              </td>
              <td class="border border-gray-300 px-2 text-center">
                <DisplayFormattedWorkingHours :workingHours="overtime.working_hours" />
              </td>
              <td class="border border-gray-300 px-2 text-center">
                <DisplayFormattedWorkingHours :workingHours="overtime.request_overtime_hours" />
              </td>
              <td class="border border-gray-300 px-2 text-center">
                <DisplayFormattedWorkingHours :workingHours="overtime.approval_overtime_hours" />
              </td>
              <td class="border border-gray-300 px-2 text-center">
                {{ overtime.status || 'Pending' }}
              </td>
              <td class="border border-gray-300 px-2 text-center">
                {{ overtime.work_details }}
              </td>
              <td class="border border-gray-300 px-2 text-center">
                <div class="flex items-center justify-center gap-2">
                  <RouterLink
                    :to="{ name: 'MyOvertimeShow', params: { id: overtime.id } }"
                    class="btn-1 px-3"
                  >
                    <i class="far fa-eye"></i>
                  </RouterLink>

                  <button
                    type="button"
                    @click="deleteApplication(overtime?.id)"
                    class="btn-icon"
                    v-if="overtime.status == 'Pending' || !overtime.status"
                  >
                    <i class="far fa-trash text-red-600"></i>
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="myOvertimes.length === 0">
              <td :colspan="12" class="p-2 text-center text-red-500">No overtimes found</td>
            </tr>
          </tbody>

          <!-- ======= SUMMARY FOOTER ======= -->
          <tfoot v-if="myOvertimes.length" class="bg-gray-50">
            <tr class="*:py-2 font-semibold">
              <td class="border border-gray-300 px-2 text-right" colspan="7">Totals</td>

              <!-- Requested total -->
              <td class="border border-gray-300 px-2 text-center">
                <DisplayFormattedWorkingHours :workingHours="totalRequestedMinutes" />
              </td>

              <!-- Approved total -->
              <td class="border border-gray-300 px-2 text-center">
                <DisplayFormattedWorkingHours :workingHours="totalApprovedMinutes" />
              </td>

              <td class="border border-gray-300 px-2 text-center">—</td>
              <td class="border border-gray-300 px-2 text-center">—</td>
              <td class="border border-gray-300 px-2 text-center">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</template>
