<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminCareersStore } from '@/stores/adminCareers'
import { useDepartmentStore } from '@/stores/department'
import { storeToRefs } from 'pinia'
import SkillsSelect from '@/components/SkillsSelect.vue'
import TextEditor from '@/components/TextEditor.vue'
import { fetchSkills, createSkill, skillsByIds } from '@/services/skills'

const route = useRoute()
const router = useRouter()
const store = useAdminCareersStore()
const departmentStore = useDepartmentStore()
const { departments } = storeToRefs(departmentStore)

const isEdit = computed(() => !!route.params.id)

/* ---------------- State ---------------- */
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

const selectedSkills = ref([]) // [{id,name}]
const saving = ref(false)
const errors = ref({})

/* ---------------- Derived ---------------- */
const salaryPretty = computed(() => {
  const cur = (form.value.salary_currency || '').toUpperCase()
  const min = form.value.salary_min, max = form.value.salary_max
  if(!form.value.salary_visible) return 'Hidden'
  if(min && max) return `${cur} ${Intl.NumberFormat().format(min)}–${Intl.NumberFormat().format(max)} / ${form.value.salary_period || 'period'}`
  if(min) return `${cur} ${Intl.NumberFormat().format(min)}+ / ${form.value.salary_period || 'period'}`
  if(max) return `Up to ${cur} ${Intl.NumberFormat().format(max)} / ${form.value.salary_period || 'period'}`
  return 'Negotiable'
})

const metaChips = computed(() => {
  const chips = []
  if(form.value.employment_type) chips.push(labelForEmployment(form.value.employment_type))
  if(form.value.workplace) chips.push(cap(form.value.workplace))
  if(form.value.location) chips.push(form.value.location)
  if(form.value.experience_level) chips.push(cap(form.value.experience_level))
  return chips
})

function labelForEmployment(v){
  const map = { full_time:'Full‑time', part_time:'Part‑time', contract:'Contract', internship:'Internship', temporary:'Temporary' }
  return map[v] || cap(v)
}
function cap(s){ return String(s||'').replace(/_/g,' ').replace(/\b\w/g,m=>m.toUpperCase()) }

/* ---------------- Effects ---------------- */
onMounted(async ()=>{
  departmentStore.fetchDepartments()
  if(isEdit.value){
    await store.fetchJobs({ per_page: 9999 })
    const row = store.jobs.find(j=> String(j.id)===String(route.params.id))
    if(row){
      Object.assign(form.value, {...row})
      const ids = (row.skills?.map(s=>s.id) || row.skill_ids || [])
      selectedSkills.value = ids.length ? await skillsByIds(ids) : []
    }
  }
})

/* ---------------- Validation ---------------- */
function validate(){
  const e = {}
  if(!form.value.title?.trim()) e.title = 'Title is required'
  if(!form.value.department_id) e.department_id = 'Select a department'
  if(form.value.salary_min != null && form.value.salary_min < 0) e.salary_min = 'Must be ≥ 0'
  if(form.value.salary_max != null && form.value.salary_max < 0) e.salary_max = 'Must be ≥ 0'
  if(form.value.salary_min != null && form.value.salary_max != null && Number(form.value.salary_min) > Number(form.value.salary_max)) e.salary_range = 'Min cannot exceed Max'
  if(form.value.min_experience_years != null && form.value.max_experience_years != null && Number(form.value.min_experience_years) > Number(form.value.max_experience_years)) e.exp_range = 'Min exp cannot exceed Max'
  errors.value = e
  return Object.keys(e).length===0
}

