<template>
  <main class="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
    <!-- Hero -->
    <section class="relative overflow-hidden">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-30 bg-sky-300"></div>
        <div class="absolute -bottom-24 -left-24 w-96 h-96 rounded-full blur-3xl opacity-30 bg-indigo-300"></div>
      </div>

      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div class="rounded-3xl border bg-white/70 backdrop-blur-md shadow-sm">
          <div class="p-8 md:p-12 lg:p-16 grid lg:grid-cols-12 gap-8">
            <div class="lg:col-span-7 space-y-6">
              <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-medium border border-sky-100">
                <svg width="16" height="16" viewBox="0 0 24 24" class="inline"><path fill="currentColor" d="M11 21q-3.35 0-5.675-2.325T3 13q0-1.95.788-3.675T6 6l1.4 1.4Q6.55 8.275 6.025 9.338T5.5 11q0 2.7 1.9 4.6T12 17.5q.825 0 1.55-.188T15 16.85l1.45 1.45q-.875.675-1.963 1.188T12 20q-.525 0-1.013-.05T10 19.85V22q.5.075 1 .063T12 22q4.15 0 7.075-2.925T22 12q0-.5-.05-1t-.15-1h-2.15q.125.5.162 1t.038 1q0 3.35-2.325 5.675T12 21ZM2 5V2h3l9.6 9.6l-3 3L2 5Z"/></svg>
                About Us
              </span>

              <h1 class="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900">
                We build tools that <span class="bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">empower teams</span> to do their best work
              </h1>

              <p class="text-slate-600 leading-relaxed max-w-prose">
                Our mission is simple: ship delightful, reliable software that removes friction from your day.
                From attendance to projects, we design with empathy and engineer with rigor.
              </p>

              <div class="flex flex-wrap gap-3">
                <a href="/home/careers" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition">
                  Explore Careers
                  <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M5 12h12l-4.5-4.5L13 6l7 7l-7 7l-1.5-1.5L17 13H5z"/></svg>
                </a>
                <a href="/policy" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition">
                  Read Our Principles
                </a>
              </div>
            </div>

            <div class="lg:col-span-5">
              <div class="aspect-[4/3] rounded-2xl border bg-white/60 backdrop-blur-sm shadow-sm grid place-items-center">
                <!-- Illustration placeholder -->
                <svg class="w-2/3 h-2/3 text-slate-300" viewBox="0 0 200 120" role="img" aria-label="Product illustration">
                  <rect x="8" y="20" width="184" height="80" rx="12" fill="currentColor" opacity="0.35"/>
                  <rect x="24" y="36" width="80" height="52" rx="8" fill="currentColor" opacity="0.25"/>
                  <rect x="116" y="36" width="60" height="12" rx="6" fill="currentColor" opacity="0.25"/>
                  <rect x="116" y="56" width="60" height="32" rx="8" fill="currentColor" opacity="0.25"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Active Users" value="12k+" />
          <StatCard label="Uptime" value="99.98%" />
          <StatCard label="Countries" value="18" />
          <StatCard label="Avg. CSAT" value="4.8/5" />
        </div>
      </div>
    </section>

    <!-- Mission + Values -->
    <section class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div class="grid lg:grid-cols-2 gap-8">
        <div class="rounded-3xl border bg-white p-8 shadow-sm">
          <h2 class="text-xl font-bold text-slate-900">Our Mission</h2>
          <p class="mt-3 text-slate-600 leading-relaxed">
            To craft simple, scalable systems that teams love to use—so your workday flows without the busywork.
          </p>
          <ul class="mt-6 space-y-3">
            <li class="flex items-start gap-3">
              <CheckIcon />
              <span><b>Human-first UX:</b> Clear language, fast paths, predictable outcomes.</span>
            </li>
            <li class="flex items-start gap-3">
              <CheckIcon />
              <span><b>Engineering excellence:</b> Performant APIs, robust data models, reliable ops.</span>
            </li>
            <li class="flex items-start gap-3">
              <CheckIcon />
              <span><b>Security by default:</b> Least privilege, auditable actions, safe data.</span>
            </li>
          </ul>
        </div>

        <div class="rounded-3xl border bg-white p-8 shadow-sm">
          <h2 class="text-xl font-bold text-slate-900">Our Values</h2>
          <div class="mt-6 grid sm:grid-cols-2 gap-4">
            <ValueCard title="Clarity" desc="Design for focus. Label things what they are." />
            <ValueCard title="Care" desc="Accessibility, performance, privacy—non-negotiables." />
            <ValueCard title="Craft" desc="Quality in details: empty states, loading, errors." />
            <ValueCard title="Candor" desc="Feedback loops that improve the work, not politics." />
          </div>
        </div>
      </div>
    </section>

    <!-- Timeline -->
    <section class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
      <div class="rounded-3xl border bg-white p-8 shadow-sm">
        <h2 class="text-xl font-bold text-slate-900">How we got here</h2>
        <ol class="mt-6 relative border-s border-slate-200">
          <li v-for="(item, i) in timeline" :key="i" class="ms-6 pb-8 last:pb-0">
            <span class="absolute -start-3 mt-1 inline-flex size-6 items-center justify-center rounded-full border bg-white text-slate-600">
              {{ i + 1 }}
            </span>
            <h3 class="font-semibold text-slate-900">{{ item.title }}</h3>
            <p class="text-sm text-slate-500">{{ item.when }}</p>
            <p class="mt-2 text-slate-600 leading-relaxed">{{ item.desc }}</p>
          </li>
        </ol>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue'

