<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
    <!-- Hero -->
    <section class="relative border-b">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-30 bg-sky-300"></div>
        <div class="absolute -bottom-24 -left-24 w-96 h-96 rounded-full blur-3xl opacity-30 bg-indigo-300"></div>
      </div>
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 relative">
        <div class="rounded-3xl border bg-white/70 backdrop-blur-md shadow-sm p-6 md:p-10">
          <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                Open Positions
              </h1>
              <p class="mt-2 text-slate-600">
                Find a role that fits your craft, culture, and career goals.
              </p>
            </div>
            <div class="text-right">
              <div class="text-sm text-slate-500">Total openings</div>
              <div class="text-2xl font-bold text-slate-900">
                {{ store.meta?.total ?? 0 }}
              </div>
            </div>
          </div>

          <!-- Quick chips -->
          <div class="mt-6 flex flex-wrap items-center gap-2">
            <!-- Types -->
            <button
              v-for="opt in QUICK_TYPES"
              :key="`type-${opt.value}`"
              type="button"
              class="px-3 py-1.5 rounded-full border text-sm transition"
              :class="store.employment_type === opt.value
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'"
              :aria-pressed="store.employment_type === opt.value"
              @click="toggleSelect('employment_type', opt.value)"
            >{{ opt.label }}</button>

            <span class="mx-1 text-slate-300">•</span>

            <!-- Workplace -->
            <button
              v-for="opt in QUICK_PLACES"
              :key="`place-${opt.value}`"
              type="button"
              class="px-3 py-1.5 rounded-full border text-sm transition"
              :class="store.workplace === opt.value
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'"
              :aria-pressed="store.workplace === opt.value"
              @click="toggleSelect('workplace', opt.value)"
            >{{ opt.label }}</button>
            <button
              type="button"
              class="ml-auto px-3 py-1.5 rounded-full border text-sm transition bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
              @click="resetAll"
            >
              Reset filters
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Content -->
    <section class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <!-- Loading skeleton -->
      <div v-if="store.loading" class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div v-for="n in 6" :key="n" class="rounded-2xl border bg-white p-4">
          <div class="h-5 w-2/3 bg-slate-200 rounded mb-3 animate-pulse"></div>
          <div class="h-4 w-full bg-slate-100 rounded mb-2 animate-pulse"></div>
          <div class="h-4 w-5/6 bg-slate-100 rounded mb-2 animate-pulse"></div>
          <div class="flex gap-2 mt-3">
            <div class="h-6 w-20 bg-slate-100 rounded animate-pulse"></div>
            <div class="h-6 w-16 bg-slate-100 rounded animate-pulse"></div>
          </div>
          <div class="h-9 w-28 bg-slate-200 rounded mt-4 animate-pulse"></div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="!store.items.length" class="py-16 text-center">
        <div class="mx-auto size-20 rounded-full bg-slate-100 grid place-items-center">
          <svg width="28" height="28" viewBox="0 0 24 24" class="text-slate-400">
            <path fill="currentColor" d="M2 6h20v12H2zm2 2v8h16V8zm3 1h5v2H7zm0 3h10v2H7z"/>
          </svg>
        </div>
        <h3 class="mt-4 text-lg font-semibold text-slate-900">No jobs found</h3>
        <p class="mt-1 text-slate-600">Try adjusting filters or searching different keywords.</p>
      </div>

      <!-- Grid -->
      <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div v-for="job in store.items" :key="job.id" class="group h-full rounded-2xl border bg-white p-5 hover:shadow-sm transition">
          <JobCard :job="job" />
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="!store.loading && store.meta?.last_page > 1" class="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div class="text-sm text-slate-600">
          Page <span class="font-semibold text-slate-900">{{ store.meta.page }}</span>
          of <span class="font-semibold text-slate-900">{{ store.meta.last_page }}</span>
          • Showing {{ store.items.length }} of {{ store.meta.total }}
        </div>

        <div class="flex items-center gap-2">
          <button
            class="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
            :disabled="store.page <= 1"
            @click="goToPage(store.page - 1)"
          >
            ← Prev
          </button>

          <button
            class="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
            :disabled="store.page >= store.meta.last_page"
            @click="goToPage(store.page + 1)"
          >
            Next →
          </button>
        </div>
      </div>

      <!-- Error -->
      <div v-if="store.error" class="mt-6 rounded-xl border bg-rose-50 text-rose-700 px-4 py-3 text-sm">
        {{ store.error.message || store.error }}
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useCareerStore } from "@/stores/careers";
import JobCard from "./JobCard.vue";

const store = useCareerStore();
const router = useRouter();
const route = useRoute();


const QUICK_TYPES = [
  { value: "full_time",  label: "Full-time" },
  { value: "part_time",  label: "Part-time" },
  { value: "contract",   label: "Contract" },
  { value: "internship", label: "Internship" },
];

const QUICK_PLACES = [
  { value: "onsite", label: "Onsite" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
];

// skills text helper (if you use raw ids)
const skillsText = ref("");

// Debounce
let t = null;
function debounce(fn, delay = 400) {
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}
const onSearchInput = debounce(() => {
  store.page = 1;
  pushQuery();
  store.fetchJobs();
});

// URL <-> State
function readQueryToState() {
  const q = route.query;
  store.q = (q.q ?? "").toString();
  store.status = (q.status ?? "").toString();
  store.department_id = (q.department_id ?? "").toString();
  store.employment_type = (q.employment_type ?? "").toString(); // expects slug, matches QUICK_TYPES.value
  store.workplace = (q.workplace ?? "").toString();             // expects slug, matches QUICK_PLACES.value
  store.experience_level = (q.experience_level ?? "").toString();
  store.skills = (q.skills ? q.skills.toString().split(",").filter(Boolean).map(Number) : []);
  skillsText.value = store.skills.join(",");
  store.only_open = q.only_open ? q.only_open === "1" || q.only_open === "true" : true;
  store.sort = (q.sort ?? "").toString();
  store.per_page = Number(q.per_page ?? 12);
  store.page = Number(q.page ?? 1);
}

function pushQuery() {
  const q = {
    q: store.q || undefined,
    status: store.status || undefined,
    department_id: store.department_id || undefined,
    employment_type: store.employment_type || undefined,
    workplace: store.workplace || undefined,
    experience_level: store.experience_level || undefined,
    skills: store.skills.length ? store.skills.join(",") : undefined,
    only_open: store.only_open ? 1 : 0,
    sort: store.sort || undefined,
    per_page: store.per_page || undefined,
    page: store.page || undefined,
  };
  router.replace({ query: q });
}

function applyFilters() {
  store.page = 1;
  pushQuery();
  store.fetchJobs();
}

function syncSkills() {
  store.skills = (skillsText.value || "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter(Boolean);
  applyFilters();
}

function goToPage(p) {
  store.page = p;
  pushQuery();
  store.fetchJobs({ page: p });
}

function resetAll() {
  store.resetFilters();
  skillsText.value = "";
  pushQuery();
  store.fetchJobs();
}

// UX helpers
function toggleSelect(key, value) {
  if (store[key] === value) {
    store[key] = "";
  } else {
    store[key] = value;
  }
  applyFilters();
}
function toggleOpen() {
  store.only_open = !store.only_open;
  applyFilters();
}

// Watch and init
watch(() => route.query, () => {
  readQueryToState();
  store.fetchJobs();
});
onMounted(() => {
  readQueryToState();
  store.fetchJobs();
});
</script>

<style scoped>
/* Improve focus visibility */
button:focus-visible, a:focus-visible, select:focus-visible, input:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(56,189,248,.35);
  border-radius: 12px;
}
</style>
