<script setup>
import { ref, computed } from 'vue'
import apiClient from '@/axios'
import { formatCurrency } from '@/utils/currency'

const props = defineProps({
  year: Number,
  month: Number,
  modelValue: Boolean,
})

const emit = defineEmits(['update:modelValue', 'confirmed'])

const loading = ref(false)
const previewData = ref(null)
const error = ref('')

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const getSettlementType = (adj) => String(adj?.settlement_type || 'carry_forward')

const carryForwardAdjustments = computed(() => {
  if (!previewData.value) return []
  return previewData.value.filter((adj) => adj.status === 'approved' && getSettlementType(adj) !== 'manual_settled')
})

const manualSettledAdjustments = computed(() => {
  if (!previewData.value) return []
  return previewData.value.filter((adj) => adj.status === 'approved' && getSettlementType(adj) === 'manual_settled')
})

const totalCarryForwardImpact = computed(() => {
  return carryForwardAdjustments.value.reduce((sum, adj) => sum + parseFloat(adj.amount || 0), 0)
})

const totalManualSettledAmount = computed(() => {
  return manualSettledAdjustments.value.reduce((sum, adj) => sum + parseFloat(adj.amount || 0), 0)
})

const loadPreview = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await apiClient.get(`/payroll-adjustments/preview/carry-forward/${props.year}/${props.month}`)
    previewData.value = res.data?.data || []
  } catch (e) {
    error.value = e.message || 'Failed to load adjustments preview.'
    previewData.value = []
  } finally {
    loading.value = false
  }
}

const handleConfirm = () => {
  emit('confirmed')
  isOpen.value = false
}

const handleOpen = () => {
  previewData.value = null
  error.value = ''
  loadPreview()
}

const handleClose = () => {
  isOpen.value = false
}

defineExpose({ handleOpen })
</script>

