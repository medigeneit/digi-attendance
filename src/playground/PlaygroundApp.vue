<template>
  <div
    class="min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
  >
    <!-- Top bar -->
    <header
      class="sticky top-0 z-20 border-b border-neutral-200/70 dark:border-neutral-800/80 bg-white/80 dark:bg-neutral-900/80 backdrop-blur"
    >
      <div class="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
        <button
          class="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-800"
          @click="open = !open"
          aria-label="Toggle sidebar"
        >
          <span class="i">☰</span>
        </button>
        <h1 class="font-semibold">Playground</h1>
        <div class="ml-auto flex items-center gap-3">
          <input
            v-model="q"
            type="search"
            placeholder="Search demos (e.g. button, dialog)"
            class="hidden md:block w-80 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            class="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm"
            @click="toggleDark()"
          >
            {{ isDark ? 'Light' : 'Dark' }}
          </button>
        </div>
      </div>
    </header>

    <!-- Body -->
    <div class="max-w-7xl mx-auto grid md:grid-cols-[280px,1fr] gap-6 px-4 py-6">
      <!-- Sidebar -->
      <aside
        :class="['md:block', open ? 'block' : 'hidden']"
        class="md:sticky md:top-16 self-start"
      >
        <div
          class="md:w-[280px] md:max-h-[80vh] md:overflow-auto border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3 bg-white dark:bg-neutral-950"
        >
          <div class="md:hidden mb-3">
            <input
              v-model="q"
              type="search"
              placeholder="Search demos"
              class="w-full px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <ul class="space-y-1">
            <li v-for="d in filtered" :key="d.id">
              <RouterLink
                :to="{ name: 'playground', params: { id: d.id } }"
                class="block px-3 py-2 rounded-xl text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                :class="
                  route.params.id === d.id ? 'bg-neutral-100 dark:bg-neutral-800 font-medium' : ''
                "
                @click="open = false"
              >
                {{ d.title }}
              </RouterLink>
            </li>
          </ul>
        </div>
      </aside>

      <!-- Preview -->
      <main>
        <div
          v-if="!active"
          class="border border-dashed rounded-2xl p-10 text-center text-neutral-500 dark:border-neutral-800"
        >
          Select a demo on the left.
        </div>

        <div v-else class="space-y-4">
          <!-- Toolbar -->
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-semibold">{{ active.title }}</h2>
              <p class="text-sm text-neutral-500">{{ active.file }}</p>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-sm">Device:</label>
              <select
                v-model="device"
                class="px-2 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
              >
                <option value="full">Responsive</option>
                <option value="mobile">Mobile</option>
                <option value="tablet">Tablet</option>
                <option value="desktop">Desktop</option>
              </select>
              <button
                class="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm"
                @click="remount()"
              >
                Reset
              </button>
              <button
                class="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm"
                @click="showCode = !showCode"
              >
                {{ showCode ? 'Hide code' : 'Show code' }}
              </button>
            </div>
          </div>

          <!-- Frame -->
          <div class="w-full flex justify-center">
            <div
              class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-sm p-4"
              :style="frameStyle"
            >
              <component :is="active.component" :key="key" />
            </div>
          </div>

          <!-- Code -->
          <section
            v-if="showCode"
            class="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-950"
          >
            <div
              class="flex items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-800"
            >
              <span class="text-sm">{{ active.file }}</span>
              <button
                class="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm"
                @click="copy(active.source)"
              >
                Copy
              </button>
            </div>
            <pre
              class="p-4 overflow-auto text-sm leading-relaxed"
            ><code>{{ active.source }}</code></pre>
          </section>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { allDemos, findDemo, searchDemos } from './registry'

const route = useRoute()
const router = useRouter()

// dev-only guard
onMounted(() => {
  if (import.meta.env.PROD) {
    //router.replace('/');
  }
})

const open = ref(false)
const q = ref('')
const device = ref('full')
const showCode = ref(false)
const key = ref(0)

const list = ref(allDemos())
const filtered = computed(() => searchDemos(q.value))

const active = computed(() => {
  const id = route.params.id || filtered.value[0]?.id || null
  return id ? findDemo(id) : null
})

watch(filtered, (arr) => {
  // if current demo got filtered out, jump to first
  if (active.value && !arr.find((d) => d.id === active.value.id) && arr[0]) {
    router.replace({ name: 'playground', params: { id: arr[0].id } })
  }
})

function remount() {
  key.value++
}

function copy(text) {
  navigator.clipboard?.writeText(text)
}

const isDark = ref(false)
function toggleDark() {
  isDark.value = !isDark.value
  const root = document.documentElement
  isDark.value ? root.classList.add('dark') : root.classList.remove('dark')
}

const frameStyle = computed(() => {
  switch (device.value) {
    case 'mobile':
      return { width: '375px' }
    case 'tablet':
      return { width: '768px' }
    case 'desktop':
      return { width: '1024px' }
    default:
      return { width: '100%' }
  }
})
</script>
