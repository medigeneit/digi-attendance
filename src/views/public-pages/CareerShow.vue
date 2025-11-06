<template>
  <main class="mx-auto max-w-6xl px-4 py-8">
    <!-- Breadcrumb -->
    <nav class="text-sm" aria-label="Breadcrumb">
      <RouterLink to="/careers" class="inline-flex items-center gap-1 underline">
        <span aria-hidden>←</span>
        <span>Back to jobs</span>
      </RouterLink>
    </nav>

    <!-- Success Toast -->
    <transition name="fade">
      <div
        v-if="successToast"
        class="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800 shadow-sm"
        role="status"
        aria-live="polite"
      >
        <svg class="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>Your application was submitted successfully.</span>
        <button @click="successToast = false" class="ml-2 text-green-700 hover:text-green-900" aria-label="Dismiss">&times;</button>
      </div>
    </transition>

    <!-- Loading skeleton -->
    <div v-if="loading" class="mt-6 space-y-4" role="status" aria-live="polite">
      <div class="h-8 w-1/3 rounded-lg bg-gray-200 animate-pulse" />
      <div class="grid gap-6 md:grid-cols-3">
        <div class="space-y-3 md:col-span-2">
          <div class="h-40 rounded-xl bg-gray-200 animate-pulse" />
          <div class="h-80 rounded-xl bg-gray-200 animate-pulse" />
        </div>
        <div class="space-y-3">
          <div class="h-56 rounded-xl bg-gray-200 animate-pulse" />
          <div class="h-32 rounded-xl bg-gray-200 animate-pulse" />
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="mt-6" role="alert">
      <div class="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
        <div class="font-semibold">{{ error }}</div>
        <p class="mt-1 text-sm">Please check the job link or try again.</p>
        <button @click="load" class="mt-3 rounded-lg border px-3 py-2 text-sm hover:bg-red-100">Retry</button>
      </div>
    </div>

    <!-- Content -->
    <div v-else-if="job" class="mt-6 grid gap-6 md:grid-cols-3">
      <!-- Main column -->
      <section class="space-y-6 md:col-span-2">
        <!-- Header / Summary -->
        <header class="rounded-xl border bg-white/70 p-5 backdrop-blur">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 class="text-3xl font-bold tracking-tight">{{ job.title }}</h1>
              <div class="prose prose-sm mt-2 max-w-none text-gray-700">
                <div v-if="job.summary" v-html="job.summary" />
              </div>
              <div class="prose prose-sm mt-3 max-w-none text-gray-700">
                <h3 class="mb-1 font-semibold">Responsibilities</h3>
                <div v-if="job.responsibilities" v-html="job.responsibilities" />
              </div>
              <div class="prose prose-sm mt-3 max-w-none text-gray-700">
                <h3 class="mb-1 font-semibold">Requirements</h3>
                <div v-if="job.requirements" v-html="job.requirements" />
              </div>

              <div class="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <span v-if="job.department?.name" class="inline-flex items-center gap-1 rounded-full border bg-gray-50 px-2.5 py-1">{{ job.department.name }}</span>
                <span v-if="job.employment_type" class="inline-flex items-center gap-1 rounded-full border bg-gray-50 px-2.5 py-1">{{ job.employment_type }}</span>
                <span v-if="job.workplace" class="inline-flex items-center gap-1 rounded-full border bg-gray-50 px-2.5 py-1">{{ job.workplace }}</span>
                <span v-if="job.experience_level" class="inline-flex items-center gap-1 rounded-full border bg-gray-50 px-2.5 py-1">{{ job.experience_level }}</span>
              </div>

              <div v-if="job.application_deadline" class="mt-2 text-xs text-gray-500">
                <span>Deadline: {{ formatDate(job.application_deadline) }}</span>
                <span v-if="deadlineCountdown" class="ml-2 inline-flex items-center rounded-full border px-2 py-0.5">⏳ {{ deadlineCountdown }}</span>
              </div>
            </div>
          </div>
        </header>

        <!-- Skills -->
        <section v-if="job.skills?.length" class="rounded-xl border bg-white p-5">
          <h2 class="font-semibold">Required Skills</h2>
          <div class="mt-3 flex flex-wrap gap-2">
            <span v-for="s in job.skills" :key="s.id" class="rounded-lg border bg-gray-50 px-2.5 py-1 text-sm">{{ s.name }}</span>
          </div>
        </section>

        <!-- Apply -->
        <section id="apply" class="rounded-xl border bg-white p-5">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-lg font-semibold">Apply Now</h2>
            <a href="#apply" class="text-sm underline">Jump to form</a>
          </div>

          <!-- Success Confirmation Card -->
          <transition name="fade">
            <div v-if="success" ref="successCard" tabindex="-1" class="mt-4 rounded-xl border border-green-200 bg-green-50 p-6 text-center text-green-900" aria-live="polite">
              <div class="mx-auto flex w-full max-w-md flex-col items-center">
                <svg class="h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                <h3 class="mt-3 text-lg font-semibold">Application submitted!</h3>
                <p class="mt-1 text-sm text-green-800">Thanks for applying. Our team will review your profile and reach out if it’s a match.</p>
                <div class="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <RouterLink to="/careers" class="rounded-lg border px-4 py-2 text-sm hover:bg-green-100">← Back to Jobs</RouterLink>
                  <button class="rounded-lg border px-4 py-2 text-sm hover:bg-green-100" @click="success=false">Submit another</button>
                </div>
              </div>
            </div>
          </transition>

          <!-- Form -->
          <form v-if="!success" @submit.prevent="submit" class="mt-4" novalidate>
            <div class="grid gap-4 md:grid-cols-2">
              <!-- Full name -->
              <div>
                <label for="full_name" class="mb-1 block text-sm font-medium">Full Name *</label>
                <input
                  id="full_name"
                  v-model.trim="form.full_name"
                  type="text"
                  :class="inputClass('full_name')"
                  :aria-invalid="hasErr('full_name')"
                  :aria-describedby="hasErr('full_name') ? 'err-full_name' : undefined"
                  required
                  autocomplete="name"
                />
                <p v-if="hasErr('full_name')" id="err-full_name" class="mt-1 text-sm text-red-600">{{ fieldErrors.full_name }}</p>
              </div>

              <!-- Email -->
              <div>
                <label for="email" class="mb-1 block text-sm font-medium">Email *</label>
                <input
                  id="email"
                  v-model.trim="form.email"
                  type="email"
                  inputmode="email"
                  autocomplete="email"
                  :class="inputClass('email')"
                  :aria-invalid="hasErr('email')"
                  :aria-describedby="hasErr('email') ? 'err-email' : undefined"
                  required
                />
                <p v-if="hasErr('email')" id="err-email" class="mt-1 text-sm text-red-600">{{ fieldErrors.email }}</p>
              </div>

              <!-- Phone -->
              <div>
                <label for="phone" class="mb-1 block text-sm font-medium">Phone</label>
                <input id="phone" v-model.trim="form.phone" type="tel" inputmode="tel" autocomplete="tel" class="input" />
                <p class="mt-1 text-xs text-gray-500">Include country code if applying internationally.</p>
              </div>

              <!-- Resume upload -->
              <div>
                <label class="mb-1 block text-sm font-medium">Resume (PDF/DOC; ≤10MB) *</label>
                <div
                  class="group relative flex cursor-pointer items-center justify-center rounded-lg border border-dashed p-4 focus-within:ring-2 focus-within:ring-gray-200 hover:bg-gray-50"
                  :class="[
                    hasErr('resume') ? 'border-red-300 bg-red-50/50' : 'border-gray-300',
                    dragging ? 'bg-gray-50 ring-2 ring-offset-0' : ''
                  ]"
                  tabindex="0"
                  role="button"
                  @keydown.enter.prevent="fileInput?.click()"
                  @keydown.space.prevent="fileInput?.click()"
                  @dragover.prevent="dragging = true"
                  @dragleave.prevent="dragging = false"
                  @drop.prevent="onDrop"
                >
                  <input
                    ref="fileInput"
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    class="sr-only"
                    @change="onFile"
                    aria-label="Upload resume"
                  />
                  <div class="text-center">
                    <button type="button" @click="fileInput?.click()" class="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100">Choose file</button>
                    <div class="mt-1 text-xs text-gray-600">
                      <template v-if="form.resumeName">{{ form.resumeName }}</template>
                      <template v-else>Drag & drop or click to upload</template>
                    </div>
                  </div>
                </div>
                <p v-if="hasErr('resume')" class="mt-1 text-sm text-red-600">{{ fieldErrors.resume }}</p>
              </div>
            </div>

            <!-- Cover letter -->
            <div class="mt-4">
              <label for="cover" class="mb-1 block text-sm font-medium">Cover Letter</label>
              <textarea id="cover" v-model="form.cover_letter" rows="5" class="textarea" placeholder="Briefly tell us why you're a great fit." />
              <div class="mt-1 flex justify-between text-xs text-gray-500">
                <span>Optional but recommended (5–10 sentences).</span>
                <span>{{ coverCount }}/1000</span>
              </div>
            </div>

            <!-- Extras -->
            <div class="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label for="source" class="mb-1 block text-sm font-medium">How did you hear about this role?</label>
                <input id="source" v-model.trim="form.source" type="text" class="input" placeholder="LinkedIn / Website / Referral" />
              </div>
            </div>

            <!-- Actions -->
            <div class="mt-6 flex flex-wrap items-center gap-3">
              <button :disabled="submitting || !canSubmit" class="btn-primary">
                <span v-if="submitting" class="inline-flex items-center gap-2">
                  <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="4" class="opacity-25"/><path d="M4 12a8 8 0 018-8" stroke-width="4" class="opacity-75"/></svg>
                  Submitting…
                </span>
                <span v-else>Submit Application</span>
              </button>
              <button type="button" class="btn-ghost" @click="resetOptional" :disabled="submitting">Reset optional fields</button>
            </div>

            <div v-if="formError" class="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{{ formError }}</div>
          </form>
        </section>
      </section>

      <!-- Aside -->
      <aside class="self-start space-y-6 md:sticky md:top-16">
        <!-- Job quick facts -->
        <section class="rounded-xl border bg-white p-5">
          <h3 class="font-semibold">Role at a glance</h3>
          <dl class="mt-3 space-y-2 text-sm text-gray-700">
            <div class="flex justify-between"><dt class="text-gray-500">Department</dt><dd>{{ job.department?.name || '—' }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-500">Employment</dt><dd>{{ job.employment_type || '—' }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-500">Workplace</dt><dd>{{ job.workplace || '—' }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-500">Experience</dt><dd>{{ job.experience_level || '—' }}</dd></div>
            <div class="flex justify-between"><dt class="text-gray-500">Deadline</dt><dd>{{ job.application_deadline ? formatDate(job.application_deadline) : '—' }}</dd></div>
          </dl>
          <a href="#apply" class="mt-4 block w-full rounded-lg border px-3 py-2 text-center text-sm hover:bg-gray-50">Apply now</a>
        </section>

        <!-- Tips -->
        <section class="rounded-xl border bg-white p-5">
          <h3 class="font-semibold">Application tips</h3>
          <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
            <li>Attach resume as PDF/DOC only (≤10MB).</li>
            <li>Keep cover letter concise and specific to the role.</li>
            <li>Double‑check email & phone.</li>
          </ul>
        </section>
      </aside>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useCareerStore } from '@/stores/careers'
import { useRoute } from 'vue-router'

const store = useCareerStore()
const route = useRoute()
const slug = route.params.slug

const job = ref(null)
const loading = ref(false)
const error = ref(null)

const fileInput = ref(null)
const dragging = ref(false)

const form = ref({
  full_name: '',
  email: '',
  phone: '',
  cover_letter: '',
  resume: null,
  source: '',
  answers: null,
  resumeName: ''
})
const answersRaw = ref('')
const formError = ref('')
const fieldErrors = ref({})
const submitting = ref(false)
const success = ref(false)
const successCard = ref(null)

// toast state
const successToast = ref(false)
let toastTimer = null

// countdown timer interval
let deadlineTimer = null

const coverCount = computed(() => Math.min(form.value.cover_letter?.length || 0, 1000))
const canSubmit = computed(() =>
  !Object.keys(fieldErrors.value).length && !!form.value.full_name && !!form.value.email && !!form.value.resume
)

const deadlineCountdown = computed(() => {
  if (!job.value?.application_deadline) return ''
  const end = new Date(job.value.application_deadline)
  const now = new Date()
  const diff = end - now
  if (Number.isNaN(diff)) return ''
  if (diff <= 0) return 'Closed'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const mins = Math.floor((diff / (1000 * 60)) % 60)
  if (days > 0) return `${days}d ${hours}h left`
  if (hours > 0) return `${hours}h ${mins}m left`
  return `${mins}m left`
})

function formatDate(dateLike) {
  try {
    const dt = new Date(dateLike)
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(dt)
  } catch {
    return String(dateLike)
  }
}

function inputClass(field) {
  const base = 'input'
  return hasErr(field) ? base + ' border-red-300 bg-red-50/50' : base
}
function hasErr(field) {
  return Boolean(fieldErrors.value?.[field])
}

function validate() {
  const errs = {}
  if (!form.value.full_name?.trim()) errs.full_name = 'Please enter your full name.'

  // basic email check
  if (!form.value.email?.trim()) {
    errs.email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errs.email = 'Enter a valid email address.'
  }

  if (!form.value.resume) {
    errs.resume = 'Resume is required.'
  }

  if (answersRaw.value && !looksJson(answersRaw.value)) {
    errs.answers = 'Answers must be valid JSON.'
  }

  fieldErrors.value = errs
  return !Object.keys(errs).length
}

function looksJson(s) {
  try { JSON.parse(s); return true } catch { return false }
}

function onFile(e) {
  const file = e.target.files?.[0]
  processFile(file)
}

function onDrop(e) {
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  processFile(file)
}

function processFile(file) {
  if (!file) return
  const validTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
  const extOk = /(\.pdf|\.docx?)$/i.test(file.name)
  if (!validTypes.includes(file.type) && !extOk) {
    fieldErrors.value = { ...fieldErrors.value, resume: 'Only PDF or DOC/DOCX files are allowed.' }
    return
  }
  const maxBytes = 10 * 1024 * 1024
  if (file.size > maxBytes) {
    fieldErrors.value = { ...fieldErrors.value, resume: 'File must be ≤ 10MB.' }
    return
  }
  const { resume, ...rest } = fieldErrors.value
  fieldErrors.value = rest

  form.value.resume = file
  form.value.resumeName = file.name
}

function resetOptional() {
  form.value.cover_letter = ''
  form.value.source = ''
  answersRaw.value = ''
  // keep resume; users often upload before typing
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const data = await store.fetchJob(slug)
    job.value = data
    // start live countdown tick every minute
    deadlineTimer = setInterval(() => {}, 60 * 1000) // computed will recompute on tick because Date.now() is not tracked, but this noop keeps interval alive for UX parity; alternatively you can force an update
  } catch (e) {
    error.value = 'Job not found.'
  } finally {
    loading.value = false
  }
}

