<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useBloodDonorAdminStore } from '@/stores/bloodDonorAdmin'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'

const store = useBloodDonorAdminStore()
const { filters, loading } = storeToRefs(store)

const showSoon = computed(() => filters.value.availability === 'soon')

const bloodGroups = ['A+','A-','B+','B-','AB+','AB-','O+','O-']
</script>

<template>
  <div class="rounded-xl border border-zinc-200 bg-white p-4">
    <div class="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-2">
      <EmployeeFilter
        v-model:company_id="filters.company_id"
        v-model:department_id="filters.department_id"
        v-model:employee_id="filters.employee_id"
        v-model:line_type="filters.line_type"
        :with-type="true"
        :initial-value="filters"
        class="w-full"
      />
    </div>

    <div class="grid grid-cols-1 gap-3 md:grid-cols-4">
      <div class="space-y-1">
        <label class="text-xs text-zinc-600">Search</label>
        <input v-model.trim="filters.search" class="input-1 h-9 w-full text-sm" placeholder="Name / phone / ID" />
      </div>

      <div class="space-y-1">
        <label class="text-xs text-zinc-600">Address</label>
        <input v-model.trim="filters.address" class="input-1 h-9 w-full text-sm" placeholder="Street, city, area" />
      </div>

      <div class="space-y-1">
        <label class="text-xs text-zinc-600">Blood Group</label>
        <select v-model="filters.blood_group" class="input-1 h-9 w-full text-sm">
          <option value="">All</option>
          <option v-for="b in bloodGroups" :key="b" :value="b">{{ b }}</option>
        </select>
      </div>

      <div class="space-y-1">
        <label class="text-xs text-zinc-600">Availability</label>
        <select v-model="filters.availability" class="input-1 h-9 w-full text-sm">
          <option value="all">All</option>
          <option value="available">Available</option>
          <option value="not_available">Not Available</option>
          <option value="soon">Reset in 15 days</option>
        </select>
      </div>

      <div v-if="showSoon" class="space-y-1">
        <label class="text-xs text-zinc-600">Soon Days</label>
        <input v-model.number="filters.soon_days" type="number" min="1" max="365" class="input-1 h-9 w-full text-sm" />
      </div>

      <div class="space-y-1">
        <label class="text-xs text-zinc-600">Status</label>
        <select v-model="filters.status" class="input-1 h-9 w-full text-sm">
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      <div class="space-y-1">
        <label class="text-xs text-zinc-600">Last Donation From</label>
        <input v-model="filters.last_donation_from" type="date" class="input-1 h-9 w-full text-sm" />
      </div>

      <div class="space-y-1">
        <label class="text-xs text-zinc-600">Last Donation To</label>
        <input v-model="filters.last_donation_to" type="date" class="input-1 h-9 w-full text-sm" />
      </div>

      <div class="flex items-end gap-2">
        <div class="flex-1 space-y-1">
          <label class="text-xs text-zinc-600">Per Page</label>
          <select v-model.number="filters.per_page" class="input-1 h-9 w-full text-sm">
            <option :value="15">15</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </div>

        <button class="btn-3 h-9" :disabled="loading" @click="store.resetFilters()">
          Reset
        </button>
      </div>
    </div>
  </div>
</template>