/* ---------------- Save ---------------- */
async function save(publish = false){
  if(publish) form.value.status = 'published'
  if(!validate()) return
  try{
    saving.value = true
    form.value.skill_ids = selectedSkills.value.map(s=> s.id)
    const payload = { ...form.value }
    if(!isEdit.value) await store.createJob(payload)
    else await store.updateJob(route.params.id, payload)
    router.replace({ name:'AdminCareersJobs' })
  }catch(err){ alert('Failed to save') }
  finally{ saving.value = false }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/40 print:bg-white">
    <div class="container mx-auto w-full print:max-w-full">
      <!-- Sticky Header (window scroll) -->
      <div class="sticky top-14 z-40 -mx-4 mb-5 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b">
        <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 class="text-xl md:text-2xl font-semibold">{{ isEdit ? 'Edit Job' : 'Create Job' }}</h1>
            <p class="text-xs text-gray-500 mt-0.5">Craft a clear, inclusive, and scannable posting.</p>
          </div>
          <div class="flex gap-2">
            <router-link :to="{ name:'AdminCareersJobs' }" class="px-3 py-2 rounded-lg border">Cancel</router-link>
            <button @click="save(false)" :disabled="saving" class="px-3 py-2 rounded-lg bg-gray-900 text-white">{{ saving ? 'Saving…' : 'Save Draft' }}</button>
            <button @click="save(true)" :disabled="saving" class="px-3 py-2 rounded-lg bg-indigo-600 text-white">Publish</button>
          </div>
        </div>
      </div>

      <!-- Grid (no overflow on parents) -->
      <div class="max-w-6xl mx-auto px-4 relative min-h-[50vh] grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-6">
        <!-- Left: Form -->
        <div class="grid gap-6">
          <!-- Basic Info -->
          <section class="bg-white border rounded-2xl p-5 shadow-sm">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h2 class="text-lg font-semibold">Basic Info</h2>
                <p class="text-xs text-gray-500">Title, department, location.</p>
              </div>
            </div>

            <div class="grid md:grid-cols-2 gap-4">
              <div>
                <label class="text-sm text-gray-700">Title <span class="text-rose-500">*</span></label>
                <input v-model="form.title" class="mt-1 border rounded-xl w-full px-3 py-2 focus:ring focus:ring-indigo-200" :class="errors.title && 'border-rose-400'" />
                <p v-if="errors.title" class="text-xs text-rose-600 mt-1">{{ errors.title }}</p>
              </div>
              <div>
                <label class="text-sm text-gray-700">Slug</label>
                <input v-model="form.slug" class="mt-1 border rounded-xl w-full px-3 py-2" placeholder="auto or custom" />
              </div>
            </div>

            <div class="grid md:grid-cols-3 gap-4 mt-4">
              <div>
                <label class="text-sm text-gray-700">Department <span class="text-rose-500">*</span></label>
                <select v-model="form.department_id" class="mt-1 border rounded-xl w-full px-3 py-2" :class="errors.department_id && 'border-rose-400'">
                  <option :value="null">— Select —</option>
                  <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
                </select>
                <p v-if="errors.department_id" class="text-xs text-rose-600 mt-1">{{ errors.department_id }}</p>
              </div>
              <div>
                <label class="text-sm text-gray-700">Location</label>
                <input v-model="form.location" class="mt-1 border rounded-xl w-full px-3 py-2" placeholder="e.g., Mirpur DOHS / Remote" />
              </div>
              <div>
                <label class="text-sm text-gray-700">Experience Level</label>
                <select v-model="form.experience_level" class="mt-1 border rounded-xl w-full px-3 py-2">
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
          <section class="bg-white border rounded-2xl p-5 shadow-sm">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h2 class="text-lg font-semibold">Compensation & Time</h2>
                <p class="text-xs text-gray-500">Salary range, currency, work schedule.</p>
              </div>
            </div>

            <div class="grid md:grid-cols-4 gap-4">
              <div>
                <label class="text-sm text-gray-700">Salary Min</label>
                <div class="mt-1 flex rounded-xl border overflow-hidden">
                  <span class="px-2 inline-flex items-center text-xs text-gray-500 border-r">{{ (form.salary_currency || 'BDT').toUpperCase() }}</span>
                  <input type="number" v-model.number="form.salary_min" class="flex-1 px-3 py-2 outline-none" :class="errors.salary_min && 'ring-1 ring-rose-400'" min="0" />
                </div>
                <p v-if="errors.salary_min" class="text-xs text-rose-600 mt-1">{{ errors.salary_min }}</p>
              </div>
              <div>
                <label class="text-sm text-gray-700">Salary Max</label>
                <div class="mt-1 flex rounded-xl border overflow-hidden">
                  <span class="px-2 inline-flex items-center text-xs text-gray-500 border-r">{{ (form.salary_currency || 'BDT').toUpperCase() }}</span>
                  <input type="number" v-model.number="form.salary_max" class="flex-1 px-3 py-2 outline-none" :class="errors.salary_max && 'ring-1 ring-rose-400'" min="0" />
                </div>
                <p v-if="errors.salary_max" class="text-xs text-rose-600 mt-1">{{ errors.salary_max }}</p>
              </div>
              <div>
                <label class="text-sm text-gray-700">Currency</label>
                <input v-model="form.salary_currency" maxlength="3" class="mt-1 border rounded-xl w-full px-3 py-2 uppercase" />
              </div>
              <div>
                <label class="text-sm text-gray-700">Period</label>
                <select v-model="form.salary_period" class="mt-1 border rounded-xl w-full px-3 py-2">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="hourly">Hourly</option>
                </select>
              </div>
            </div>

            <div class="grid md:grid-cols-3 gap-4 mt-4">
              <div class="flex items-center gap-2 mt-1">
                <input id="salary_visible" type="checkbox" v-model="form.salary_visible" />
                <label for="salary_visible" class="text-sm text-gray-700">Show salary on the post</label>
              </div>
              <div>
                <label class="text-sm text-gray-700">Min Exp (years)</label>
                <input type="number" v-model.number="form.min_experience_years" min="0" class="mt-1 border rounded-xl w-full px-3 py-2" />
              </div>
              <div>
                <label class="text-sm text-gray-700">Max Exp (years)</label>
                <input type="number" v-model.number="form.max_experience_years" min="0" class="mt-1 border rounded-xl w-full px-3 py-2" />
              </div>
            </div>

            <p v-if="errors.salary_range || errors.exp_range" class="text-xs text-rose-600 mt-2">{{ errors.salary_range || errors.exp_range }}</p>

            <div class="grid md:grid-cols-3 gap-4 mt-4">
              <div>
                <label class="text-sm text-gray-700">Vacancies</label>
                <input type="number" v-model.number="form.vacancies" min="1" class="mt-1 border rounded-xl w-full px-3 py-2" />
              </div>
              <div>
                <label class="text-sm text-gray-700">Application Deadline</label>
                <input type="date" v-model="form.application_deadline" class="mt-1 border rounded-xl w-full px-3 py-2" />
              </div>
              <div>
                <label class="text-sm text-gray-700">Working Hours</label>
                <input v-model="form.working_hours" class="mt-1 border rounded-xl w-full px-3 py-2" placeholder="e.g., 10am–6pm (BST)" />
              </div>
            </div>
          </section>

          <!-- Descriptions -->
          <section class="bg-white border rounded-2xl p-5 shadow-sm">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h2 class="text-lg font-semibold">Descriptions</h2>
                <p class="text-xs text-gray-500">Use short paragraphs and bullet points.</p>
              </div>
            </div>

            <div class="grid gap-4">
              <div>
                <label class="text-sm text-gray-700">Summary</label>
                <TextEditor v-model="form.summary" />
              </div>
              <div>
                <label class="text-sm text-gray-700">Responsibilities</label>
                <TextEditor v-model="form.responsibilities" />
              </div>
              <div>
                <label class="text-sm text-gray-700">Requirements</label>
                <TextEditor v-model="form.requirements" />
              </div>
              <div>
                <label class="text-sm text-gray-700">Benefits</label>
                <TextEditor v-model="form.benefits" />
              </div>
              <div>
                <label class="text-sm text-gray-700">Application Process</label>
                <TextEditor v-model="form.application_process" />
              </div>
            </div>
          </section>

          <!-- Skills -->
          <section class="bg-white border rounded-2xl p-5 shadow-sm">
            <div class="mb-3">
              <h2 class="text-lg font-semibold">Skills</h2>
              <p class="text-xs text-gray-500">Type to search, Enter to add. Paste comma separated to bulk add.</p>
            </div>
            <SkillsSelect v-model="selectedSkills" :fetcher="fetchSkills" :creator="createSkill" :max="20" />
          </section>

          <!-- Visibility -->
          <section class="bg-white border rounded-2xl p-5 shadow-sm">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h2 class="text-lg font-semibold">Visibility</h2>
                <p class="text-xs text-gray-500">Control who can view and the current status.</p>
              </div>
            </div>

            <div class="grid md:grid-cols-3 gap-4">
              <div>
                <label class="text-sm text-gray-700">Status</label>
                <select v-model="form.status" class="mt-1 border rounded-xl w-full px-3 py-2">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label class="text-sm text-gray-700">Visibility</label>
                <select v-model="form.visibility" class="mt-1 border rounded-xl w-full px-3 py-2">
                  <option value="public">Public</option>
                  <option value="internal">Internal</option>
                </select>
              </div>
              <div>
                <label class="text-sm text-gray-700">Workplace</label>
                <select v-model="form.workplace" class="mt-1 border rounded-xl w-full px-3 py-2">
                  <option value="onsite">Onsite</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        <!-- Right: Preview / Tips -->
        <aside class="space-y-6 sticky top-[72px] lg:top-[76px] z-30 self-start">
          <section class="bg-white border rounded-2xl shadow-sm overflow-hidden">
            <div class="px-4 py-3 border-b">
              <h3 class="font-medium">Preview</h3>
              <p class="text-xs text-gray-500">How candidates will see it.</p>
            </div>
            <div class="p-4 space-y-2">
              <h4 class="text-lg font-semibold">{{ form.title || 'Job title' }}</h4>
              <div class="flex flex-wrap gap-1">
                <span v-for="c in metaChips" :key="c" class="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">{{ c }}</span>
              </div>
              <div class="text-sm text-gray-600">Salary: {{ salaryPretty }}</div>
              <div class="text-xs text-gray-500" v-if="form.application_deadline">Deadline: {{ new Date(form.application_deadline).toLocaleDateString() }}</div>
              <div class="pt-2">
                <div class="text-xs text-gray-500 mb-1">Top skills</div>
                <div class="flex flex-wrap gap-1">
                  <span v-for="s in selectedSkills" :key="s.id" class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs">{{ s.name }}</span>
                  <span v-if="!selectedSkills.length" class="text-xs text-gray-400">No skills added</span>
                </div>
              </div>
            </div>
          </section>

          <section class="bg-white border rounded-2xl shadow-sm">
            <div class="px-4 py-3 border-b"><h3 class="font-medium">Posting Guidelines</h3></div>
            <ul class="p-4 text-sm text-gray-600 list-disc space-y-1 pl-6">
              <li>Use inclusive language. Avoid gendered terms.</li>
              <li>Keep responsibilities to 6–8 bullets.</li>
              <li>Highlight growth, team, and impact.</li>
              <li>Show salary if possible—improves apply rate.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  .sticky { position: static !important; }
}
</style>
