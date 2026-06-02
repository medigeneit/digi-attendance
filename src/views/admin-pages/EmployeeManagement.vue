<script setup>
const primaryActions = [
  {
    title: 'Employee Directory',
    description: 'Profile, employment, shift, weekend, KPI, payroll and exit status.',
    to: { name: 'UserList' },
    icon: 'far fa-address-book',
    tone: 'blue',
    metric: 'Records',
  },
  {
    title: 'Onboarding Pipeline',
    description: 'Pre-boarding, joining checklist, training, probation and confirmation.',
    to: { name: 'lifecycle.board', params: { flowType: 'onboarding' } },
    icon: 'far fa-route',
    tone: 'emerald',
    metric: 'Joiners',
  },
  {
    title: 'Offboarding Pipeline',
    description: 'Exit request, clearance, handover, interview and final settlement.',
    to: { name: 'lifecycle.board', params: { flowType: 'offboarding' } },
    icon: 'far fa-sign-out-alt',
    tone: 'rose',
    metric: 'Leavers',
  },
]

const workQueues = [
  {
    title: 'Joining Checklist',
    description: 'Required documents, access setup, bank details, and day-one readiness.',
    to: { name: 'checklists.board', query: { type: 'joining' } },
    icon: 'far fa-clipboard-check',
  },
  {
    title: 'Exit Clearance',
    description: 'Department clearance, asset return, handover checks, and print summary.',
    to: { name: 'checklists.board', query: { type: 'exit' } },
    icon: 'far fa-list-check',
  },
  {
    title: 'Employee List',
    description: 'Shift, weekend, KPI assignment, status, and exit controls in one table.',
    to: { name: 'UserList' },
    icon: 'far fa-users-cog',
  },
  {
    title: 'Add Employee',
    description: 'Create a record with professional, payroll, weekend, and approval setup.',
    to: { name: 'UserAdd' },
    icon: 'far fa-user-plus',
  },
]

const processSteps = [
  { label: 'Record', icon: 'far fa-id-card', description: 'Employee profile and job setup' },
  { label: 'Onboard', icon: 'far fa-route', description: 'Joining readiness and probation' },
  { label: 'Operate', icon: 'far fa-user-cog', description: 'Attendance, shifts and KPI links' },
  { label: 'Exit', icon: 'far fa-sign-out-alt', description: 'Clearance and settlement flow' },
]
</script>

<template>
  <div class="min-h-screen bg-slate-50 px-3 py-3 text-slate-800 md:px-5">
    <section class="mb-3 rounded-md border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div class="min-w-0">
          <div class="text-[10px] font-bold uppercase tracking-[0.24em] text-blue-700">HR Department</div>
          <h1 class="mt-0.5 text-xl font-semibold leading-tight text-slate-950">EmpManage</h1>
          <p class="mt-1 text-xs text-slate-500">
            Employee record, onboarding, offboarding and checklist operations in one ERP workspace.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <RouterLink
            :to="{ name: 'UserAdd' }"
            class="inline-flex items-center gap-2 rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-800"
          >
            <i class="far fa-user-plus"></i>
            Add Employee
          </RouterLink>
          <RouterLink
            :to="{ name: 'UserList' }"
            class="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <i class="far fa-list"></i>
            Employee List
          </RouterLink>
        </div>
      </div>

      <div class="grid divide-y divide-slate-100 md:grid-cols-4 md:divide-x md:divide-y-0">
        <div
          v-for="step in processSteps"
          :key="step.label"
          class="flex items-center gap-3 px-4 py-3"
        >
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
            <i :class="step.icon"></i>
          </span>
          <div class="min-w-0">
            <div class="text-xs font-semibold text-slate-950">{{ step.label }}</div>
            <div class="truncate text-[11px] text-slate-500">{{ step.description }}</div>
          </div>
        </div>
      </div>
    </section>

    <section class="mb-3 grid gap-3 lg:grid-cols-3">
      <RouterLink
        v-for="item in primaryActions"
        :key="item.title"
        :to="item.to"
        class="group rounded-md border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-300 hover:shadow-md"
      >
        <div class="flex items-start justify-between gap-2">
          <div
            class="flex h-9 w-9 items-center justify-center rounded-md text-sm"
            :class="{
              'bg-blue-50 text-blue-700': item.tone === 'blue',
              'bg-emerald-50 text-emerald-700': item.tone === 'emerald',
              'bg-rose-50 text-rose-700': item.tone === 'rose',
            }"
          >
            <i :class="item.icon"></i>
          </div>
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            {{ item.metric }}
          </span>
        </div>
        <h2 class="mt-3 text-sm font-semibold text-slate-950">{{ item.title }}</h2>
        <p class="mt-1 min-h-[36px] text-xs leading-5 text-slate-600">{{ item.description }}</p>
        <div class="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-blue-700">
          Open
          <i class="far fa-arrow-right transition group-hover:translate-x-0.5"></i>
        </div>
      </RouterLink>
    </section>

    <section class="rounded-md border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
        <div>
          <h2 class="text-sm font-semibold text-slate-950">Operational Queues</h2>
          <p class="text-[11px] text-slate-500">Frequent HR actions and lifecycle boards.</p>
        </div>
        <span class="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
          ERP shortcuts
        </span>
      </div>

      <div class="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-4">
        <RouterLink
          v-for="item in workQueues"
          :key="item.title"
          :to="item.to"
          class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 transition hover:border-blue-300 hover:bg-white"
        >
          <div class="flex items-center gap-2 text-xs font-semibold text-slate-900">
            <span class="flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-700">
              <i :class="item.icon"></i>
            </span>
            {{ item.title }}
          </div>
          <p class="mt-1.5 text-[11px] leading-4 text-slate-600">{{ item.description }}</p>
        </RouterLink>
      </div>
    </section>
  </div>
</template>
