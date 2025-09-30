<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'
import { useNoticeStore } from '@/stores/notice'
import Swal from 'sweetalert2'
import { onMounted, ref, watch, computed, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useHead } from '@vueuse/head'
import noitceImage from '@/assets/notice.png'

/* stores & utils */
const noticeStore = useNoticeStore()
const toast = useToast()
const route = useRoute()
const router = useRouter()

/* state */
const notice = ref(null)
const isLoading = ref(true)
const error = ref(null)

const editing = ref(false)
const feedback = ref('')
const maxChars = 300

/* sticky action bar */
const showStickyBar = ref(false)
const onScroll = () => {
  const y = window.scrollY || document.documentElement.scrollTop
  showStickyBar.value = y > 160
}
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

/* helpers */
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

const isImage = (file) => !!file && /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file)
const isPDF   = (file) => !!file && /\.pdf$/i.test(file)
const getFilename = (file) => file?.split('/').pop() || 'file'

const hasFeedback = computed(() => !!notice.value?.user_feedback)
const remainingChars = computed(() => maxChars - (feedback.value?.length || 0))
const disabledSubmit = computed(() => {
  const t = (feedback.value || '').trim()
  return isLoading.value || t.length === 0 || t.length > maxChars
})

/* data */
const fetchNotice = async () => {
  try {
    isLoading.value = true
    error.value = null
    const noticeId = route.params.id
    const data = await noticeStore.fetchNoticeDetails(noticeId)
    notice.value = data
    feedback.value = data?.user_feedback?.feedback || ''
    editing.value = !data?.user_feedback
  } catch (err) {
    error.value = err?.response?.data?.message || 'Failed to load notice details'
    toast.error(error.value)
  } finally {
    isLoading.value = false
  }
}

/* feedback */
const saveFeedback = async () => {
  const text = (feedback.value || '').trim()
  if (!text) return toast.error('Please enter your feedback')
  if (text.length > maxChars) return toast.error(`Feedback must be within ${maxChars} characters`)

  isLoading.value = true
  try {
    const noticeId = route.params.id
    const payload = { feedback: text }
    const res = await noticeStore.createNoticeFeedback(noticeId, payload)
    const serverFeedback = res?.data?.user_feedback || res?.user_feedback || payload
    notice.value = { ...notice.value, user_feedback: serverFeedback }

    await Swal.fire({
      position: 'top-end',
      icon: 'success',
      title: 'Your feedback has been saved',
      showConfirmButton: false,
      timer: 1300
    })
    editing.value = false
  } catch (err) {
    error.value = err?.response?.data?.message || 'Failed to save feedback'
    toast.error(error.value)
  } finally {
    isLoading.value = false
  }
}

/* head */
watch(
  () => notice.value,
  (n) => {
    useHead({
      title: n?.title || 'Genesis - Notice',
      meta: [
        { property: 'og:title', content: n?.title || 'Genesis - Notice' },
        { property: 'og:image', content: n?.file || noitceImage },
        { property: 'og:description', content: n?.description || 'Genesis - Notice Description' }
      ]
    })
  },
  { immediate: true }
)

/* actions */
const openInNewTab = (fileUrl) => fileUrl && window.open(fileUrl, '_blank', 'noopener,noreferrer')
const downloadDirect = (fileUrl, name = '') => {
  if (!fileUrl) return
  const a = document.createElement('a')
  a.href = fileUrl
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}
const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href)
    toast.success('Link copied to clipboard')
  } catch { toast.error('Failed to copy link') }
}
const printPage = () => window.print()
const goBack = () => router.back()

/* image states */
const imgLoaded = ref(false)
const imgError = ref(false)
const resetImageStates = () => { imgLoaded.value = false; imgError.value = false }

watch(
  () => notice.value?.file,
  (file) => {
    resetImageStates()
    if (isImage(file)) {
      const img = new Image()
      img.onload = () => (imgLoaded.value = true)
      img.onerror = () => (imgError.value = true)
      img.src = file
    }
  },
  { immediate: true }
)

/* pdf viewer */
const pdfViewerUrl = computed(() => {
  const url = notice.value?.file || ''
  if (!url) return ''
  return url.includes('#') ? url : `${url}#toolbar=0&navpanes=0&view=FitH`
})