const timeline = ref([
  { title: 'Started with a simple idea', when: '2019', desc: 'One dashboard to replace spreadsheets and siloed tools.' },
  { title: 'Launched v1 to early teams', when: '2020', desc: 'Feedback loops shaped the core: clear UI, solid APIs.' },
  { title: 'Scaled across orgs', when: '2022', desc: 'Added roles, reviews, HRM, and performance modules.' },
  { title: 'Today & beyond', when: 'Now', desc: 'Continuously iterating with reliability, speed, and care.' },
])

/* Local dumb components (inline to keep file portable) */
const StatCard = {
  props: { label: String, value: String },
  template: `
    <div class="rounded-2xl border bg-white p-5 text-center shadow-sm">
      <div class="text-2xl md:text-3xl font-extrabold text-slate-900">{{ value }}</div>
      <div class="text-xs uppercase tracking-wider text-slate-500 mt-1">{{ label }}</div>
    </div>
  `
}

const ValueCard = {
  props: { title: String, desc: String },
  template: `
    <div class="rounded-2xl border bg-white p-5 hover:shadow-sm transition">
      <div class="flex items-start gap-3">
        <svg width="20" height="20" viewBox="0 0 24 24" class="mt-0.5 text-slate-700"><path fill="currentColor" d="M12 22q-3.95 0-6.975-3.025T2 12t3.025-6.975T12 2t6.975 3.025T22 12t-3.025 6.975T12 22m-1-6l7-7l-1.4-1.45L11 13.1L7.4 9.5L6 10.9z"/></svg>
        <div>
          <div class="font-semibold text-slate-900">{{ title }}</div>
          <p class="text-sm text-slate-600 mt-1">{{ desc }}</p>
        </div>
      </div>
    </div>
  `
}

const TeamCard = {
  props: { name: String, role: String },
  template: `
    <article class="rounded-2xl border bg-white p-5 text-center hover:shadow-sm transition">
      <div class="mx-auto size-20 rounded-full bg-gradient-to-br from-slate-200 to-slate-100 grid place-items-center">
        <svg width="28" height="28" viewBox="0 0 24 24" class="text-slate-500"><path fill="currentColor" d="M12 12q-1.65 0-2.825-1.175T8 8q0-1.65 1.175-2.825T12 4q1.65 0 2.825 1.175T16 8q0 1.65-1.175 2.825T12 12m-8 8v-1.5q0-.8.4-1.463t1.05-1.087q1.55-.775 3.05-1.112T12 14.5t3.5.338t3.05 1.112q.65.425 1.05 1.088T20 18.5V20z"/></svg>
      </div>
      <h3 class="mt-3 font-semibold text-slate-900">{{ name }}</h3>
      <p class="text-sm text-slate-600">{{ role }}</p>
    </article>
  `
}

const CheckIcon = {
  template: `
    <svg width="18" height="18" viewBox="0 0 24 24" class="text-green-600 mt-0.5">
      <path fill="currentColor" d="m10 17l-5-5l1.4-1.45L10 14.1L17.6 6.5L19 7.9z"/>
    </svg>
  `
}
</script>

<style scoped>
/* Subtle focus ring for keyboard users */
a, button {
  outline: none;
}
a:focus-visible, button:focus-visible {
  box-shadow: 0 0 0 3px rgba(56, 189, 248, .4); /* sky-400/40 */
  border-radius: 12px;
}
</style>
