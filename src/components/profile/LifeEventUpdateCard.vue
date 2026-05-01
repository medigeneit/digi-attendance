<script setup>
import { computed, onMounted, ref } from 'vue'
import { useToast } from 'vue-toastification'
import { useLifeEventsStore } from '@/stores/lifeEvents'

const toast = useToast()
const store = useLifeEventsStore()

const defaultForm = () => ({
  event_type: 'marriage',
  event_date: '',
  spouse_name: '',
  child_name: '',
  child_gender: '',
  gift_received_before: false,
  note: '',
})

const form = ref(defaultForm())
const modalOpen = ref(false)

const isMarriage = computed(() => form.value.event_type === 'marriage')
const isChildBirth = computed(() => form.value.event_type === 'child_birth')

const eventLabel = (value) => ({
  marriage: 'Marriage',
  child_birth: 'Child Birth',
}[value] || value || '-')

const statusClass = (status) => ({
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-rose-200 bg-rose-50 text-rose-700',
}[status] || 'border-slate-200 bg-slate-50 text-slate-600')

const giftLabel = (status) => ({
  not_started: 'Not Started',
  processing: 'Processing',
  given: 'Given',
}[status] || '-')

const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-GB') : '-'

const resetForm = () => {
  form.value = defaultForm()
}

const openModal = () => {
  resetForm()
  store.formError = ''
  store.errors = {}
  modalOpen.value = true
}

const closeModal = () => {
  if (store.saving) return
  modalOpen.value = false
  resetForm()
}

const submit = async () => {
  const ok = await store.submitMine(form.value)
  if (ok) {
    toast.success('Life event request submitted.')
    resetForm()
    modalOpen.value = false
  } else {
    toast.error(store.formError || 'Submission failed.')
  }
}

onMounted(() => store.fetchMine())
</script>

<template>
  <section class="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2 dark:border-slate-800">
      <div>
        <h2 class="text-sm font-semibold text-slate-900 dark:text-white">Life Event Update</h2>
        <p class="mt-0.5 text-xs text-slate-500">Marriage or child birth information for HR record and gift processing.</p>
      </div>
      <button
        type="button"
        class="inline-flex h-8 items-center gap-1.5 rounded-md bg-indigo-600 px-3 text-xs font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        @click="openModal"
      >
        <i class="far fa-plus"></i>
        Marriage/Child Info Update
      </button>
    </div>

    <div class="px-4 py-3 dark:border-slate-800">
      <h3 class="mb-2 text-xs font-semibold uppercase text-slate-500">Request History</h3>
      <div v-if="store.loading" class="py-3 text-sm text-slate-500">Loading...</div>
      <div v-else-if="!store.myItems.length" class="rounded-md border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-500">
        No life event request submitted yet.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[720px] text-left text-sm">
          <thead class="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th class="px-3 py-2">Event</th>
              <th class="px-3 py-2">Date</th>
              <th class="px-3 py-2">Name</th>
              <th class="px-3 py-2">Status</th>
              <th class="px-3 py-2">Gift</th>
              <th class="px-3 py-2">Previous Gift</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="item in store.myItems" :key="item.id">
              <td class="px-3 py-2 font-medium text-slate-800">{{ eventLabel(item.event_type) }}</td>
              <td class="px-3 py-2">{{ formatDate(item.event_date) }}</td>
              <td class="px-3 py-2">{{ item.spouse_name || item.child_name || '-' }}</td>
              <td class="px-3 py-2">
                <span class="rounded-full border px-2 py-0.5 text-xs font-medium capitalize" :class="statusClass(item.status)">
                  {{ item.status }}
                </span>
              </td>
              <td class="px-3 py-2">{{ giftLabel(item.gift_status) }}</td>
              <td class="px-3 py-2">
                <span :class="item.gift_received_before ? 'text-emerald-700' : 'text-slate-500'">
                  {{ item.gift_received_before ? 'Yes' : 'No' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="modalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      @click.self="closeModal"
    >
      <div class="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl dark:bg-slate-900">
        <div class="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 class="text-base font-semibold text-slate-900 dark:text-white">Life Event Update</h2>
            <p class="mt-1 text-sm text-slate-500">Submit marriage or child birth information for HR record and review.</p>
          </div>
          <button
            type="button"
            class="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            @click="closeModal"
          >
            <i class="far fa-times"></i>
          </button>
        </div>

        <form class="max-h-[75vh] overflow-y-auto p-5" @submit.prevent="submit">
          <div class="grid gap-3 md:grid-cols-2">
            <div>
              <label class="mb-1 block text-xs font-medium text-slate-600">Event Type</label>
              <select v-model="form.event_type" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                <option value="marriage">Marriage</option>
                <option value="child_birth">Child Birth</option>
              </select>
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium text-slate-600">Event Date <span class="text-rose-500">*</span></label>
              <input v-model="form.event_date" type="date" required class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
              <p v-if="store.errors.event_date" class="mt-1 text-xs text-rose-600">{{ store.errors.event_date[0] }}</p>
            </div>

            <div v-if="isMarriage">
              <label class="mb-1 block text-xs font-medium text-slate-600">Spouse Name <span class="text-rose-500">*</span></label>
              <input v-model.trim="form.spouse_name" type="text" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
              <p v-if="store.errors.spouse_name" class="mt-1 text-xs text-rose-600">{{ store.errors.spouse_name[0] }}</p>
            </div>

            <div v-if="isChildBirth">
              <label class="mb-1 block text-xs font-medium text-slate-600">Child Name <span class="text-rose-500">*</span></label>
              <input v-model.trim="form.child_name" type="text" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
              <p v-if="store.errors.child_name" class="mt-1 text-xs text-rose-600">{{ store.errors.child_name[0] }}</p>
            </div>

            <div v-if="isChildBirth">
              <label class="mb-1 block text-xs font-medium text-slate-600">Child Gender</label>
              <select v-model="form.child_gender" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div class="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <label class="inline-flex items-start gap-2 text-sm font-medium text-slate-700">
                <input v-model="form.gift_received_before" type="checkbox" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <span>Already received office gift for this event</span>
              </label>
              <p class="mt-1 text-xs text-slate-500">If checked, this will be saved as approved with gift already given.</p>
            </div>

            <div class="md:col-span-2">
              <label class="mb-1 block text-xs font-medium text-slate-600">Note</label>
              <textarea v-model.trim="form.note" rows="3" class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"></textarea>
            </div>

            <div v-if="store.formError" class="md:col-span-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {{ store.formError }}
            </div>
          </div>

          <div class="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              class="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              :disabled="store.saving"
              @click="closeModal"
            >
              Cancel
            </button>
            <button type="submit" class="inline-flex h-9 items-center gap-2 rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60" :disabled="store.saving">
              <i class="far" :class="store.saving ? 'fa-spinner fa-spin' : 'fa-paper-plane'"></i>
              {{ store.saving ? 'Submitting...' : 'Submit Request' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>
