<script setup>
/**
 * Job Create/Edit — Clean version
 * - Composition API
 * - No external deps
 * - SSR-safe window/router guards
 * - Proper cleanup
 * - A11y labels + aria-invalid
 */

defineOptions({ name: 'AdminCareersJobForm' })

import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAdminCareersStore } from '@/stores/adminCareers'
import { useDepartmentStore } from '@/stores/department'
import SkillsSelect from '@/components/SkillsSelect.vue'
import TextEditor from '@/components/TextEditor.vue'
import { fetchSkills, createSkill, skillsByIds } from '@/services/skills'

// -------- stores --------
const route = useRoute()
const router = useRouter()
const careers = useAdminCareersStore()
const departmentStore = useDepartmentStore()
const { departments } = storeToRefs(departmentStore)

// -------- constants & helpers --------
const EMPLOYMENT_LABELS = Object.freeze({
  full_time: 'Full-time', part_time: 'Part-time', contract: 'Contract',
  internship: 'Internship', temporary: 'Temporary'
})
const numberFmt = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })

const cap = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, m => m.toUpperCase())
const labelForEmployment = v => EMPLOYMENT_LABELS[v] ?? cap(v)
const stripHtml = (html) => html ? String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : ''
const countWords = (htmlOrText) => {
  const t = stripHtml(htmlOrText)
  return t ? (t.match(/\b[\w’'-]+\b/g) || []).length : 0
}
const countBullets = (html) => {
  if (!html) return 0
  const li = (html.match(/<li[\s>]/gi) || []).length
  const lines = stripHtml(html).split(/\n/).filter(Boolean)
  const pref = lines.filter(l => /^\s*[-*•]/.test(l)).length
  return Math.max(li, pref)
}
const daysUntil = (dateStr) => {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d)) return null
  const now = new Date()
  const ms = d.setHours(0,0,0,0) - now.setHours(0,0,0,0)
  return Math.ceil(ms / 86400000)
}
const looksSeoSlug = (s) => !!s && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)

const isEdit = computed(() => !!route.params.id)

// -------- state --------
const form = ref({
  title: '', slug: '', department_id: null,
  location: '', employment_type: 'full_time', workplace: 'onsite',
  experience_level: '', min_experience_years: null, max_experience_years: null,
  vacancies: 1, working_days: null, working_hours: '',
  salary_currency: 'BDT', salary_min: null, salary_max: null, salary_period: 'monthly', salary_visible: true,
  summary: '', responsibilities: '', requirements: '', benefits: '', application_process: '',
  application_deadline: null, status: 'draft', visibility: 'public', posted_at: null, published_at: null, seo: null,
  skill_ids: []
})

const selectedSkills = ref([])        // [{ id, name }]
const saving = ref(false)
const errors = ref({})
const dirty = ref(false)

const slugTouched = ref(false)



// -------- derived --------
const salaryPretty = computed(() => {
  if (!form.value.salary_visible) return 'Hidden'
  const cur = (form.value.salary_currency || 'BDT').toUpperCase()
  const min = form.value.salary_min
  const max = form.value.salary_max
  const per = form.value.salary_period || 'period'
  if (min != null && max != null) return `${cur} ${numberFmt.format(min)}–${numberFmt.format(max)} / ${per}`
  if (min != null) return `${cur} ${numberFmt.format(min)}+ / ${per}`
  if (max != null) return `Up to ${cur} ${numberFmt.format(max)} / ${per}`
  return 'Negotiable'
})

const metaChips = computed(() => {
  const chips = []
  if (form.value.employment_type) chips.push(labelForEmployment(form.value.employment_type))
  if (form.value.workplace) chips.push(cap(form.value.workplace))
  if (form.value.location) chips.push(form.value.location)
  if (form.value.experience_level) chips.push(cap(form.value.experience_level))
  return chips
})

// -------- publish readiness --------
const publishChecklist = computed(() => {
  const lacks = []
  if (!form.value.title?.trim()) lacks.push('Title')
  if (!form.value.department_id) lacks.push('Department')
  if (!stripHtml(form.value.summary)) lacks.push('Summary')
  return lacks
})
const canPublish = computed(() => publishChecklist.value.length === 0)

