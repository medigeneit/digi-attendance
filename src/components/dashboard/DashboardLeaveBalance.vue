<script setup>
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'

const userStore = useUserStore()
const { userDashboard } = storeToRefs(userStore)

const selectedYear = ref('all')
const currentYear = new Date().getFullYear()

const leaveBalanceRaw = computed(() => userDashboard.value?.leave_balance ?? [])

const isYearValue = (val) => Number.isInteger(val) && val >= 1990 && val <= currentYear + 1

const yearFromItem = (item) => {
  if (!item || typeof item !== 'object') return null
  const candidates = [item.year, item.leave_year, item.leaveYear]
  for (const c of candidates) {
    const y = Number(c)
    if (isYearValue(y)) return y
  }
  return null
}

const groupItemsFrom = (item) => {
  if (!item || typeof item !== 'object') return null
  return item.balances || item.items || item.leave_balance || null
}

const availableYears = computed(() => {
  const raw = leaveBalanceRaw.value
  const years = new Set()
  if (Array.isArray(raw)) {
    raw.forEach((item) => {
      const y = yearFromItem(item)
      if (y) years.add(y)
      const groupItems = groupItemsFrom(item)
      if (Array.isArray(groupItems)) {
        if (y) years.add(y)
        groupItems.forEach((child) => {
          const childYear = yearFromItem(child)
          if (childYear) years.add(childYear)
        })
      }
    })
  } else if (raw && typeof raw === 'object') {
    Object.keys(raw).forEach((key) => {
      const y = Number(key)
      if (isYearValue(y)) years.add(y)
    })
  }
  return Array.from(years).sort((a, b) => b - a)
})

const flattenLeaveBalances = (raw) => {
  if (Array.isArray(raw)) {
    if (raw.some((g) => Array.isArray(groupItemsFrom(g)))) {
      return raw.flatMap((g) => groupItemsFrom(g) || [])
    }
    return raw
  }
  if (raw && typeof raw === 'object') {
    return Object.values(raw).flatMap((arr) => (Array.isArray(arr) ? arr : []))
  }
  return []
}

const filteredLeaveBalances = computed(() => {
  const raw = leaveBalanceRaw.value
  const selected = selectedYear.value

  if (!raw) return []
  if (selected === 'all') return flattenLeaveBalances(raw)

  const selectedNum = Number(selected)
  if (!isYearValue(selectedNum)) return flattenLeaveBalances(raw)

  if (Array.isArray(raw)) {
    const grouped = raw.find(
      (g) => yearFromItem(g) === selectedNum && Array.isArray(groupItemsFrom(g)),
    )
    if (grouped) return groupItemsFrom(grouped) || []
    return raw.filter((item) => yearFromItem(item) === selectedNum)
  }

  if (typeof raw === 'object') {
    const match = raw[String(selectedNum)]
    return Array.isArray(match) ? match : []
  }

  return []
})
</script>
<template>
  <div class="bg-white shadow-md rounded-lg">
    <div class="flex flex-wrap items-center justify-between gap-2 py-2 px-4">
      <h2 class="text-xl font-semibold">Leave Balance</h2>
      <div v-if="availableYears.length" class="flex items-center gap-2">
        <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Year</span>
        <select
          v-model="selectedYear"
          class="input-1 py-1 px-2 rounded text-xs font-semibold uppercase tracking-wide
                 text-slate-500 border-slate-200 bg-slate-50"
        >
          <option value="all">All</option>
          <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
        </select>
      </div>
    </div>

    <div class="overflow-x-auto shadow-md min-h-max">
      <table class="min-w-full text-sm text-left text-gray-500 table-fixed">
        <thead>
          <tr class="text-xs">
            <th class="px-2 py-1 font-semibold text-gray-900 border bg-gray-50"></th>
            <th
              class="px-4 text-center py-1 font-semibold text-gray-900 border bg-gray-50 w-40"
              v-for="leave_balance in filteredLeaveBalances"
              :key="leave_balance.id || leave_balance.name || leave_balance.leave_type"
            >
              {{ leave_balance.name }}
            </th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td class="px-4 py-4 font-medium text-gray-900 border text-xs">Total</td>
            <td
              class="px-4 text-center py-3 font-medium text-gray-900 border"
              v-for="leave_balance in filteredLeaveBalances"
              :key="leave_balance.id || leave_balance.name || leave_balance.leave_type"
            >
              {{ leave_balance.annual_quota }}
            </td>
          </tr>

          <tr>
            <td class="px-4 py-3 font-medium text-gray-900 border text-xs">Used</td>
            <td
              class="px-4 text-center py-4 font-medium text-gray-900 border"
              v-for="leave_balance in filteredLeaveBalances"
              :key="leave_balance.id || leave_balance.name || leave_balance.leave_type"
            >
              {{ leave_balance.used_days }}
            </td>
          </tr>

          <tr class="text-sm font-semibold text-blue-800">
            <td class="px-4 py-3 border text-xs">Balance</td>
            <td
              class="px-4 text-center py-4 border"
              v-for="leave_balance in filteredLeaveBalances"
              :key="leave_balance.id || leave_balance.name || leave_balance.leave_type"
            >
              {{ leave_balance.remaining_days }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- <div class="overflow-x-auto shadow-md sm:rounded-lg min-h-max">
      <table class="min-w-full text-sm text-left text-gray-500">
        <thead class="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3">Type</th>
            <th scope="col" class="px-6 py-3">Total Days</th>
            <th scope="col" class="px-6 py-3">Used Days</th>
            <th scope="col" class="px-6 py-3">Remaining Days</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="leave_balance in userDashboard?.leave_balance"
            :key="leave_balance.id"
            class="border-b hover:bg-gray-100"
          >
            <td class="px-6 py-4 font-medium text-gray-900">
              {{ leave_balance.leave_type }}
            </td>
            <td class="px-6 py-4">{{ leave_balance.annual_quota }}</td>
            <td class="px-6 py-4">{{ leave_balance.used_days }}</td>
            <td class="px-6 py-4">{{ leave_balance.remaining_days }}</td>
          </tr>
        </tbody>
      </table>
    </div> -->
  </div>
</template>
