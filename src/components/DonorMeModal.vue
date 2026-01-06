<script setup>
import { computed, onBeforeUnmount, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useBloodDonorMeStore } from '@/stores/bloodDonorMe'

const store = useBloodDonorMeStore()

const {
  modalOpen,
  loading,
  saving,
  deletingId,
  errorMessage,
  errors,
  user,
  histories,
  form,
  editId,
} = storeToRefs(store)

const isEditMode = computed(() => !!editId.value)

const fieldError = (field) => {
  const fieldErrors = errors.value?.[field]
  if (!fieldErrors) return ''
  if (Array.isArray(fieldErrors)) return fieldErrors[0] || ''
  return String(fieldErrors)
}

const isAvailable = (row) =>
  row?.is_available === true ||
  row?.is_available === 1 ||
  row?.is_available === '1' ||
  row?.is_available === 'true'

const availabilityLabel = (row) => (isAvailable(row) ? 'Available' : 'Not Available')

const availabilityClass = (row) =>
  isAvailable(row)
    ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700'
    : 'rounded-full bg-rose-100 px-2 py-0.5 text-rose-700'

const statusClass = (status) => {
  if (status === 'active') return 'rounded-full bg-blue-100 px-2 py-0.5 text-blue-700'
  if (status === 'inactive') return 'rounded-full bg-amber-100 px-2 py-0.5 text-amber-700'
  if (status === 'blocked') return 'rounded-full bg-rose-100 px-2 py-0.5 text-rose-700'
  return 'rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600'
}

const closeModal = () => store.closeModal()

const onDelete = (row) => {
  if (!row?.id) return
  if (!window.confirm('Delete this donation history?')) return
  store.deleteHistory(row.id)
}

const onKeydown = (event) => {
  if (event.key === 'Escape') closeModal()
}

watch(
  modalOpen,
  (open) => {
    if (open) {
      window.addEventListener('keydown', onKeydown)
    } else {
      window.removeEventListener('keydown', onKeydown)
    }
  },
  { immediate: true }
)