// -------- smart tips / quality --------
const smartTips = computed(() => {
  const tips = []
  const tl = (form.value.title || '').trim()

  if (!tl) tips.push({ type: 'error', text: 'Add a clear job title.' })
  else {
    if (tl.length > 70) tips.push({ type: 'warn', text: 'Title seems long (>70 chars). Shorten for scan-ability.' })
    if (!/developer|engineer|designer|manager|officer|lead|intern/i.test(tl))
      tips.push({ type: 'hint', text: 'Consider a standard role keyword (e.g., “Developer”, “Manager”) for searchability.' })
  }

  if (!looksSeoSlug(form.value.slug))
    tips.push({ type: 'hint', text: 'Use an SEO-friendly slug like "senior-frontend-developer-dhaka".' })

  if (!form.value.department_id)
    tips.push({ type: 'error', text: 'Select a department.' })

  if (!form.value.location)
    tips.push({ type: 'hint', text: 'Set a specific location or “Remote/Hybrid”.' })

  if (countWords(form.value.summary) < 40)
    tips.push({ type: 'hint', text: 'Add a summary (~60–120 words) describing mission/impact.' })

  const respBullets = countBullets(form.value.responsibilities)
  const reqBullets  = countBullets(form.value.requirements)
  if (respBullets > 10) tips.push({ type: 'warn', text: 'Responsibilities exceed 10 bullets. Aim for 6–8.' })
  if (reqBullets  > 10) tips.push({ type: 'warn', text: 'Requirements exceed 10 bullets. Aim for 6–8.' })

  const k = selectedSkills.value?.length || 0
  if (k === 0) tips.push({ type: 'hint', text: 'Add 5–10 top skills to improve matches.' })
  else if (k > 15) tips.push({ type: 'warn', text: 'Too many skills selected. Focus on 5–10.' })

  const minY = Number(form.value.min_experience_years ?? NaN)
  const maxY = Number(form.value.max_experience_years ?? NaN)
  if (!Number.isNaN(minY) && !Number.isNaN(maxY) && minY > maxY)
    tips.push({ type: 'error', text: 'Min experience cannot exceed Max.' })

  if (!form.value.salary_visible)
    tips.push({ type: 'hint', text: 'Showing salary often increases apply rate.' })
  if (form.value.salary_min != null && form.value.salary_min < 0)
    tips.push({ type: 'error', text: 'Salary Min must be ≥ 0.' })
  if (form.value.salary_max != null && form.value.salary_max < 0)
    tips.push({ type: 'error', text: 'Salary Max must be ≥ 0.' })
  if (form.value.salary_min != null && form.value.salary_max != null &&
      Number(form.value.salary_min) > Number(form.value.salary_max))
    tips.push({ type: 'error', text: 'Salary Min cannot exceed Max.' })

  const d = daysUntil(form.value.application_deadline)
  if (d == null) tips.push({ type: 'hint', text: 'Set an application deadline to create urgency.' })
  else if (d < 0) tips.push({ type: 'warn', text: 'Deadline is in the past. Update it.' })
  else if (d < 7) tips.push({ type: 'hint', text: 'Very short deadline (<7 days). Consider extending.' })

  if (countWords(form.value.benefits) < 10)
    tips.push({ type: 'hint', text: 'List 3–6 tangible benefits (leave, insurance, WFH, learning budget).' })
  if (countWords(form.value.application_process) < 5)
    tips.push({ type: 'hint', text: 'Describe the process (e.g., screening → interview → task → final).' })

  return tips
})

const qualityScore = computed(() => {
  let score = 100
  for (const t of smartTips.value) {
    if (t.type === 'error') score -= 15
    else if (t.type === 'warn') score -= 8
    else if (t.type === 'hint') score -= 4
  }
  return Math.max(0, Math.min(100, score))
})

