<script setup>
import UserAvatar from '@/components/UserAvatar.vue'
import { useUserStore } from '@/stores/user'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

const props = defineProps({
  user: { type: Object, default: () => ({}) },
})

const userStore = useUserStore()
const bubbleOpen = ref(false)
const isLoading = ref(false)
const fetchError = ref('')
const hydratedUser = ref(null)
const hasFetched = ref(false)
const triggerRef = ref(null)
const bubbleStyle = ref({})
const bubbleRef = ref(null)
const hoverState = reactive({ trigger: false, bubble: false })
let closeTimer = null
const closeDelay = 120
const now = new Date()
const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
const clearCloseTimer = () => {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

const lineTypeLabels = {
  executive: 'Executive',
  support_staff: 'Support Staff',
  doctor: 'Doctor',
  academy_body: 'Academy Body',
}

const mergedUser = computed(() => ({ ...(props.user || {}), ...(hydratedUser.value || {}) }))
const resolvedLineType = computed(
  () => lineTypeLabels[mergedUser.value?.type] || mergedUser.value?.type || '',
)
const jobCardUrl = computed(() => {
  const u = mergedUser.value || {}
  const employeeId = u?.id || u?.user_id || u?.employee_id
  if (!employeeId) return ''
  const departmentId = u?.department?.id || u?.department_id
  const companyId = u?.department?.company?.id || u?.company_id
  const params = new URLSearchParams()
  if (departmentId) params.set('department_id', departmentId)
  if (companyId) params.set('company_id', companyId)
  params.set('employee_id', employeeId)
  params.set('date', defaultMonth)
  return `/hrd/em-attendance?${params.toString()}`
})

const infoRows = computed(() => {
  const u = mergedUser.value || {}
  const rows = [
    { label: 'Employee ID', value: u.employee_id || u.employeeId || u.id },
    { label: 'Employment type', value: u.employment_type },
    { label: 'Email', value: u.email },
    { label: 'Phone', value: u.phone || u.contact_number || u.mobile },
    { label: 'Designation', value: u.designation?.title },
    { label: 'Department', value: u.department?.name },
    { label: 'Company', value: u.department?.company?.name || u.company?.name },
    { label: 'Line Type', value: resolvedLineType.value },
    { label: 'Blood Group', value: u.blood },
  ]

  return rows.map((row) => ({ ...row, value: row.value || '-' }))
})

const needsApiHydrate = computed(() => {
  if (!props.user?.id) return false
  const u = mergedUser.value || {}
  return (
    !u.email ||
    !(u.phone || u.contact_number || u.mobile) ||
    !u.department?.name ||
    !u.designation?.name ||
    !(u.department?.company?.name || u.company?.name)
  )
})

const resetHydration = () => {
  hydratedUser.value = null
  hasFetched.value = false
  fetchError.value = ''
}

const hydrateUser = async () => {
  if (!needsApiHydrate.value || !props.user?.id || hasFetched.value || isLoading.value) return

  isLoading.value = true
  fetchError.value = ''
  try {
    const data = await userStore.fetchUser(props.user.id)
    if (data) hydratedUser.value = data
    hasFetched.value = true
  } catch (error) {
    fetchError.value = 'Unable to load full profile right now.'
  } finally {
    isLoading.value = false
  }
}

const updatePosition = () => {
  const el = triggerRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const desiredWidth = 320
  const viewportPadding = 12
  const bubbleHeight = bubbleRef.value?.offsetHeight || 0
  const spaceBelow = window.innerHeight - rect.bottom - 8
  const spaceAbove = rect.top - 8
  const placeAbove = bubbleHeight && bubbleHeight > spaceBelow && spaceAbove > spaceBelow

  const left = Math.min(
    Math.max(rect.left, viewportPadding),
    window.innerWidth - desiredWidth - viewportPadding,
  )
  const top = placeAbove ? rect.top - bubbleHeight - 8 : rect.bottom + 8
  bubbleStyle.value = {
    top: `${Math.max(top, viewportPadding)}px`,
    left: `${left}px`,
    width: `${Math.min(desiredWidth, window.innerWidth - viewportPadding * 2)}px`,
  }
}

const openBubble = async () => {
  bubbleOpen.value = true
  await nextTick()
  updatePosition()
  await hydrateUser()
}

const closeBubble = () => {
  bubbleOpen.value = false
}

const requestCloseIfNotHovering = () => {
  if (hoverState.trigger || hoverState.bubble) return

  clearCloseTimer()
  closeTimer = setTimeout(() => {
    if (!hoverState.trigger && !hoverState.bubble) {
      closeBubble()
    }
  }, closeDelay)
}

const handleWindowEvents = () => {
  if (bubbleOpen.value) updatePosition()
}

onMounted(() => {
  window.addEventListener('resize', handleWindowEvents)
  window.addEventListener('scroll', handleWindowEvents, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowEvents)
  window.removeEventListener('scroll', handleWindowEvents, true)
  clearCloseTimer()
})

watch(
  () => props.user?.id,
  () => {
    resetHydration()
  },
)

const handleTriggerEnter = () => {
  clearCloseTimer()
  hoverState.trigger = true
  openBubble()
}

const handleTriggerLeave = () => {
  hoverState.trigger = false
  requestCloseIfNotHovering()
}

const handleTriggerFocus = () => {
  clearCloseTimer()
  hoverState.trigger = true
  openBubble()
}

const handleTriggerBlur = () => {
  hoverState.trigger = false
  requestCloseIfNotHovering()
}

const handleBubbleEnter = () => {
  clearCloseTimer()
  hoverState.bubble = true
}

const handleBubbleLeave = () => {
  hoverState.bubble = false
  requestCloseIfNotHovering()
}
</script>

<template>
  <div
    class="relative flex items-start"
    v-bind="$attrs"
    @mouseenter="handleTriggerEnter"
    @mouseleave="handleTriggerLeave"
    @focusin="handleTriggerFocus"
    @focusout="handleTriggerBlur"
    ref="triggerRef"
  >
    <slot name="trigger" :user="mergedUser">
      <div class="flex items-start gap-2">
        <UserAvatar size="medium" :user="mergedUser" class="inline-block align-middle" />
        <div class="leading-tight">
          <div class="font-medium text-gray-800">
            {{ mergedUser?.name || 'Unknown user' }}
          </div>
          <div v-if="mergedUser?.department?.name" class="text-xs text-gray-500">
            {{ mergedUser?.department?.name }}
          </div>
        </div>
      </div>
    </slot>

    <Teleport to="body">
      <transition name="fade-scale">
        <div
          v-if="bubbleOpen"
          class="fixed z-50 rounded-xl border border-gray-200 bg-white p-4 shadow-xl overflow-y-auto max-h-[40vh] w-80 md:w-96"
          :style="bubbleStyle"
          ref="bubbleRef"
          @mouseenter="handleBubbleEnter"
          @mouseleave="handleBubbleLeave"
        >
          <div class="flex items-start gap-3">
            <UserAvatar :user="mergedUser" size="xlarge" />
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-gray-900 leading-tight truncate">
                {{ mergedUser?.name || 'Unknown user' }}
              </div>
              <div class="text-xs text-gray-500 leading-tight">
                <span v-if="mergedUser?.designation?.title">{{
                  mergedUser?.designation?.title
                }}</span>
                <span v-if="mergedUser?.designation?.title && resolvedLineType" class="mx-1">
                  &bull;
                </span>
                <span v-if="resolvedLineType">{{ resolvedLineType }}</span>
              </div>
              <div v-if="mergedUser?.employee_id" class="text-[11px] text-gray-500">
                ID: {{ mergedUser?.employee_id }}
              </div>
              <div class="text-blue-500 mt-1 text-[11px]">
                Shift: {{ mergedUser?.current_shift?.shift?.name || 'N/A' }}
              </div>
              <div>
                <slot name="afterHeader" :user="mergedUser"></slot>
              </div>
            </div>
          </div>

          <dl class="mt-3 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1 text-xs">
            <template v-for="row in infoRows" :key="row.label">
              <dt class="text-gray-500">{{ row.label }}</dt>
              <dd class="text-gray-800 font-medium truncate">{{ row.value }}</dd>
            </template>
          </dl>

          <div v-if="jobCardUrl" class="mt-3">
            <a
              :href="jobCardUrl"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm"
            >
              <i class="far fa-external-link-alt"></i>
              Open Job Card
            </a>
          </div>
          <!-- <pre>{{ mergedUser }}</pre> -->

          <div v-if="isLoading" class="mt-2 text-[11px] text-indigo-600">Loading more details…</div>
          <div v-else-if="fetchError" class="mt-2 text-[11px] text-red-600">
            {{ fetchError }}
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition:
    opacity 120ms ease,
    transform 120ms ease;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.98);
}
</style>