/* lightbox + zoom/pan */
const lightboxOpen = ref(false)
const lightboxEl = ref(null)           // NEW: for focus & Esc reliability
const zoom = ref(1)
const offset = ref({ x: 0, y: 0 })
const dragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const offsetStart = ref({ x: 0, y: 0 })

// NEW: helpers for Esc + scroll lock
const onEscape = (e) => { if (e.key === 'Escape') closeLightbox() }
const lockScroll = () => document.documentElement.classList.add('overflow-hidden')
const unlockScroll = () => document.documentElement.classList.remove('overflow-hidden')

const openLightbox = () => {
  lightboxOpen.value = true
  zoom.value = 1
  offset.value = { x: 0, y: 0 }
  lockScroll()
  document.addEventListener('keydown', onEscape)
  nextTick(() => lightboxEl.value?.focus())
}
const closeLightbox = () => {
  lightboxOpen.value = false
  dragging.value = false
  unlockScroll()
  document.removeEventListener('keydown', onEscape)
}
const zoomIn = () => (zoom.value = Math.min(zoom.value * 1.2, 8))
const zoomOut = () => (zoom.value = Math.max(zoom.value / 1.2, 0.25))
const resetZoom = () => { zoom.value = 1; offset.value = { x: 0, y: 0 } }
const toggleZoom = () => {
  zoom.value = zoom.value === 1 ? 2 : 1
  if (zoom.value === 1) offset.value = { x: 0, y: 0 }
}
const onWheelZoom = (e) => {
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  zoom.value = Math.min(Math.max(zoom.value + delta, 0.25), 8)
}
const onDragStart = (e) => {
  if (!lightboxOpen.value) return
  dragging.value = true
  dragStart.value = { x: e.clientX, y: e.clientY }
  offsetStart.value = { ...offset.value }
}
const onDragMove = (e) => {
  if (!dragging.value) return
  offset.value = {
    x: offsetStart.value.x + (e.clientX - dragStart.value.x),
    y: offsetStart.value.y + (e.clientY - dragStart.value.y),
  }
}
const onDragEnd = () => (dragging.value = false)

/* cleanup */
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onEscape)
  unlockScroll()
})

/* init */
onMounted(fetchNotice)
</script>