// -------- effects (fetch/init) --------
onMounted(async () => {
  try {
    await departmentStore.fetchDepartments()

    if (isEdit.value) {
      const id = String(route.params.id)
      let row = careers.jobs?.find?.(j => String(j.id) === id)

      // Prefer a single fetch if available
      if (!row && careers.fetchJobById) {
        row = await careers.fetchJobById(id)
      }

      // Fallback to list fetch (last resort)
      if (!row) {
        await careers.fetchJobs?.({ per_page: 200 })
        row = careers.jobs?.find?.(j => String(j.id) === id)
      }

      if (row) {
        Object.assign(form.value, { ...row })
        const ids = (row.skills?.map(s => s.id) || row.skill_ids || [])
        selectedSkills.value = ids.length ? await skillsByIds(ids) : []
        dirty.value = false
      }
    }
  } catch (e) {
    console.error(e)
    // keep UI usable without crashing
  }

  // add listeners (SSR-safe — only in mounted)
  window.addEventListener('beforeunload', beforeUnload)
  window.addEventListener('keydown', onKeydown)

  // router guard
  removeRouterGuard = router.beforeEach((to, from, next) => {
    if (!dirty.value) return next()
    const ok = window.confirm('You have unsaved changes. Leave this page?')
    if (ok) { dirty.value = false; next() } else { next(false) }
  })
})

// -------- validation --------
function validate () {
  const e = {}
  if (!form.value.title?.trim()) e.title = 'Title is required'
  if (!form.value.department_id) e.department_id = 'Select a department'

  const smin = form.value.salary_min
  const smax = form.value.salary_max
  if (smin != null && smin < 0) e.salary_min = 'Must be ≥ 0'
  if (smax != null && smax < 0) e.salary_max = 'Must be ≥ 0'
  if (smin != null && smax != null && Number(smin) > Number(smax)) e.salary_range = 'Min cannot exceed Max'

  const emin = form.value.min_experience_years
  const emax = form.value.max_experience_years
  if (emin != null && emax != null && Number(emin) > Number(emax)) e.exp_range = 'Min exp cannot exceed Max'

  errors.value = e
  return Object.keys(e).length === 0
}

// -------- save --------
async function save (publish = false) {
  if (publish) form.value.status = 'published'
  if (!validate()) return

  try {
    saving.value = true
    form.value.skill_ids = selectedSkills.value.map(s => s.id)

    const payload = { ...form.value }
    if (!isEdit.value) await careers.createJob(payload)
    else await careers.updateJob(route.params.id, payload)

    dirty.value = false
    router.replace({ name: 'AdminCareersJobs' })
  } catch (err) {
    console.error(err)
    alert('Failed to save. Please try again.')
  } finally {
    saving.value = false
  }
}

// -------- QoL: slug, dirty, hotkeys/guards --------
watch(() => form.value.slug, () => { slugTouched.value = true })
watch(() => form.value.title, (t) => {
  if (!slugTouched.value && !isEdit.value) {
    form.value.slug = String(t || '')
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }
})
watch(form, () => { dirty.value = true }, { deep: true })

function beforeUnload (e) {
  if (dirty.value) { e.preventDefault(); e.returnValue = '' }
}
function onKeydown (e) {
  const isSave = (e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 's'
  if (isSave) { e.preventDefault(); save(false) }
}

let removeRouterGuard = null
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnload)
  window.removeEventListener('keydown', onKeydown)
  if (typeof removeRouterGuard === 'function') removeRouterGuard()
})
</script>