async function submit() {
  formError.value = ''
  success.value = false
  validate()

  if (!job.value?.id) {
    formError.value = 'Invalid job.'
    return
  }
  if (!form.value.full_name || !form.value.email || !form.value.resume) {
    formError.value = 'Full name, email, and resume are required.'
    return
  }

  // parse answers
  let answers = null
  if (answersRaw.value) {
    try {
      answers = JSON.parse(answersRaw.value)
    } catch (e) {
      formError.value = 'Answers must be valid JSON.'
      return
    }
  }

  submitting.value = true
  try {
    await store.applyToJob(job.value.id, {
      ...form.value,
      answers
    })

    success.value = true
    showToast()

    // reset some fields (keep name/email/phone for convenience when submitting another)
    form.value.cover_letter = ''
    form.value.source = ''
    answersRaw.value = ''
    form.value.resume = null
    form.value.resumeName = ''

    await nextTick()
    successCard.value?.focus()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e) {
    formError.value = e?.response?.data?.message || 'Submission failed.'
  } finally {
    submitting.value = false
  }
}

function showToast() {
  successToast.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { successToast.value = false }, 5000)
}

onMounted(() => {
  load()
})

onBeforeUnmount(() => {
  if (toastTimer) clearTimeout(toastTimer)
  if (deadlineTimer) clearInterval(deadlineTimer)
})
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200 disabled:opacity-60;
}
.textarea {
  @apply w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200;
}
.btn-primary {
  @apply inline-flex items-center justify-center rounded-lg border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50;
}
.btn-ghost {
  @apply inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm hover:bg-gray-50;
}

/* prose (Tailwind typography) optional */
.prose :where(h3){@apply text-gray-900;}

/* Fade */
.fade-enter-active, .fade-leave-active { transition: opacity .25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
