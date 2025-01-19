<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useExchangeStore } from '@/stores/exchange'
import { useAuthStore } from '@/stores/auth'
import LoaderView from '@/components/common/LoaderView.vue'
import ShareComponent from '@/components/common/ShareComponent.vue'

const router = useRouter()
const route = useRoute()
const exchangeStore = useExchangeStore()
const authStore = useAuthStore()

const loading = ref(true)
const rejectionModal = ref(false)
const rejectionReason = ref('')

const exchange = computed(() => exchangeStore.exchange)

onMounted(async () => {
  const { id } = route.params
  try {
    await exchangeStore.fetchExchange(id)
  } catch (err) {
    console.error('Failed to fetch exchange details:', err)
  } finally {
    loading.value = false
  }
})

const rejectExchange = async () => {
  try {
    await exchangeStore.rejectExchange(route.params.id, rejectionReason.value)
    rejectionModal.value = false
    rejectionReason.value = ''
    await exchangeStore.fetchExchange(route.params.id)
  } catch (err) {
    console.error('Failed to reject exchange request:', err)
    alert('Failed to reject exchange request.')
  }
}

const openRejectionModal = () => {
  rejectionModal.value = true
}

const acceptExchangeAction = async (action) => {
  try {
    const { id } = route.params
    if (action === 'handover') await exchangeStore.handoverAccept(id)
    if (action === 'inCharge') await exchangeStore.inChargeAccept(id)
    if (action === 'recommend') await exchangeStore.recommendByAccept(id)
    if (action === 'approve') await exchangeStore.approvedByAccept(id)
    alert(`${action} accepted successfully!`)
    await exchangeStore.fetchExchange(id)
  } catch (err) {
    console.error(`Failed to accept ${action}:`, err)
    alert(`Failed to accept ${action}.`)
  }
}

const goBack = () => router.go(-1)
</script>

