<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useBloodDonorAdminStore } from '@/stores/bloodDonorAdmin'
import BloodDonorFilters from '@/components/BloodDonorFilters.vue'
import BloodDonorTable from '@/components/BloodDonorTable.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import DonorAdminModal from '@/components/DonorAdminModal.vue'

const store = useBloodDonorAdminStore()
const { donors, meta, loading, error } = storeToRefs(store)

const ready = ref(false)

onMounted(async () => {
  ready.value = true
  await store.fetchDonors()
})

const filtersKey = computed(() => JSON.stringify(store.filters))

watch(filtersKey, async () => {
  if (!ready.value) return
  store.setPage(1)
  await store.fetchDonors()
})

const handlePageChange = async (page) => {
  store.setPage(page)
  await store.fetchDonors()
}

const openEdit = (row) => {
  // row already contains user fields + latest donor snapshot from backend list
  store.openModalForUser({
    id: row.id,
    name: row.name,
    phone: row.phone,
    blood_group: row.blood,
    address: row.address,
    alternate_phone: row.alternate_phone,
  })

  // optional: preload form from snapshot values
  store.form.user_id = String(row.id)
  store.form.is_available = !!Number(row.is_available || 0)
  store.form.status = row.status || 'inactive'
  store.form.availability_note = row.availability_note || ''
  store.form.notes = row.notes || ''
  store.form.last_donation_date = row.last_donation_date || ''
  store.setLastDonationDate(store.form.last_donation_date)
}
</script>

<template>
  <div class="space-y-4 p-5">
    <div class="flex items-center justify-between">
      <h1 class="title-md md:title-lg">Blood Donors</h1>
      <div class="text-sm text-zinc-500">Admin only</div>
    </div>

    <BloodDonorFilters />

    <div
      v-if="error"
      class="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
    >
      {{ error }}
    </div>

    <BloodDonorTable :donors="donors" :loading="loading" :meta="meta" @edit="openEdit" />

    <div
      v-if="!loading && donors.length === 0 && !error"
      class="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500"
    >
      No donors found. Try adjusting the filters.
    </div>

    <PaginationBar
      v-if="meta.total > 0"
      :page="meta.page"
      :per-page="meta.per_page"
      :total="meta.total"
      :last-page="meta.last_page"
      @page-change="handlePageChange"
    />

    <DonorAdminModal />
  </div>
</template>