<template>
  <div class="container mx-auto min-h-screen bg-gradient-to-b from-white to-gray-50 print:bg-white">
    <div class="container mx-auto w-full print:max-w-full">
      <!-- Sticky Header -->
      <div class="sticky top-14 z-50 -mx-4 border-b rounded-md bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div class="mx-auto max-w-6xl px-4">
          <div class="flex items-center justify-between py-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">💼</span>
                <h1 class="truncate text-xl font-semibold md:text-2xl">
                  {{ isEdit ? 'Edit Job' : 'Create Job' }}
                </h1>
              </div>
              <p class="mt-0.5 text-xs text-gray-500">Craft a clear, inclusive, and scannable posting.</p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <router-link
                :to="{ name:'AdminCareersJobs' }"
                class="group inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-gray-700 hover:bg-gray-50"
                title="Back to list"
              >
                <span class="opacity-70 group-hover:opacity-100">Cancel</span>
              </router-link>

              <button
                @click="save(false)"
                :disabled="saving"
                class="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-3 py-2 text-white shadow-sm transition hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
                title="Ctrl/Cmd + S"
              >
                <svg v-if="saving" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
                <span>{{ saving ? 'Saving…' : 'Save Draft' }}</span>
              </button>

              <button
                @click="save(true)"
                :disabled="saving || !canPublish"
                class="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>Publish</span>
                <span v-if="publishChecklist.length" class="rounded-md bg-white/20 px-1.5 py-0.5 text-[11px] leading-none">
                  {{ publishChecklist.length }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Grid -->
      <div class="relative mx-auto grid min-h-[50vh] grid-cols-1 gap-6 mt-4 px-4 lg:grid-cols-[1fr_22rem]">
        <!-- Left: Form -->
        <div class="grid gap-6" role="form" aria-labelledby="basic-info">
          <!-- Basic Info -->
          <section class="card" id="basic-info">
            <div class="section-head">
              <h2 class="section-title">Basic Info</h2>
              <p class="section-sub">Title, department, location.</p>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="label" for="title">Title <span class="text-rose-500">*</span></label>
                <input
                  id="title"
                  v-model="form.title"
                  class="input"
                  :class="errors.title && 'input-error'"
                  :aria-invalid="!!errors.title"
                  placeholder="e.g., Senior Frontend Engineer"
                />
                <p v-if="errors.title" class="error">{{ errors.title }}</p>
              </div>
              <div>
                <label class="label" for="slug">Slug</label>
                <input
                  id="slug"
                  v-model="form.slug"
                  class="input"
                  placeholder="auto or custom (e.g., senior-frontend-engineer)"
                />
              </div>
            </div>

            <div class="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label class="label" for="department">Department <span class="text-rose-500">*</span></label>
                <select
                  id="department"
                  v-model="form.department_id"
                  class="input"
                  :class="errors.department_id && 'input-error'"
                  :aria-invalid="!!errors.department_id"
                >
                  <option :value="null">— Select —</option>
                  <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
                </select>
                <p v-if="errors.department_id" class="error">{{ errors.department_id }}</p>
              </div>
              <div>
                <label class="label" for="location">Location</label>
                <input id="location" v-model="form.location" class="input" placeholder="e.g., Mirpur DOHS / Remote" />
              </div>
              <div>
                <label class="label" for="exp-level">Experience Level</label>
                <select id="exp-level" v-model="form.experience_level" class="input">
                  <option value="">—</option>
                  <option value="junior">Junior</option>
                  <option value="mid">Mid</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead</option>
                </select>
              </div>
            </div>
          </section>

          <!-- Compensation & Time -->
          <section class="card">
            <div class="section-head">
              <h2 class="section-title">Compensation & Time</h2>
              <p class="section-sub">Salary range, currency, work schedule.</p>
            </div>

            <div class="grid gap-4 md:grid-cols-4">
              <div>
                <label class="label" for="salary-min">Salary Min</label>
                <div class="mt-1 flex overflow-hidden rounded-xl border focus-within:ring-2 focus-within:ring-indigo-200">
                  <span class="inline-flex items-center border-r px-2 text-xs text-gray-500">
                    {{ (form.salary_currency || 'BDT').toUpperCase() }}
                  </span>
                  <input
                    id="salary-min"
                    type="number"
                    v-model.number="form.salary_min"
                    class="flex-1 px-3 py-2 outline-none"
                    :class="errors.salary_min && 'ring-1 ring-rose-400'"
                    :aria-invalid="!!errors.salary_min"
                    min="0"
                    placeholder="0"
                  />
                </div>
                <p v-if="errors.salary_min" class="error">{{ errors.salary_min }}</p>
              </div>

              <div>
                <label class="label" for="salary-max">Salary Max</label>
                <div class="mt-1 flex overflow-hidden rounded-xl border focus-within:ring-2 focus-within:ring-indigo-200">
                  <span class="inline-flex items-center border-r px-2 text-xs text-gray-500">
                    {{ (form.salary_currency || 'BDT').toUpperCase() }}
                  </span>
                  <input
                    id="salary-max"
                    type="number"
                    v-model.number="form.salary_max"
                    class="flex-1 px-3 py-2 outline-none"
                    :class="errors.salary_max && 'ring-1 ring-rose-400'"
                    :aria-invalid="!!errors.salary_max"
                    min="0"
                    placeholder="0"
                  />
                </div>
                <p v-if="errors.salary_max" class="error">{{ errors.salary_max }}</p>
              </div>

              <div>
                <label class="label" for="currency">Currency</label>
                <input id="currency" v-model="form.salary_currency" maxlength="3" class="input uppercase" placeholder="BDT" />
              </div>

              <div>
                <label class="label" for="period">Period</label>
                <select id="period" v-model="form.salary_period" class="input">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="hourly">Hourly</option>
                </select>
              </div>
            </div>

            <div class="mt-4 grid gap-4 md:grid-cols-3">
              <label class="mt-1 inline-flex items-center gap-2" for="salary-visible">
                <input id="salary-visible" type="checkbox" v-model="form.salary_visible" class="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                <span class="text-sm text-gray-700">Show salary on the post</span>
              </label>
              <div>
                <label class="label" for="min-exp">Min Exp (years)</label>
                <input id="min-exp" type="number" v-model.number="form.min_experience_years" min="0" class="input" placeholder="0" />
              </div>
              <div>
                <label class="label" for="max-exp">Max Exp (years)</label>
                <input id="max-exp" type="number" v-model.number="form.max_experience_years" min="0" class="input" placeholder="0" />
              </div>
            </div>

            <p v-if="errors.salary_range || errors.exp_range" class="mt-2 text-xs text-rose-600">
              {{ errors.salary_range || errors.exp_range }}
            </p>

            <div class="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label class="label" for="vacancies">Vacancies</label>
                <input id="vacancies" type="number" v-model.number="form.vacancies" min="1" class="input" />
              </div>
              <div>
                <label class="label" for="deadline">Application Deadline</label>
                <input id="deadline" type="date" v-model="form.application_deadline" class="input" />
              </div>
              <div>
                <label class="label" for="working-hours">Working Hours</label>
                <input id="working-hours" v-model="form.working_hours" class="input" placeholder="e.g., 10am–6pm (BST)" />
              </div>
            </div>
          </section>

          <!-- Descriptions -->
          <section class="card">
            <div class="section-head">
              <h2 class="section-title">Descriptions</h2>
              <p class="section-sub">Use short paragraphs and bullet points.</p>
            </div>

            <div class="grid gap-4">
              <div>
                <label class="label" for="summary">Summary</label>
                <TextEditor id="summary" v-model="form.summary" />
              </div>
              <div>
                <label class="label" for="responsibilities">Responsibilities</label>
                <TextEditor id="responsibilities" v-model="form.responsibilities" />
              </div>
              <div>
                <label class="label" for="requirements">Requirements</label>
                <TextEditor id="requirements" v-model="form.requirements" />
              </div>
              <div>
                <label class="label" for="benefits">Benefits</label>
                <TextEditor id="benefits" v-model="form.benefits" />
              </div>
              <div>
                <label class="label" for="process">Application Process</label>
                <TextEditor id="process" v-model="form.application_process" />
              </div>
            </div>
          </section>

          <!-- Skills -->
          <section class="card">
            <div class="mb-3">
              <h2 class="section-title">Skills</h2>
              <p class="section-sub">Type to search, Enter to add. Paste comma separated to bulk add.</p>
            </div>
            <SkillsSelect v-model="selectedSkills" :fetcher="fetchSkills" :creator="createSkill" :max="20" />
            <div class="mt-2 text-xs text-gray-500">
              {{ selectedSkills.length }} / 20 selected
            </div>
          </section>

          <!-- Visibility -->
          <section class="card">
            <div class="section-head">
              <h2 class="section-title">Visibility</h2>
              <p class="section-sub">Control who can view and the current status.</p>
            </div>

            <div class="grid gap-4 md:grid-cols-3">
              <div>
                <label class="label" for="status">Status</label>
                <select id="status" v-model="form.status" class="input">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label class="label" for="visibility">Visibility</label>
                <select id="visibility" v-model="form.visibility" class="input">
                  <option value="public">Public</option>
                  <option value="internal">Internal</option>
                </select>
              </div>
              <div>
                <label class="label" for="workplace">Workplace</label>
                <select id="workplace" v-model="form.workplace" class="input">
                  <option value="onsite">Onsite</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        <!-- Right: Preview / Tips -->
        <aside class="sticky top-[72px] z-30 self-start space-y-6 lg:top-[76px]">
          <!-- Preview -->
          <section class="card overflow-hidden" aria-labelledby="preview-title">
            <div class="border-b px-4 py-3">
              <h3 id="preview-title" class="font-medium">Preview</h3>
              <p class="text-xs text-gray-500">How candidates will see it.</p>
            </div>
            <div class="space-y-2 p-4">
              <h4 class="text-lg font-semibold">{{ form.title || 'Job title' }}</h4>

              <div class="flex flex-wrap gap-1">
                <span v-for="c in metaChips" :key="c" class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                  {{ c }}
                </span>
                <span v-if="!form.salary_visible" class="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                  Salary hidden
                </span>
              </div>

              <div class="text-sm text-gray-600">Salary: {{ salaryPretty }}</div>
              <div class="text-xs text-gray-500" v-if="form.application_deadline">
                Deadline: {{ new Date(form.application_deadline).toLocaleDateString() }}
              </div>

              <div class="pt-2">
                <div class="mb-1 text-xs text-gray-500">Top skills</div>
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="s in selectedSkills"
                    :key="s.id"
                    class="rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
                  >
                    {{ s.name }}
                  </span>
                  <span v-if="!selectedSkills.length" class="text-xs text-gray-400">No skills added</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Quality & Tips -->
          <section class="card">
            <div class="border-b px-4 py-3">
              <div class="flex items-center justify-between">
                <h3 class="font-medium">Quality & Tips</h3>
                <div
                  class="rounded-full px-2 py-0.5 text-xs"
                  :class="qualityScore>=80 ? 'bg-green-100 text-green-700' : qualityScore>=60 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-700'"
                >
                  {{ qualityScore }} / 100
                </div>
              </div>
            </div>

            <ul class="space-y-1 p-4 text-sm">
              <li
                v-for="(t, i) in (smartTips.length ? smartTips : [
                  { type:'hint', text:'Add a short summary (≈60–120 words).' },
                  { type:'hint', text:'List 3–6 key responsibilities.' }
                ])"
                :key="i"
                class="flex items-start gap-2"
              >
                <span
                  class="mt-0.5 inline-flex h-2.5 w-2.5 shrink-0 rounded-full"
                  :class="t.type==='error' ? 'bg-rose-500' : t.type==='warn' ? 'bg-amber-500' : 'bg-gray-400'"
                />
                <span class="text-gray-700">{{ t.text }}</span>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card { @apply rounded-2xl border bg-white shadow-sm p-3; }
.section-head { @apply mb-4 flex items-start justify-between; }
.section-title { @apply text-lg font-semibold; }
.section-sub { @apply text-xs text-gray-500; }
.label { @apply text-sm text-gray-700; }
.input {
  @apply mt-1 w-full rounded-xl border px-3 py-2 outline-none transition
         placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-200;
}
.input-error { @apply ring-1 ring-rose-400; }
.error { @apply mt-1 text-xs text-rose-600; }
</style>