<template>
  <div class="my-container max-w-3xl space-y-6">
    <div class="flex items-center justify-between gap-2 print:hidden">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-lg text-center">Exchange Details</h1>
      <div>
        <button class="btn-2" @click="print">
          <i class="far fa-print"></i>
          Print
        </button>
      </div>
    </div>

    <LoaderView v-if="loading" />

    <div v-else class="card-bg p-4 md:p-8">
      <h2 class="title-md">Exchange Request</h2>
      <div class="grid md:grid-cols-2">
        <div><b>Type:</b> {{ exchange?.exchange_type }}</div>
        <div><b>Current Date:</b> {{ exchange?.current_date }}</div>
        <div><b>Exchange Date:</b> {{ exchange?.exchange_date }}</div>
        <div><b>Status:</b> {{ exchange?.status || 'N/A' }}</div>
        <div><b>Works in Hand:</b> {{ exchange?.works_in_hand || 'N/A' }}</div>
      </div>

      <div class="grid md:grid-cols-2 gap-4 pt-10">
        <div>
          <hr class="w-44 border-black" />
          <div><b>Applicant</b></div>
          <p class="font-medium">{{ exchange?.user?.name }}</p>
          <div class="text-sm">
            <p>{{ exchange?.user?.department?.name }}</p>
            <p>{{ exchange?.user?.designation?.title }}</p>
          </div>
        </div>

        <div>
          <p>{{ exchange?.handover_user?.name || 'Not assigned' }}</p>
          <div
            v-if="!exchange?.status && exchange.handover_user_id === authStore.user.id"
            class="print:hidden"
          >
            <p class="text-xs">
              {{ exchange?.user?.name }} has assigned you for his handover.<br />
              Do you agree?
            </p>
            <div class="flex gap-2">
              <button
                class="font-bold text-lg text-green-600 px-2"
                @click="acceptExchangeAction('handover')"
              >
                ✔
              </button>
              <button class="px-2">❌</button>
            </div>
          </div>
          <hr class="w-44 border-black" />
          <h4 class="font-bold">
            Handover
            <span
              v-if="exchange?.handover_user_id && exchange?.status"
              class="text-green-600 print:text-black"
            >
              (✔)
            </span>
            <span
              v-if="exchange?.handover_user_id && !exchange?.status"
              class="pl-2 text-yellow-700"
              ><i class="fad fa-spinner"></i
            ></span>
          </h4>
        </div>
      </div>

      <hr />

      <div>
        <h3 class="title-md">
          Approvals
          <span
            :class="{
              'text-yellow-500': exchange?.status === 'Pending',
              'text-green-500': exchange?.status === 'Approved',
              'text-red-500': exchange?.status === 'Rejected',
            }"
          >
            ({{ exchange?.status || 'N/A' }})
          </span>
        </h3>
        <div v-if="exchange?.status === 'Rejected'">
          <div><b>Rejected By:</b> {{ exchange?.rejected_by_user?.name || 'N/A' }}</div>
          <div><b>Rejection Reason:</b> {{ exchange?.rejection_reason || 'N/A' }}</div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="pt-10">
          <div
            v-if="
              exchange.status !== 'Rejected' &&
              exchange.status !== 'Approved' &&
              !exchange?.in_charge_user_id &&
              exchange?.user?.other_approval?.in_charge_user_id === authStore.user.id
            "
            class="print:hidden"
          >
            <p class="">
              {{ exchange?.user?.other_approval?.in_charge_user?.name || 'N/A' }}
            </p>
            <p class="text-xs text-blue-600">
              {{ exchange?.user?.name }} has submitted an application. <br />
              Will you forward it?
            </p>
            <div class="flex gap-4">
              <button
                class="font-bold text-lg text-green-600"
                @click="acceptExchangeAction('inCharge')"
              >
                ✔
              </button>
              <button class="" @click="openRejectionModal">❌</button>
            </div>
          </div>
          <p>{{ exchange?.in_charge_user?.name || '' }}</p>
          <hr class="w-44 border-black" />
          <p class="font-bold">
            In-Charge
            <span v-if="exchange?.in_charge_user_id" class="text-green-600">(✔)</span>
          </p>
        </div>

        <div class="pt-10">
          <div
            v-if="
              exchange.status !== 'Rejected' &&
              exchange.status !== 'Approved' &&
              !exchange?.recommend_by_user_id &&
              exchange?.user?.other_approval?.recommend_by_user_id === authStore.user.id
            "
            class="print:hidden"
          >
            <p class="">
              {{ exchange?.user?.other_approval?.recommend_by_user?.name || 'N/A' }}
            </p>
            <p class="text-xs text-blue-600">
              {{ exchange?.user?.name }} has submitted an application.<br />
              Will you recommend it?
            </p>
            <div class="flex gap-4">
              <button
                class="font-bold text-lg text-green-600"
                @click="acceptExchangeAction('recommend')"
              >
                ✔
              </button>
              <button class="" @click="openRejectionModal">❌</button>
            </div>
          </div>
          <p>{{ exchange?.recommend_by_user?.name || '' }}</p>
          <hr class="w-44 border-black" />
          <p class="font-bold">
            Recommend By
            <span v-if="exchange?.recommend_by_user_id" class="text-green-600">(✔)</span>
          </p>
        </div>
      </div>

      <div class="flex flex-col pt-10">
        <div
          v-if="
            exchange.status !== 'Rejected' &&
            exchange.status !== 'Approved' &&
            !exchange?.approved_by_user_id &&
            exchange?.user?.other_approval?.approved_by_user_id === authStore.user.id
          "
          class="print:hidden"
        >
          <p class="">
            {{ exchange?.user?.other_approval?.approved_by_user?.name || 'N/A' }}
          </p>
          <p class="text-xs text-blue-600">
            {{ exchange?.user?.name }} has submitted an application.<br />
            Will you accept it?
          </p>
          <div class="flex gap-4">
            <button
              class="font-bold text-lg text-green-600"
              @click="acceptExchangeAction('approve')"
            >
              ✔
            </button>
            <button class="" @click="openRejectionModal">❌</button>
          </div>
        </div>
        <p>{{ exchange?.approved_by_user?.name || '' }}</p>
        <hr class="w-44 border-black" />
        <p class="font-bold">
          Approved By
          <span v-if="exchange?.approved_by_user_id" class="text-green-600">(✔)</span>
        </p>
      </div>
    </div>
    <ShareComponent />
  </div>

  <div v-if="rejectionModal" class="modal-bg">
    <div class="modal-card">
      <h3 class="title-lg">Reject Exchange Request</h3>
      <textarea
        v-model="rejectionReason"
        rows="4"
        placeholder="Enter rejection reason..."
        class="w-full border rounded-lg p-2 text-gray-700"
      ></textarea>
      <div class="flex justify-end gap-2 mt-4">
        <button class="btn-3" @click="rejectionModal = false">Cancel</button>
        <button class="btn-2 bg-red-500 text-white" @click="rejectExchange">Confirm</button>
      </div>
    </div>
  </div>
</template>
