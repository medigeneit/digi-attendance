<template>
  <section
    class="rounded-2xl border border-zinc-200 bg-white/90 shadow-sm overflow-hidden supports-[backdrop-filter]:bg-white/70 backdrop-blur"
    aria-labelledby="employee-info-title"
  >
    <!-- Accent header -->
    <div class="relative isolate">
      <div class="h-1 w-full bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400"></div>

      <header
        class="flex-col md:flex-row flex md:items-center justify-between px-4 md:px-5 pt-3 pb-2 md:pt-4 md:pb-3"
      >
        <div class="flex min-w-0 items-center gap-3">
          <!-- Avatar -->
          <div
            class="relative grid h-10 w-10 place-items-center rounded-full bg-indigo-100 text-indigo-700 font-semibold shrink-0"
            aria-hidden="true"
          >
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              :alt="safe(user?.name)"
              class="h-10 w-10 rounded-full object-cover"
            />
            <span v-else class="select-none">{{ initials }}</span>
          </div>

          <div class="min-w-0">
            <h2
              id="employee-info-title"
              class="truncate text-base md:text-lg font-semibold text-zinc-900"
            >
              {{ safe(user?.name) }}
            </h2>
            <p v-if="subtitle" class="mt-0.5 line-clamp-1 text-[11px] md:text-xs text-zinc-500">
              {{ subtitle }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1 md:gap-2 mt-3 md:mt-0">
          <InfoRow label="Phone" :value="formatPhone(user?.phone)" />
        </div>
      </header>
    </div>

    <!-- Chips (horizontal scroll on mobile for tight spaces) -->
    <div v-if="user && badgeList.length" class="px-4 md:px-5 pb-2 overflow-hidden">
      <div
        class="-mx-1 flex flex-col md:flex-row md:items-center gap-2 overflow-x-auto py-0.5 px-1"
      >
        <span
          v-for="b in badgeList"
          :key="b.key"
          class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[13px] font-medium whitespace-nowrap"
          :class="b.class"
        >
          <i :class="b.icon" class="text-[11px]"></i>
          {{ b.label }}
        </span>
      </div>
    </div>

    <!-- <hr class="border-zinc-100" /> -->

    <!-- Loading -->
    <div v-if="loading" class="grid gap-3 p-4 md:p-5 md:grid-cols-2">
      <div class="col-span-full flex items-center gap-3 pb-1">
        <BaseSkeleton class="h-10 w-10 rounded-full" />
        <div class="flex-1">
          <BaseSkeleton class="mb-2 h-4 w-40" />
          <BaseSkeleton class="h-3 w-24" />
        </div>
      </div>
      <BaseSkeleton v-for="n in 8" :key="n" class="h-5 w-full" />
    </div>

    <!-- Empty -->
    <div v-else-if="!user" class="px-5 py-8 text-center">
      <div
        class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-zinc-100 text-zinc-500"
      >
        <i class="far fa-user text-lg"></i>
      </div>
      <p class="text-sm text-zinc-500">No employee selected.</p>
      <p class="mt-1 text-xs text-zinc-400">
        Choose an employee from the list to view details here.
      </p>
    </div>
    <footer class="px-4 md:px-5 pb-4 md:pb-5">
      <slot />
    </footer>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import BaseSkeleton from './BaseSkeleton.vue'
import InfoRow from './InfoRow.vue'

const props = defineProps({
  user: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  placeholder: { type: String, default: 'N/A' },
  dateLocale: { type: String, default: undefined },
  /** Optional: direct avatar url */
  avatar: { type: String, default: '' },
})

// ✅ Fix: avoid name collision & bad prop reference; prefer provided prop > user.photo
const avatarUrl = computed(() => props.avatar || props.user?.photo || '')

const initials = computed(() => {
  const name = (props.user?.name || '').trim()
  const [a = '', b = ''] = name.split(' ')
  return (a[0] || '').toUpperCase() + (b[0] || '').toUpperCase()
})

const subtitle = computed(() => {
  const title = props.user?.designation?.title
  const dept = props.user?.department?.name
  if (title && dept) return `${title} · ${dept}`
  return title || dept || ''
})

const badgeList = computed(() => {
  const out = []
  if (props.user?.email)
    out.push({
      key: 'email',
      label: props.user.email,
      icon: 'far fa-envelope',
      class: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    })
  if (props.user?.blood)
    out.push({
      key: 'blood',
      label: props.user?.blood,
      icon: 'far fa-tint',
      class: 'border-red-200 bg-sky-50 text-red-700',
    })
  if (props.user?.employee_id)
    out.push({
      key: 'id',
      label: props.user.employee_id,
      icon: 'far fa-hashtag',
      class: 'border-amber-200 bg-amber-50 text-amber-700',
    })
  if (props.user?.joining_date)
    out.push({
      key: 'date',
      label: ' Joining Date : ' + formatDate(props.user.joining_date),
      icon: 'far fa-calendar',
      class: 'border-sky-200 bg-sky-50 text-sky-700',
    })
  return out
})

function safe(val) {
  if (val === 0 || val === false) return String(val)
  if (val == null) return props.placeholder
  const s = String(val).trim()
  return s.length ? s : props.placeholder
}

function formatDate(input) {
  if (!input) return props.placeholder
  try {
    const d = input instanceof Date ? input : new Date(String(input))
    if (Number.isNaN(d.getTime())) return props.placeholder
    return d.toLocaleDateString(props.dateLocale, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    })
  } catch {
    return props.placeholder
  }
}

function formatPhone(v) {
  if (!v) return props.placeholder
  const s = String(v).trim()
  return s ? `<a href="tel:${s}" class="underline underline-offset-2">${s}</a>` : props.placeholder
}
</script>

<style scoped>
:deep(dd a) {
  color: inherit;
}
</style>
