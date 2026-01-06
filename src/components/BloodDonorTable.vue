<script setup>
import { computed } from 'vue'

const props = defineProps({
  donors: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  meta: { type: Object, default: () => ({ page: 1, per_page: 25 }) },
})

const emit = defineEmits(['edit'])

const serialOffset = computed(() => {
  const page = Number(props.meta?.page || 1)
  const perPage = Number(props.meta?.per_page || 25)
  return (page - 1) * perPage
})

const toBool = (v) => v === true || v === 1 || v === '1' || v === 'true'
const isAvailable = (d) => toBool(d?.is_available)

const availabilityPill = (d) =>
  isAvailable(d)
    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
    : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'

const statusPill = (status) => {
  switch (String(status || '').toLowerCase()) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
    case 'inactive':
      return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
    case 'blocked':
      return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
    default:
      return 'bg-zinc-50 text-zinc-700 ring-1 ring-zinc-200'
  }
}

const formatDate = (date) => {
  if (!date) return '—'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="rounded-2xl border border-zinc-200 bg-white shadow-sm">
    <!-- Header bar -->
    <div class="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
      <div>
        <div class="text-sm font-semibold text-zinc-900">Donor List</div>
        <div class="text-xs text-zinc-500">Click row or press History to update</div>
      </div>
      <div class="text-xs text-zinc-500">
        <span v-if="loading">Loading…</span>
        <span v-else>{{ donors.length }} rows</span>
      </div>
    </div>

    <!-- IMPORTANT: overflow-y container for sticky header -->
    <div class="max-h-[70vh] overflow-auto">
      <table class="w-full table-fixed">
        <!-- col widths: prevents big blank right area -->
        <colgroup>
          <col class="w-14" />
          <col class="w-[320px]" />
          <col class="w-20" />
          <col class="w-[230px]" />
          <col class="w-36" />
          <col class="w-28" />
          <col class="w-28" />
        </colgroup>

        <!-- Sticky header -->
        <thead class="sticky top-0 z-20 bg-zinc-50">
          <tr class="text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
            <th class="px-4 py-3">SL</th>
            <th class="px-4 py-3">Donor</th>
            <th class="px-4 py-3">Blood</th>
            <th class="px-4 py-3">Availability</th>
            <th class="px-4 py-3">Last donation</th>
            <th class="px-4 py-3">Status</th>

            <!-- Sticky right action header -->
            <th class="sticky right-0 px-4 py-3 text-right bg-zinc-50 border-l border-zinc-100">
              Action
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-zinc-100 text-[13px]">
          <!-- Skeleton rows -->
          <template v-if="loading">
            <tr v-for="n in 10" :key="`sk-${n}`" class="animate-pulse">
              <td class="px-4 py-3"><div class="h-3 w-8 rounded bg-zinc-100" /></td>
              <td class="px-4 py-3"><div class="h-3 w-64 rounded bg-zinc-100" /></td>
              <td class="px-4 py-3"><div class="h-3 w-10 rounded bg-zinc-100" /></td>
              <td class="px-4 py-3"><div class="h-3 w-44 rounded bg-zinc-100" /></td>
              <td class="px-4 py-3"><div class="h-3 w-24 rounded bg-zinc-100" /></td>
              <td class="px-4 py-3"><div class="h-3 w-16 rounded bg-zinc-100" /></td>
              <td class="sticky right-0 px-4 py-3 bg-white border-l border-zinc-100">
                <div class="ml-auto h-8 w-20 rounded bg-zinc-100" />
              </td>
            </tr>
          </template>

          <!-- Data rows -->
          <template v-else>
            <tr
              v-for="(donor, index) in donors"
              :key="donor?.id"
              class="group cursor-pointer hover:bg-sky-100"
              @click="emit('edit', donor)"
              title="Open history update"
            >
              <td class="px-4 py-3 font-medium text-zinc-900">
                {{ serialOffset + index + 1 }}
              </td>

              <!-- Donor cell (professional, compact) -->
              <td class="px-4 py-3">
                <div class="flex items-start gap-3">
                  <div class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-xs font-bold text-zinc-700">
                    {{ (donor?.blood || '—').slice(0, 2) }}
                  </div>

                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <div class="truncate font-semibold text-zinc-900">
                        {{ donor?.name || 'N/A' }}
                      </div>
                      <span v-if="donor?.id" class="text-[11px] text-zinc-500">#{{ donor.id }}</span>
                    </div>

                    <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-500">
                      <span class="truncate">{{ donor?.phone || 'N/A' }}</span>
                      <span class="text-zinc-300">•</span>
                      <span class="truncate" :title="donor?.address || ''">
                        {{ donor?.address || 'N/A' }}
                      </span>
                    </div>
                  </div>
                </div>
              </td>

              <td class="px-4 py-3 font-semibold text-zinc-900">
                {{ donor?.blood || 'N/A' }}
              </td>

              <!-- Availability -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <span :class="['inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold', availabilityPill(donor)]">
                    {{ isAvailable(donor) ? 'Available' : 'Not available' }}
                  </span>
                  <span v-if="donor?.available_from" class="text-[11px] text-zinc-500">
                    From {{ formatDate(donor.available_from) }}
                  </span>
                </div>

                <div v-if="donor?.availability_note" class="mt-1 line-clamp-1 text-[11px] text-zinc-500">
                  {{ donor.availability_note }}
                </div>
              </td>

              <td class="px-4 py-3 text-zinc-800">
                <span class="font-medium">{{ formatDate(donor?.last_donation_date) }}</span>
              </td>

              <td class="px-4 py-3">
                <span :class="['inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold', statusPill(donor?.status)]">
                  {{ donor?.status || 'N/A' }}
                </span>
              </td>

              <!-- Sticky right action cell -->
              <td class="sticky right-0 px-4 py-3 bg-white border-l border-zinc-100 text-right">
                <button
                  type="button"
                  class="inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  @click.stop="emit('edit', donor)"
                >
                  History
                </button>
              </td>
            </tr>

            <!-- Empty state -->
            <tr v-if="donors.length === 0">
              <td colspan="7" class="px-4 py-12 text-center text-sm text-zinc-500">
                No donors found.
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
