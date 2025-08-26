<template>
  <section
    class="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden"
    aria-labelledby="employee-info-title"
  >
    <!-- Accent header -->
    <div class="relative isolate">
      <div class="h-1 w-full bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400"></div>

      <header class="flex items-center justify-between px-5 pt-4 pb-3">
        <div class="flex items-center gap-3">
          <!-- Avatar -->
          <div
            class="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 text-indigo-700 font-semibold"
            aria-hidden="true"
          >
            <img
              v-if="avatar"
              :src="avatar"
              :alt="safe(user?.name)"
              class="h-10 w-10 rounded-full object-cover"
            />
            <span v-else class="select-none">{{ initials }}</span>
          </div>

          <div class="min-w-0">
            <h2 id="employee-info-title" class="truncate text-lg font-semibold">
              {{ safe(user?.name) }}
            </h2>
            <p class="mt-0.5 line-clamp-1 text-xs text-zinc-500">
              Selected Employee Info
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <slot name="actions" />
        </div>
      </header>
    </div>

    <!-- Chips -->
    <div v-if="user" class="px-5 pb-2">
      <div class="flex flex-wrap items-center gap-2">
        <span
          v-if="user.company?.name"
          class="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
        >
          <i class="far fa-briefcase text-[11px]"></i>
          {{ user.company.name }}
        </span>

        <span
          v-if="user.department?.name"
          class="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700"
        >
          <i class="far fa-building text-[11px]"></i>
          {{ user.department.name }}
        </span>

        <span
          v-if="user.designation?.title"
          class="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
        >
          <i class="far fa-id-badge text-[11px]"></i>
          {{ user.designation.title }}
        </span>
      </div>
    </div>

    <hr class="border-zinc-100" />

    <!-- Loading -->
    <div v-if="loading" class="grid gap-3 p-5 md:grid-cols-2">
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
    <div v-else-if="!user" class="px-5 py-5 text-center">
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

    <!-- Content -->
    <dl v-else class="grid gap-x-8 gap-y-3 px-5 py-1 md:grid-cols-2">
      <!-- <InfoRow label="Name"         :value="safe(user.name)"          icon="fa-user" /> -->
      <InfoRow label="Phone"        :value="formatPhone(user.phone)"  icon="fa-phone">
        <template #valueRight v-if="user.phone">
          <button
            class="ml-2 inline-flex items-center rounded-md border px-2 py-0.5 text-xs hover:bg-zinc-50"
            @click="copy(user.phone)"
          >
            <i :class="[copiedKey==='phone' ? 'fas fa-check' : 'far fa-copy', 'text-[11px]']"></i>
          </button>
        </template>
      </InfoRow>
      <InfoRow label="Employee ID"  :value="safe(user.employee_id)"   icon="fa-hashtag" />
 
      <!-- <InfoRow label="Designation"  :value="safe(user.designation?.title)" icon="fa-id-badge" /> -->
      <!-- <InfoRow label="Department"   :value="safe(user.department?.name)"   icon="fa-building" /> -->
      <!-- <InfoRow label="Company"      :value="safe(user.company?.name)"      icon="fa-briefcase" /> -->
      <InfoRow label="Joining Date" :value="formatDate(user.joining_date)" icon="fa-calendar" />
      <InfoRow label="Blood Group"  :value="safe(user.blood)"              icon="fa-tint" />
      <InfoRow label="Email"        :value="formatEmail(user.email)"  icon="fa-envelope">
        <template #valueRight v-if="user.email">
          <button
            class="ml-2 inline-flex items-center rounded-md border px-2 py-0.5 text-xs hover:bg-zinc-50"
            @click="copy(user.email, 'email')"
          >
            <i :class="[copiedKey==='email' ? 'fas fa-check' : 'far fa-copy', 'text-[11px]']"></i>
          </button>
        </template>
      </InfoRow>
    </dl>

    <footer class="px-5 pb-5">
      <slot />
    </footer>
  </section>
</template>

<script setup>
import InfoRow from './InfoRow.vue'
import BaseSkeleton from './BaseSkeleton.vue'
import { computed, ref } from 'vue'

const props = defineProps({
  user: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  placeholder: { type: String, default: 'N/A' },
  dateLocale: { type: String, default: undefined },
  avatar: { type: String, default: '' },
})

const copiedKey = ref('')

const avatar = computed(() => props.photo || props.user?.photo || '')

const initials = computed(() => {
  const name = (props.user?.name || '').trim()
  const [a = '', b = ''] = name.split(' ')
  return (a[0] || '').toUpperCase() + (b[0] || '').toUpperCase()
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

function formatEmail(v) {
  if (!v) return props.placeholder
  const s = String(v).trim()
  return s ? `<a href="mailto:${s}" class="underline underline-offset-2">${s}</a>` : props.placeholder
}
function formatPhone(v) {
  if (!v) return props.placeholder
  const s = String(v).trim()
  return s ? `<a href="tel:${s}" class="underline underline-offset-2">${s}</a>` : props.placeholder
}

async function copy(text, key = 'phone') {
  try {
    await navigator.clipboard.writeText(String(text))
    copiedKey.value = key
    setTimeout(() => (copiedKey.value = ''), 1500)
  } catch {}
}
</script>

<style scoped>
:deep(dd a) {
  color: inherit;
}
</style>
