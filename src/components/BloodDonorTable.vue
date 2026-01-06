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

const phoneLink = (phone) => {
  if (!phone) return null
  const digits = String(phone).replace(/[^\d+]/g, '')
  return digits ? `tel:${digits}` : null
}

const companyLabel = (donor) =>
  donor?.company_name || donor?.company?.name || donor?.organization?.name || 'N/A'

const departmentLabel = (donor) =>
  donor?.department_name || donor?.department?.name || donor?.team?.name || 'N/A'

const initials = (name) => {
  const s = String(name || '').trim()
  if (!s) return '—'
  const parts = s.split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase()).join('')
}

const onRowOpen = (donor) => emit('edit', donor)
</script>

<template>
  <div class="rounded-xl border border-zinc-200 bg-white shadow-sm">
    <!-- Header -->
    <div class="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3">
      <div class="min-w-0">
        <div class="text-sm font-semibold text-zinc-900">Donors</div>
        <div class="mt-0.5 text-xs text-zinc-500">
          Click a row (or History) to update donor history.
        </div>
      </div>

      <div class="shrink-0 text-xs text-zinc-500">
        <span v-if="loading" class="inline-flex items-center gap-2">
          <span class="h-2 w-2 animate-pulse rounded-full bg-zinc-300"></span>
          Loading…
        </span>
        <span v-else class="inline-flex items-center gap-2">
          <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
          {{ donors.length }} rows
        </span>
      </div>
    </div>

    <!-- Table -->
    <div class="max-h-[70vh] overflow-auto">
      <table class="w-full table-fixed text-[12px]">
        <!-- 9 columns (matches TH/TD count) -->
        <colgroup>
          <col class="w-14" />
          <col class="w-[280px]" />
          <col class="w-[240px]" />
          <col class="w-[220px]" />
          <col class="w-20" />
          <col class="w-[210px]" />
          <col class="w-28" />
          <col class="w-28" />
          <col class="w-24" />
        </colgroup>

        <thead class="sticky top-0 z-20 bg-zinc-50/95 backdrop-blur">
          <tr class="text-left text-[10.5px] font-semibold uppercase tracking-wide text-zinc-600">
            <th class="sticky left-0 z-30 bg-zinc-50/95 px-4 py-2.5">SL</th>
            <th class="px-4 py-2.5">Donor</th>
            <th class="px-4 py-2.5">Organization</th>
            <th class="px-4 py-2.5">Contact</th>
            <th class="px-4 py-2.5">Blood</th>
            <th class="px-4 py-2.5">Availability</th>
            <th class="px-4 py-2.5">Last</th>
            <th class="px-4 py-2.5">Status</th>
            <th class="sticky right-0 z-30 bg-zinc-50/95 px-4 py-2.5 text-right border-l border-zinc-100">
              Action
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-zinc-100">
          <!-- Loading skeleton -->
          <template v-if="loading">
            <tr v-for="n in 10" :key="`sk-${n}`" class="animate-pulse">
              <td class="sticky left-0 z-10 bg-white px-4 py-2.5">
                <div class="h-3 w-8 rounded bg-zinc-100" />
              </td>
              <td class="px-4 py-2.5"><div class="h-3 w-64 rounded bg-zinc-100" /></td>
              <td class="px-4 py-2.5"><div class="h-3 w-56 rounded bg-zinc-100" /></td>
              <td class="px-4 py-2.5"><div class="h-3 w-52 rounded bg-zinc-100" /></td>
              <td class="px-4 py-2.5"><div class="h-3 w-12 rounded bg-zinc-100" /></td>
              <td class="px-4 py-2.5"><div class="h-3 w-44 rounded bg-zinc-100" /></td>
              <td class="px-4 py-2.5"><div class="h-3 w-20 rounded bg-zinc-100" /></td>
              <td class="px-4 py-2.5"><div class="h-3 w-16 rounded bg-zinc-100" /></td>
              <td class="sticky right-0 z-10 bg-white px-4 py-2.5 border-l border-zinc-100">
                <div class="ml-auto h-7 w-20 rounded bg-zinc-100" />
              </td>
            </tr>
          </template>

          <!-- Data -->
          <template v-else>
            <tr
              v-for="(donor, index) in donors"
              :key="donor?.id ?? index"
              class="group cursor-pointer hover:bg-sky-50 focus-within:bg-sky-50"
              role="button"
              tabindex="0"
              title="Open history update"
              @click="onRowOpen(donor)"
              @keydown.enter.prevent="onRowOpen(donor)"
              @keydown.space.prevent="onRowOpen(donor)"
            >
              <!-- SL (sticky) -->
              <td class="sticky left-0 z-10 bg-white group-hover:bg-sky-50 px-4 py-2.5 font-medium text-zinc-900">
                {{ serialOffset + index + 1 }}
              </td>

              <!-- Donor -->
              <td class="px-4 py-2.5">
                <div class="flex items-start gap-3 min-w-0">
                  <div
                    class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-[11px] font-bold text-zinc-700"
                    :title="donor?.name || ''"
                  >
                    {{ initials(donor?.name) }}
                  </div>

                  <div class="min-w-0">
                    <div class="flex items-center gap-2 min-w-0">
                      <div class="truncate font-semibold text-zinc-900">
                        {{ donor?.name || 'N/A' }}
                      </div>
                      <span v-if="donor?.id" class="shrink-0 text-[11px] text-zinc-400">#{{ donor.id }}</span>
                    </div>

                    <div class="mt-0.5 line-clamp-1 text-[11px] text-zinc-500">
                      {{ donor?.availability_note || 'Ready to support' }}
                    </div>
                  </div>
                </div>
              </td>

              <!-- Organization (stack company + dept) -->
              <td class="px-4 py-2.5">
                <div class="min-w-0">
                  <div class="truncate text-zinc-900" :title="companyLabel(donor)">{{ companyLabel(donor) }}</div>
                  <div class="mt-0.5 truncate text-[11px] text-zinc-500" :title="departmentLabel(donor)">
                    {{ departmentLabel(donor) }}
                  </div>
                </div>
              </td>

              <!-- Contact (stack phone + address) -->
              <td class="px-4 py-2.5">
                <div class="min-w-0">
                  <div class="font-semibold">
                    <a
                      v-if="phoneLink(donor?.phone)"
                      :href="phoneLink(donor?.phone)"
                      class="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-500"
                      @click.stop
                    >
                      <span aria-hidden="true">☎</span>
                      <span class="tabular-nums">{{ donor?.phone }}</span>
                    </a>
                    <span v-else class="text-zinc-500">{{ donor?.phone || 'N/A' }}</span>
                  </div>

                  <div v-if="donor?.address" class="mt-0.5 line-clamp-1 text-[11px] text-zinc-500" :title="donor.address">
                    {{ donor.address }}
                  </div>
                  <div v-else class="mt-0.5 text-[11px] text-zinc-400">—</div>
                </div>
              </td>

              <!-- Blood -->
              <td class="px-4 py-2.5">
                <span class="inline-flex items-center rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-semibold">
                  {{ donor?.blood || 'N/A' }}
                </span>
              </td>

              <!-- Availability -->
              <td class="px-4 py-2.5">
                <div class="flex items-center gap-2">
                  <span
                    :class="[
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      availabilityPill(donor),
                    ]"
                  >
                    {{ isAvailable(donor) ? 'Available' : 'Not available' }}
                  </span>

                  <span v-if="donor?.available_from" class="text-[11px] text-zinc-500">
                    {{ formatDate(donor.available_from) }}
                  </span>
                </div>
              </td>

              <!-- Last donation -->
              <td class="px-4 py-2.5 text-zinc-800">
                <span class="font-medium tabular-nums">{{ formatDate(donor?.last_donation_date) }}</span>
              </td>

              <!-- Status -->
              <td class="px-4 py-2.5">
                <span
                  :class="[
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize',
                    statusPill(donor?.status),
                  ]"
                >
                  {{ donor?.status || 'N/A' }}
                </span>
              </td>

              <!-- Action (sticky) -->
              <td class="sticky right-0 z-10 bg-white group-hover:bg-sky-50 px-4 py-2.5 border-l border-zinc-100 text-right">
                <button
                  type="button"
                  class="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  @click.stop="emit('edit', donor)"
                >
                  History
                </button>
              </td>
            </tr>

            <tr v-if="donors.length === 0">
              <td colspan="9" class="px-4 py-12 text-center text-sm text-zinc-500">
                No donors found.
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
