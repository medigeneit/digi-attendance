<script setup>
import { onMounted, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useRouter } from 'vue-router';
import { useShortLeaveStore } from '@/stores/short-leave';
import LoaderView from '@/components/common/LoaderView.vue';

const route = useRoute();
const router = useRouter();
const shortLeaveStore = useShortLeaveStore();
const loading = ref(true);

const shortLeave = computed(() => shortLeaveStore.shortLeave);

onMounted(async () => {
  const { id } = route.params;
  try {
    await shortLeaveStore.fetchShortLeaveById(id);
  } catch (err) {
    console.error('Failed to fetch short leave details:', err);
  } finally {
    loading.value = false;
  }
});

const goBack = () => router.go(-1);
</script>

<template>
  <div class="my-container space-y-6">
    <div class="flex items-center justify-between gap-2">
      <button class="btn-3" @click="goBack">
        <i class="far fa-arrow-left"></i>
        <span class="hidden md:flex">Back</span>
      </button>
      <h1 class="title-md md:title-xl flex-wrap text-center">Short Leave Details</h1>
      <div></div>
    </div>

    <LoaderView v-if="loading" />

    <div v-else class="card-bg p-4 md:p-8 space-y-4">
      <!-- Leave Details -->
      <h2 class="text-lg font-semibold text-gray-700">Short Leave Details</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><strong>Date:</strong> {{ shortLeave?.date }}</div>
        <div><strong>Start Time:</strong> {{ shortLeave?.start_time }}</div>
        <div><strong>End Time:</strong> {{ shortLeave?.end_time }}</div>
        <div><strong>Total Minutes:</strong> {{ shortLeave?.total_minutes }}</div>
        <div><strong>Reason:</strong> {{ shortLeave?.reason || 'N/A' }}</div>
        <div><strong>Status:</strong>
          <span
            :class="{
              'text-yellow-500': shortLeave?.status === 'Pending',
              'text-green-500': shortLeave?.status === 'Approved',
              'text-red-500': shortLeave?.status === 'Rejected',
            }"
          >
            {{ shortLeave?.status }}
          </span>
        </div>
      </div>

      <hr />

      <!-- Handover Details -->
      <h3 class="text-lg font-semibold text-gray-700">Handover Details</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><strong>Handover User:</strong> {{ shortLeave?.handover_user?.name || 'N/A' }}</div>
        <div><strong>Works in Hand:</strong> {{ shortLeave?.works_in_hand || 'N/A' }}</div>
      </div>

      <hr />

      <!-- Approval Details -->
      <h3 class="text-lg font-semibold text-gray-700">Approval Details</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><strong>In-Charge:</strong> {{ shortLeave?.in_charge_user?.name || 'N/A' }}</div>
        <div><strong>Recommended By:</strong> {{ shortLeave?.recommend_by_user?.name || 'N/A' }}</div>
        <div><strong>Approved By:</strong> {{ shortLeave?.approved_by_user?.name || 'N/A' }}</div>
        <div><strong>Rejected By:</strong> {{ shortLeave?.rejected_by_user?.name || 'N/A' }}</div>
        <div><strong>Rejection Reason:</strong> {{ shortLeave?.rejection_reason || 'N/A' }}</div>
      </div>
    </div>
  </div>
</template>