watch(
  () => form.value.has_disease,
  (val) => {
    if (!val) form.value.disease_note = ''
  }
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div v-if="modalOpen" class="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6 top-4">
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      @click="saving ? null : closeModal"
    ></div>

    <!-- Modal -->
    <div class="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
      <!-- Sticky Header -->
      <div class="sticky top-0 z-10 flex items-center justify-between border-b bg-white/90 px-5 py-4 backdrop-blur">
        <div class="space-y-0.5">
          <h3 class="text-base font-semibold text-zinc-900">My Blood Donor Profile</h3>
        </div>

        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
          @click="closeModal"
          :disabled="saving"
          aria-label="Close"
          title="Close"
        >
          <i class="far fa-times"></i>
        </button>
      </div>

      <!-- Body (scrollable) -->
      <div class="max-h-[75vh] overflow-y-auto p-5">
        <!-- Global error -->
        <div
          v-if="errorMessage"
          class="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {{ errorMessage }}
        </div>

        <!-- Loading -->
        <div v-if="loading" class="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          Loading profile...
        </div>
        <!-- Main content grid -->
        <div class="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <!-- Left: Form -->
          <div class="lg:col-span-3 space-y-5">
            <!-- Donation Availability -->
            <div class="rounded-2xl border border-zinc-200 bg-white p-4">
              <div class="mb-3 flex items-center justify-between">
                <div>
                  <h4 class="text-sm font-semibold text-zinc-900">Donation availability</h4>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <!-- Last Donation Date -->
                <div class="space-y-1">
                  <label class="text-xs font-medium text-zinc-600">Last donation date *</label>
                  <input
                    :value="form.last_donation_date"
                    type="date"
                    class="input-1 h-10 w-full text-sm"
                    :class="fieldError('last_donation_date') ? 'ring-2 ring-rose-200 border-rose-300' : ''"
                    :disabled="loading || saving"
                    @input="store.setLastDonationDate($event.target.value)"
                  />
                  <p v-if="fieldError('last_donation_date')" class="text-xs text-rose-600">
                    {{ fieldError('last_donation_date') }}
                  </p>
                </div>

                <!-- Available From -->
                <div class="space-y-1">
                  <label class="text-xs font-medium text-zinc-600">Available from</label>
                  <input
                    :value="form.available_from"
                    type="date"
                    class="input-1 h-10 w-full text-sm bg-zinc-50 text-zinc-700"
                    readonly
                  />
                </div>

                <!-- Switches -->
                <div class="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <div>
                    <div class="text-sm font-medium text-zinc-800">Available for donation</div>
                    <div class="text-xs text-zinc-500">Show availability to others</div>
                  </div>
                  <input
                    id="is_available_me"
                    v-model="form.is_available"
                    type="checkbox"
                    class="h-5 w-5"
                    :disabled="loading || saving"
                  />
                </div>

                <div class="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <div>
                    <div class="text-sm font-medium text-zinc-800">Has disease</div>
                    <div class="text-xs text-zinc-500">Optional disclosure</div>
                  </div>
                  <input
                    id="has_disease_me"
                    v-model="form.has_disease"
                    type="checkbox"
                    class="h-5 w-5"
                    :disabled="loading || saving"
                  />
                </div>

                <!-- Availability Note -->
                <div class="space-y-1 md:col-span-2">
                  <label class="text-xs font-medium text-zinc-600">Availability note</label>
                  <input
                    v-model.trim="form.availability_note"
                    type="text"
                    class="input-1 h-10 w-full text-sm"
                    placeholder="e.g., Weekend only / After 6pm"
                    :disabled="loading || saving"
                  />
                  <p v-if="fieldError('availability_note')" class="text-xs text-rose-600">
                    {{ fieldError('availability_note') }}
                  </p>
                </div>

                <!-- Disease Note (animated) -->
                <transition
                  enter-active-class="transition duration-200 ease-out"
                  enter-from-class="opacity-0 -translate-y-1"
                  enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition duration-150 ease-in"
                  leave-from-class="opacity-100 translate-y-0"
                  leave-to-class="opacity-0 -translate-y-1"
                >
                  <div v-if="form.has_disease" class="space-y-1 md:col-span-2">
                    <label class="text-xs font-medium text-zinc-600">Disease note</label>
                    <textarea
                      v-model.trim="form.disease_note"
                      class="input-1 min-h-[90px] w-full text-sm"
                      placeholder="Mention disease details briefly..."
                      :disabled="loading || saving"
                    ></textarea>
                    <p v-if="fieldError('disease_note')" class="text-xs text-rose-600">
                      {{ fieldError('disease_note') }}
                    </p>
                  </div>
                </transition>
              </div>
            </div>

            <!-- Status & Notes -->
            <div class="rounded-2xl border border-zinc-200 bg-white p-4">
              <h4 class="text-sm font-semibold text-zinc-900">Profile settings</h4>

              <div class="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div class="space-y-1">
                  <label class="text-xs font-medium text-zinc-600">Status</label>
                  <select v-model="form.status" class="input-1 h-10 w-full text-sm" :disabled="loading || saving">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                  </select>
                  <p v-if="fieldError('status')" class="text-xs text-rose-600">
                    {{ fieldError('status') }}
                  </p>
                </div>

                <div class="space-y-1 md:col-span-2">
                  <label class="text-xs font-medium text-zinc-600">Notes</label>
                  <textarea
                    v-model.trim="form.notes"
                    class="input-1 min-h-[80px] w-full text-sm"
                    placeholder="Any extra info you want to share..."
                    :disabled="loading || saving"
                  ></textarea>
                  <p v-if="fieldError('notes')" class="text-xs text-rose-600">
                    {{ fieldError('notes') }}
                  </p>
                </div>

                <!-- Actions -->
                <div class="md:col-span-2 flex flex-wrap items-center justify-end gap-2 pt-2">
                  <button type="button" class="btn-3" :disabled="saving || loading" @click="store.resetForm">
                    Reset
                  </button>

                  <button type="button" class="btn-1" :disabled="saving || loading" @click="store.saveHistory">
                    <span v-if="saving">{{ isEditMode ? 'Updating...' : 'Saving...' }}</span>
                    <span v-else>{{ isEditMode ? 'Update' : 'Save' }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: History -->
          <div class="lg:col-span-2">
            <div class="rounded-2xl border border-zinc-200 bg-white p-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h4 class="text-sm font-semibold text-zinc-900">Donation history</h4>
                </div>
                <div v-if="histories.length" class="text-xs text-zinc-500">
                  {{ histories.length }} entries
                </div>
              </div>

              <div v-if="loading" class="mt-3 text-sm text-zinc-500">Loading history...</div>
              <div v-else-if="!histories.length" class="mt-3 text-sm text-zinc-500">
                No donation history yet.
              </div>

              <div v-else class="mt-4 space-y-3">
                <div
                  v-for="row in histories"
                  :key="row.id"
                  class="rounded-xl border border-zinc-200 p-3 hover:bg-zinc-50 transition"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <div class="text-sm font-semibold text-zinc-900">
                        {{ row.last_donation_date || 'N/A' }}
                      </div>
                      <div class="mt-1 text-xs text-zinc-500">
                        Available from: {{ row.available_from || 'N/A' }}
                      </div>
                    </div>

                    <div class="flex flex-col items-end gap-1 text-xs">
                      <span :class="availabilityClass(row)">
                        {{ availabilityLabel(row) }}
                      </span>
                      <span :class="statusClass(row.status)">
                        {{ row.status || 'N/A' }}
                      </span>
                    </div>
                  </div>

                  <div class="mt-3 flex flex-wrap gap-2">
                    <button type="button" class="btn-2 py-1 text-xs" :disabled="saving || loading" @click="store.editHistory(row)">
                      Edit
                    </button>

                    <!-- <button
                      type="button"
                      class="btn-2-red  py-1 text-xs"
                      :disabled="saving || loading || deletingId === row.id"
                      @click="onDelete(row)"
                    >
                      <span v-if="deletingId === row.id">Deleting...</span>
                      <span v-else>Delete</span>
                    </button> -->
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sticky Footer -->
      <div class="sticky bottom-0 z-10 flex items-center justify-between border-t bg-zinc-50 px-5 py-3">
        <div class="text-xs text-zinc-500">
          Press <span class="rounded bg-white px-1.5 py-0.5 ring-1 ring-zinc-200">Esc</span> to close
        </div>

        <button type="button" class="btn-3" @click="closeModal" :disabled="saving">
          Close
        </button>
      </div>
    </div>
  </div>
</template>

