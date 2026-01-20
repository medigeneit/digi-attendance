<script setup>
import ApprovalItem from '@/components/applications/ApprovalItem.vue'
import LoaderView from '@/components/common/LoaderView.vue'
import ScreenshotCapture from '@/components/common/ScreenshotCapture.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'
import { useAuthStore } from '@/stores/auth'
import { useExchangeStore } from '@/stores/exchange'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const router = useRouter()
const route = useRoute()
const exchangeStore = useExchangeStore()
const authStore = useAuthStore()
const toast = useToast()

const loading = ref(true)
const attachment = ref(null)

const exchange = computed(() => exchangeStore.exchange)

onMounted(async () => {
  try {
    await exchangeStore.fetchExchange(route.params.id)
  } finally {
    loading.value = false
  }
})

const goBack = () => router.go(-1)
const print = () => window.print()

const onAction = async () => {
  await exchangeStore.fetchExchange(route.params.id)
}

const formatDate = (d) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const getDayName = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { weekday: 'long' }) : ''
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-3 print:p-0">
    <!-- Top Bar -->
    <div class="flex items-center justify-between print:hidden">
      <button
        @click="goBack"
        class="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-black"
      >
        ← Back
      </button>

      <h1 class="text-base md:text-lg font-bold text-slate-900">Exchange Details</h1>

      <button
        @click="print"
        class="text-sm font-semibold text-slate-600 hover:text-black"
      >
        Print
      </button>
    </div>

    <LoaderView v-if="loading" />

    <!-- PAPER -->
    <div
      v-else
      id="leave-application"
      class="bg-white rounded-lg p-4 md:p-8 text-sm md:text-base leading-relaxed"
    >
      <!-- Title -->
      <div class="text-center space-y-1">
        <h1 class="text-xl md:text-2xl font-extrabold text-slate-900">
          Shift Exchange Application
        </h1>

        <div class="flex justify-center items-center gap-2 text-xs md:text-sm text-slate-500">
          <span>Created:</span>
          <span class="font-semibold text-slate-900">
            {{ formatDate(exchange?.created_at) }}
          </span>

          <span
            class="px-2 py-0.5 rounded-full font-semibold"
            :class="{
              'bg-yellow-100 text-yellow-700': exchange?.status === 'Pending',
              'bg-green-100 text-green-700': exchange?.status === 'Approved',
              'bg-red-100 text-red-700': exchange?.status === 'Rejected',
            }"
          >
            {{ exchange?.status }}
          </span>
        </div>
      </div>

      <!-- Applicant -->
      <div class="grid md:grid-cols-3 gap-6 mt-6">
        <div class="space-y-2 md:col-span-2">
          <div class="flex">
            <span class="w-32 text-slate-500">Name</span>
            <span class="font-medium">{{ exchange?.user?.name }}</span>
          </div>

          <div class="flex">
            <span class="w-32 text-slate-500">Designation</span>
            <span class="font-medium">{{ exchange?.user?.designation?.title }}</span>
          </div>

          <div class="flex">
            <span class="w-32 text-slate-500">Department</span>
            <span class="font-medium">{{ exchange?.user?.department?.name }}</span>
          </div>
        </div>

        <div class="flex md:justify-end">
          <ApprovalItem
            :application="exchange"
            type="shift_exchange_applications"
            item="handover"
            :onAction="onAction"
          />
        </div>
      </div>

      <!-- Exchange Details -->
      <div class="mt-8">
        <h3 class="text-lg font-bold text-slate-900">Exchange Details</h3>

        <div class="grid md:grid-cols-2 gap-x-10 gap-y-3 mt-4">
          <div class="flex">
            <span class="w-32 text-slate-500">Exchange Day</span>
            <span class="font-medium">{{ getDayName(exchange?.exchange_date) }}</span>
          </div>

          <div class="flex">
            <span class="w-32 text-slate-500">Exchange Date</span>
            <span class="font-medium">{{ formatDate(exchange?.exchange_date) }}</span>
          </div>

          <div class="flex">
            <span class="w-32 text-slate-500">From Shift</span>
            <span class="font-medium">{{ exchange?.current_shift?.name }}</span>
          </div>

          <div class="flex">
            <span class="w-32 text-slate-500">To Shift</span>
            <span class="font-medium">{{ exchange?.shift?.name }}</span>
          </div>

          <div class="md:col-span-2 flex items-start">
            <span class="w-32 text-slate-500">Reason</span>
            <span class="font-medium leading-relaxed">
              {{ exchange?.reason || 'N/A' }}
            </span>
          </div>

          <div class="md:col-span-2 flex items-start">
            <span class="w-32 text-slate-500">Works in Hand</span>
            <span class="font-medium leading-relaxed">
              {{ exchange?.works_in_hand || 'N/A' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Approvals -->
      <hr class="my-4" />

      <div class="text-center space-y-1">
        <h3 class="text-lg font-bold">Approvals</h3>

        <div
          v-if="exchange?.status === 'Rejected'"
          class="text-sm text-red-700 mt-2"
        >
          <div><b>Rejected By:</b> {{ exchange?.rejected_by_user?.name }}</div>
          <div><b>Reason:</b> {{ exchange?.rejection_reason }}</div>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 gap-y-16 gap-x-6 mt-2">
        <ApprovalItem
          :application="exchange"
          type="shift_exchange_applications"
          item="in_charge"
          :onAction="onAction"
        />

        <ApprovalItem
          :application="exchange"
          type="shift_exchange_applications"
          item="recommend_by"
          :onAction="onAction"
        />

        <ApprovalItem
          :application="exchange"
          type="shift_exchange_applications"
          item="approved_by"
          :onAction="onAction"
        />
      </div>
    </div>

    <!-- Attachment -->
    <div class="bg-white rounded-lg p-4 flex justify-between items-center print:hidden">
      <h3 class="font-bold">Attachment</h3>

      <a
        v-if="exchange?.attachment"
        :href="exchange.attachment"
        target="_blank"
        class="text-emerald-600 font-semibold hover:underline"
      >
        View file
      </a>

      <span v-else class="text-slate-400 italic">No attachment</span>
    </div>

    <ShareComponent>
      <ScreenshotCapture targetId="leave-application" platform="whatsapp" />
    </ShareComponent>
  </div>
</template>