<template>
  <div class="my-container py-6 print:px-0">
    <!-- Sticky action bar -->
    <div
      v-show="showStickyBar && notice"
      class="sticky top-0 z-40 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60"
    >
      <div class="mx-auto max-w-6xl px-3 py-2 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <button class="text-gray-500 hover:text-indigo-600" @click="goBack" title="Back">
            <i class="far fa-arrow-left"></i>
          </button>
          <div class="truncate font-medium text-sm text-gray-800">
            {{ notice?.title?.replace(/<[^>]*>?/gm, '') || 'Notice' }}
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn" @click="copyLink"><i class="far fa-link mr-1"></i>Copy</button>
          <button v-if="notice?.file" class="btn" @click="openInNewTab(notice?.file)">
            <i class="far fa-arrow-up-right-from-square mr-1"></i>Open
          </button>
          <button v-if="notice?.file" class="btn" @click="downloadDirect(notice?.file, getFilename(notice?.file))">
            <i class="far fa-download mr-1"></i>Download
          </button>
          <button class="btn-primary" @click="printPage"><i class="far fa-print mr-1"></i>Print</button>
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-6xl">
      <!-- Top header -->
      <div class="rounded-2xl overflow-hidden bg-white shadow-sm ring-1 ring-gray-100">
        <div class="h-1 bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-400"></div>
        <div class="px-6 py-5 flex items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="text-[11px] uppercase tracking-wider text-gray-500">Notice</div>
            <h1 class="mt-1 text-xl md:text-2xl font-semibold text-gray-900 leading-snug" v-html="notice?.title || 'Notice Details'"></h1>
            <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>Published: <span class="font-medium text-gray-700">{{ formatDate(notice?.published_at) }}</span></span>
              <span v-if="notice?.expired_at">• Expires: <span class="font-medium text-gray-700">{{ formatDate(notice?.expired_at) }}</span></span>
              <span v-if="notice?.created_by_name">• By <span class="font-medium text-gray-700">{{ notice?.created_by_name }}</span></span>
            </div>
          </div>

          <div class="shrink-0 flex flex-col items-end gap-2">
            <span
              v-if="!notice?.user_feedback"
              class="badge-amber"
              title="No feedback yet"
            >
              <span class="h-2 w-2 rounded-full bg-amber-500"></span> Pending Feedback
            </span>
            <span v-else class="badge-emerald" title="Feedback submitted">
              <i class="far fa-check"></i> Feedback Submitted
            </span>

            <div class="hidden md:flex items-center gap-2">
              <button class="btn" @click="copyLink"><i class="far fa-link mr-1"></i>Copy</button>
              <button v-if="notice?.file" class="btn" @click="openInNewTab(notice?.file)">
                <i class="far fa-arrow-up-right-from-square mr-1"></i>Open
              </button>
              <button v-if="notice?.file" class="btn" @click="downloadDirect(notice?.file, getFilename(notice?.file))">
                <i class="far fa-download mr-1"></i>Download
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Content grid -->
      <div class="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Main -->
        <div class="lg:col-span-8 space-y-6">
          <!-- Body / Description -->
          <div class="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100"  v-if="notice?.description">
            <div class="px-6 py-5">
              <div v-if="isLoading"><LoaderView class="shadow-none" /></div>
              <div v-else-if="error" class="rounded-lg bg-red-50 text-red-700 px-4 py-3">{{ error }}</div>
              <div v-else>
                <div v-if="notice?.description" class="prose max-w-none prose-img:my-0 text-gray-800" v-html="notice?.description"></div>
                <div v-else class="text-gray-500 text-sm">No description provided.</div>
              </div>
            </div>
          </div>

          <!-- Attachment -->
          <div v-if="notice?.file" class="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
            <div class="px-6 py-4 md:flex items-center justify-between">
              <div class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <i class="far fa-paperclip"></i> Attachment
              </div>
              <button class="text-sm underline text-indigo-600 truncate hover:text-indigo-700" @click="downloadDirect(notice?.file, getFilename(notice?.title))">
                Download ({{ getFilename(notice?.title) }})
              </button>
            </div>

            <div class="px-6 pb-6">
              <!-- IMAGE -->
              <div v-if="isImage(notice?.file)" class="relative rounded-xl overflow-hidden border bg-gray-50">
                <!-- Skeleton -->
                <div v-if="!imgLoaded && !imgError" class="aspect-video w-full animate-pulse bg-gray-200" aria-hidden="true"></div>

                <!-- Image -->
                <img
                  v-show="imgLoaded && !imgError"
                  :src="notice?.file"
                  alt="Notice Attachment"
                  loading="lazy"
                  class="w-full max-h-[70vh] object-contain select-none"
                  @click="openLightbox"
                />

                <!-- Error fallback -->
                <div v-if="imgError" class="p-6 flex items-center justify-between">
                  <div class="flex items-center gap-3 text-gray-700">
                    <i class="far fa-triangle-exclamation text-red-500 text-lg"></i>
                    <div>
                      <p class="font-medium">Failed to load image</p>
                      <p class="text-sm text-gray-500 break-all">{{ getFilename(notice?.file) }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button class="btn" @click="openInNewTab(notice?.file)">Open</button>
                    <button class="btn-primary" @click="downloadDirect(notice?.file, getFilename(notice?.file))">Download</button>
                  </div>
                </div>

                <!-- Floating toolbar -->
                <div v-if="!imgError" class="absolute top-2 right-2 flex items-center gap-2">
                  <button class="btn-4 py-1" title="Download" @click="downloadDirect(notice?.file, getFilename(notice?.file))">
                    <i class="far fa-download"></i>
                  </button>
                </div>

                <!-- Caption -->
                <div class="flex items-center justify-between px-4 py-2 border-t bg-white">
                  <div class="truncate text-sm text-gray-700" :title="getFilename(notice?.file)">
                    <span class="font-medium">Image:</span> {{ getFilename(notice?.file) }}
                  </div>
                  <div class="flex items-center gap-2">
                    <button class="btn" @click="openInNewTab(notice?.file)">Open</button>
                    <button class="btn-primary" @click="downloadDirect(notice?.file, getFilename(notice?.file))">Download</button>
                  </div>
                </div>
              </div>

              <!-- PDF -->
              <div v-else-if="isPDF(notice?.file)" class="rounded-xl overflow-hidden border bg-white relative">
                <iframe :src="pdfViewerUrl" class="w-full h-[80vh] bg-white" title="Notice PDF"></iframe>
                <div class="absolute top-2 right-2 flex items-center gap-2">
                  <button class="btn-4 py-1" title="Open in new tab" @click="openInNewTab(notice?.file)">
                    <i class="far fa-arrow-up-right-from-square"></i>
                  </button>
                  <button class="btn-4 py-1" title="Download" @click="downloadDirect(notice?.file, getFilename(notice?.file))">
                    <i class="far fa-download"></i>
                  </button>
                </div>
                <div class="flex items-center justify-between px-4 py-2 border-t bg-white">
                  <div class="truncate text-sm text-gray-700">
                    <span class="font-medium">PDF:</span> {{ getFilename(notice?.file) }}
                  </div>
                  <div class="flex items-center gap-2">
                    <button class="btn" @click="openInNewTab(notice?.file)">Open</button>
                    <button class="btn-primary" @click="downloadDirect(notice?.file, getFilename(notice?.file))">Download</button>
                  </div>
                </div>
              </div>

              <!-- OTHER -->
              <div v-else class="rounded-xl bg-gray-50 p-4 border flex items-center justify-between">
                <div class="text-gray-700 truncate" :title="getFilename(notice?.file)">
                  <span class="font-medium">File:</span> {{ getFilename(notice?.file) }}
                </div>
                <div class="flex items-center gap-2">
                  <button class="btn" @click="openInNewTab(notice?.file)">Open</button>
                  <button class="btn-primary" @click="downloadDirect(notice?.file, getFilename(notice?.file))">Download</button>
                </div>
              </div>
            </div>
          </div>

         
        </div>

        <!-- Meta / Sidebar -->
        <aside class="lg:col-span-4 space-y-6">
          <div class="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <div class="px-6 py-5 space-y-3">
              <div class="text-xs uppercase tracking-wider text-gray-500">Summary</div>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="rounded-lg bg-gray-50 p-3">
                  <div class="text-[11px] text-gray-500">Published</div>
                  <div class="font-medium text-gray-800">{{ formatDate(notice?.published_at) }}</div>
                </div>
                <div class="rounded-lg bg-gray-50 p-3">
                  <div class="text-[11px] text-gray-500">Expires</div>
                  <div class="font-medium text-gray-800">{{ formatDate(notice?.expired_at) }}</div>
                </div>
                <div v-if="notice?.category_name" class="rounded-lg bg-gray-50 p-3 col-span-2">
                  <div class="text-[11px] text-gray-500">Category</div>
                  <div class="font-medium text-gray-800">{{ notice?.category_name }}</div>
                </div>
              </div>

              <div class="pt-3 flex flex-wrap gap-2">
                <span class="chip">Notice</span>
                <span v-if="!notice?.user_feedback" class="chip chip-amber">Pending</span>
                <span v-else class="chip chip-emerald">Submitted</span>
              </div>
            </div>

            <div class="px-6 pb-5 flex flex-col gap-2">
              <button class="btn w-full" @click="copyLink"><i class="far fa-link mr-2"></i>Copy link</button>
              <button v-if="notice?.file" class="btn w-full" @click="openInNewTab(notice?.file)"><i class="far fa-arrow-up-right-from-square mr-2"></i>Open attachment</button>
              <button v-if="notice?.file" class="btn-primary w-full" @click="downloadDirect(notice?.file, getFilename(notice?.file))"><i class="far fa-download mr-2"></i>Download</button>
            </div>
          </div>

           <!-- Feedback -->
          <div class="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <div class="px-6 py-5">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <i class="far fa-comment-dots text-emerald-600"></i>
                  </div>
                  <h3 class="text-base md:text-lg font-semibold text-gray-900">Your Feedback</h3>
                </div>
                <button
                  v-if="hasFeedback"
                  @click="editing = !editing"
                  class="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                >
                  {{ editing ? 'Cancel' : 'Edit Feedback' }}
                </button>
              </div>

              <div v-if="!hasFeedback || editing" class="mt-4 space-y-3">
                <div>
                  <textarea
                    v-model="feedback"
                    :maxlength="maxChars + 1"
                    rows="3"
                    class="w-full rounded-xl border px-3 py-2 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                    placeholder="Type your feedback here..."
                    @keyup.enter.ctrl="saveFeedback"
                  ></textarea>
                  <div class="mt-1 flex items-center justify-between text-xs">
                    <span class="text-gray-500">Press <kbd class="px-1 border rounded">Ctrl</kbd> + <kbd class="px-1 border rounded">Enter</kbd> to submit</span>
                    <span :class="remainingChars < 0 ? 'text-red-600' : 'text-gray-500'">{{ remainingChars }} characters left</span>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <button
                    @click="saveFeedback"
                    :disabled="disabledSubmit"
                    class="px-4 py-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {{ isLoading ? 'Saving...' : (hasFeedback ? 'Update Feedback' : 'Submit Feedback') }}
                  </button>
                </div>
              </div>

              <div v-else class="mt-4">
                <div class="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-800">
                  <div class="flex items-start gap-3">
                    <i class="far fa-check-circle mt-0.5"></i>
                    <div>
                      <div class="text-sm font-semibold">Your feedback</div>
                      <div class="text-sm mt-0.5">{{ notice?.user_feedback?.feedback }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <!-- LIGHTBOX -->
    <transition name="fade">
      <div
        v-if="lightboxOpen"
        ref="lightboxEl"
        role="dialog"
        aria-modal="true"
        class="fixed inset-0 z-50 bg-black/10 backdrop-blur-sm flex flex-col"
        @keydown.esc="closeLightbox"
        @click.self="closeLightbox"
        tabindex="0"
      >
        <div class="flex items-center mt-14 justify-end p-3 text-white">
          <div class="flex items-center gap-2">
            <button class="btn-4 py-1" title="Zoom out" @click="zoomOut">−</button>
            <span class="px-2 text-sm">{{ Math.round(zoom * 100) }}%</span>
            <button class="btn-4 py-1" title="Zoom in" @click="zoomIn">+</button>
            <button class="btn-2" title="Download" @click="downloadDirect(notice?.file, getFilename(notice?.file))">
              <i class="far fa-download"></i>
            </button>
            <button class="btn-4 py-1 text-red-500" title="Close" @click="closeLightbox">✕</button>
          </div>
        </div>

        <div
          class="flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
          @wheel.prevent="onWheelZoom"
          @mousedown="onDragStart"
          @mouseup="onDragEnd"
          @mouseleave="onDragEnd"
          @mousemove="onDragMove"
          @dblclick="toggleZoom"
        >
          <div
            class="w-full h-full mt-10 flex items-center justify-center"
            :style="{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              transition: dragging ? 'none' : 'transform 120ms ease',
            }"
          >
            <img
              :src="notice?.file"
              :alt="getFilename(notice?.file) || 'Notice Image'"
              class="max-w-none select-none"
              draggable="false"
              @dragstart.prevent
            />
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* Utility buttons */
.btn { @apply px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200; }
.btn-primary { @apply px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700; }
.icon-btn { @apply inline-flex items-center justify-center rounded-lg bg-white/90 text-gray-700 h-9 w-9 hover:bg-white shadow; }
.icon-btn.invert { @apply bg-white/10 text-white border border-white/20 hover:bg-white/20; }

/* Badges & chips */
.badge-amber { @apply inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-amber-700 bg-amber-50 border-amber-200; }
.badge-emerald { @apply inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border-emerald-200; }
.chip { @apply inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs text-gray-700 bg-white; }
.chip-amber { @apply border-amber-200 bg-amber-50 text-amber-700; }
.chip-emerald { @apply border-emerald-200 bg-emerald-50 text-emerald-700; }

/* Prose fix for images spacing */
.prose :where(img):not(:where([class~="not-prose"] *)) { margin: 0; }

/* Print */
@media print {
  .my-container { padding: 0; }
  .btn, .btn-primary, .icon-btn, .chip, .badge-amber, .badge-emerald { display: none !important; }
  .sticky, .backdrop-blur, .shadow, .ring-1, .ring-2 { box-shadow: none !important; }
  iframe { height: 100vh !important; }
}

/* Fade transition */
.fade-enter-active, .fade-leave-active { transition: opacity 150ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