<template>
  <teleport to="body">
    <transition name="modal">
      <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div class="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
          <!-- Header -->
          <div class="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-xl font-bold text-slate-900">Payroll Adjustments Preview</h2>
                <p class="mt-1 text-sm text-slate-500">
                  Carry-forward affects net salary. Manual settled is injected as a contra entry (net effect = 0).
                </p>
              </div>
              <button @click="handleClose" class="text-slate-400 hover:text-slate-600">
                <i class="fas fa-times text-xl"></i>
              </button>
            </div>
          </div>

          <!-- Content -->
          <div class="space-y-4 px-6 py-5">
            <!-- Loading state -->
            <div v-if="loading" class="flex items-center justify-center py-12">
              <div class="text-center">
                <i class="fas fa-spinner fa-spin text-3xl text-blue-500 mb-3"></i>
                <p class="text-slate-600">Loading adjustments...</p>
              </div>
            </div>

            <!-- Error state -->
            <div
              v-else-if="error"
              class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3"
            >
              <i class="fas fa-exclamation-circle mt-0.5 flex-shrink-0"></i>
              <div>{{ error }}</div>
            </div>

            <!-- Empty state -->
            <div v-else-if="!previewData || previewData.length === 0" class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <i class="fas fa-check-circle text-3xl text-emerald-600 mb-2"></i>
              <p class="text-slate-600">No adjustments to apply for this month.</p>
            </div>

            <!-- Approved Adjustments Section -->
            <template v-else>
              <div v-if="carryForwardAdjustments.length > 0" class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div class="mb-3 flex items-center gap-2">
                  <i class="fas fa-check-circle text-emerald-600"></i>
                  <h3 class="font-semibold text-emerald-900">Carry Forward ({{ carryForwardAdjustments.length }})</h3>
                </div>
                <div class="space-y-2">
                  <div
                    v-for="adj in carryForwardAdjustments"
                    :key="adj.id"
                    class="flex items-center justify-between rounded-lg bg-white px-3 py-2.5 text-sm"
                  >
                    <div class="flex-1">
                      <div class="font-medium text-slate-900">
                        {{ adj.employee?.name || 'Unknown' }}
                        <span class="ml-2 text-xs font-normal text-slate-500">
                          ({{ adj.employee?.employee_id }})
                        </span>
                      </div>
                      <div class="text-xs text-slate-500 capitalize">{{ adj.adjustment_type }}</div>
                    </div>
                    <div
                      :class="[
                        'font-mono font-semibold',
                        parseFloat(adj.amount) >= 0 ? 'text-emerald-700' : 'text-red-700',
                      ]"
                    >
                      {{ parseFloat(adj.amount) >= 0 ? '+' : '' }}{{ formatCurrency(adj.amount) }}
                    </div>
                  </div>
                  <div class="border-t border-emerald-200 pt-2 flex justify-between font-semibold text-emerald-900">
                    <span>Total Impact (Carry Forward)</span>
                    <span
                      :class="[
                        'font-mono',
                        totalCarryForwardImpact >= 0 ? 'text-emerald-700' : 'text-red-700',
                      ]"
                    >
                      {{ totalCarryForwardImpact >= 0 ? '+' : '' }}{{ formatCurrency(totalCarryForwardImpact) }}
                    </span>
                  </div>
                </div>
              </div>

              <div v-if="manualSettledAdjustments.length > 0" class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div class="mb-3 flex items-center gap-2">
                  <i class="fas fa-balance-scale text-slate-600"></i>
                  <h3 class="font-semibold text-slate-900">
                    Manual Settled (Contra, Net 0) ({{ manualSettledAdjustments.length }})
                  </h3>
                </div>
                <p class="text-sm text-slate-700 mb-3">
                  These items are injected as <strong>Earning +Amount</strong> and <strong>Deduction +Amount</strong> (net salary unchanged).
                </p>
                <div class="space-y-2">
                  <div
                    v-for="adj in manualSettledAdjustments"
                    :key="adj.id"
                    class="flex items-center justify-between rounded-lg bg-white px-3 py-2.5 text-sm"
                  >
                    <div class="flex-1">
                      <div class="font-medium text-slate-900">
                        {{ adj.employee?.name || 'Unknown' }}
                        <span class="ml-2 text-xs font-normal text-slate-500">
                          ({{ adj.employee?.employee_id }})
                        </span>
                      </div>
                      <div class="text-xs text-slate-500 capitalize">{{ adj.adjustment_type }}</div>
                    </div>
                    <div
                      :class="[
                        'font-mono font-semibold',
                        parseFloat(adj.amount) >= 0 ? 'text-emerald-700' : 'text-red-700',
                      ]"
                    >
                      {{ parseFloat(adj.amount) >= 0 ? '+' : '' }}{{ formatCurrency(adj.amount) }}
                    </div>
                  </div>
                  <div class="border-t border-slate-200 pt-2 flex justify-between font-semibold text-slate-900">
                    <span>Total Amount (Contra)</span>
                    <span :class="['font-mono', totalManualSettledAmount >= 0 ? 'text-emerald-700' : 'text-red-700']">
                      {{ totalManualSettledAmount >= 0 ? '+' : '' }}{{ formatCurrency(totalManualSettledAmount) }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <h3 class="font-semibold text-blue-900 mb-3">Summary</h3>
                <div class="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p class="text-blue-700">Total Carry Forward</p>
                    <p
                      :class="[
                        'font-mono font-bold text-lg',
                        totalCarryForwardImpact >= 0 ? 'text-emerald-700' : 'text-red-700',
                      ]"
                    >
                      {{ totalCarryForwardImpact >= 0 ? '+' : '' }}{{ formatCurrency(totalCarryForwardImpact) }}
                    </p>
                  </div>
                  <div>
                    <p class="text-blue-700">Total Manual Settled</p>
                    <p
                      :class="[
                        'font-mono font-bold text-lg',
                        totalManualSettledAmount >= 0 ? 'text-emerald-700' : 'text-red-700',
                      ]"
                    >
                      {{ totalManualSettledAmount >= 0 ? '+' : '' }}{{ formatCurrency(totalManualSettledAmount) }}
                    </p>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Footer -->
          <div class="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4 flex justify-end gap-3">
            <button class="btn-3" @click="handleClose">Cancel</button>
            <button
              class="btn-2"
              @click="handleConfirm"
              :disabled="loading"
            >
              <i class="far fa-cog"></i>
              {{ loading ? 'Loading...' : 'Confirm & Generate' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active :deep(.bg-white),
.modal-leave-active :deep(.bg-white) {
  transition: transform 0.3s ease;
}

.modal-enter-from :deep(.bg-white),
.modal-leave-to :deep(.bg-white) {
  transform: scale(0.95);
}
</style>
