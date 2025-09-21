<script setup>
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
const userStore = useUserStore()
const { userDashboard } = storeToRefs(userStore)
</script>
<template>
  <div class="bg-white shadow-md rounded-lg">
    <h2 class="text-xl font-semibold py-2 px-4">Leave Balance</h2>

    <div class="overflow-x-auto shadow-md min-h-max">
      <table class="min-w-full text-sm text-left text-gray-500 table-fixed">
        <thead>
          <tr class="text-xs">
            <th class="px-2 py-1 font-semibold text-gray-900 border bg-gray-50"></th>
            <th
              class="px-4 text-center py-1 font-semibold text-gray-900 border bg-gray-50 w-40"
              v-for="leave_balance in userDashboard?.leave_balance"
              :key="leave_balance.id"
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
              v-for="leave_balance in userDashboard?.leave_balance"
              :key="leave_balance.id"
            >
              {{ leave_balance.annual_quota }}
            </td>
          </tr>

          <tr>
            <td class="px-4 py-3 font-medium text-gray-900 border text-xs">Used</td>
            <td
              class="px-4 text-center py-4 font-medium text-gray-900 border"
              v-for="leave_balance in userDashboard?.leave_balance"
              :key="leave_balance.id"
            >
              {{ leave_balance.used_days }}
            </td>
          </tr>

          <tr class="text-sm font-semibold text-blue-800">
            <td class="px-4 py-3 border text-xs">Balance</td>
            <td
              class="px-4 text-center py-4 border"
              v-for="leave_balance in userDashboard?.leave_balance"
              :key="leave_balance.id"
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
