<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useDisciplineReportStore } from '@/stores/useDisciplineReportStore'
import LetterEditor from '@/components/discipline/LetterEditor.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  user: { type: Object, default: null },
  year: { type: Number, default: new Date().getFullYear() },
  monthStart: { type: String, default: '' },
  record: { type: Object, default: null },
  initialTab: { type: String, default: 'indiscipline' },
  editItem: { type: Object, default: null },
  editType: { type: String, default: '' },
})

const emit = defineEmits(['close'])

const reportStore = useDisciplineReportStore()
const activeTab = ref(props.initialTab || 'indiscipline')
const isSaving = ref(false)

const manualForm = reactive({
  id: null,
  title: '',
  note: '',
  type: 'others',
})

const attachmentMode = ref('file')
const attachmentTitle = ref('')
const attachmentFile = ref(null)
const attachmentDocType = ref('other')
const letterForm = reactive({ title: '', body_html: '', doc_type: 'other' })

const userId = computed(() => props.user?.id || props.user?.user_id)
const recordId = computed(() => props.record?.id || props.record?.month_record_id)

const manualIndisciplines = computed(
  () =>
    props.record?.manual_indisciplines ||
    props.record?.indisciplines ||
    props.record?.manualIndisciplines ||
    []
)

const manualActions = computed(
  () => props.record?.manual_actions || props.record?.actions || props.record?.manualActions || []
)

const attachments = computed(() => {
  const files =
    props.record?.attachments ||
    props.record?.attachment_files ||
    props.record?.files ||
    []
  const letters =
    props.record?.letters ||
    props.record?.text_letters ||
    props.record?.letter_attachments ||
    []
  return [
    ...files.map((item) => ({ ...item, _type: 'file' })),
    ...letters.map((item) => ({ ...item, _type: 'letter' })),
  ]
})

const itemLabel = (item) =>
  item?.title ||
  item?.reason ||
  item?.note ||
  item?.label ||
  item?.text ||
  item?.description ||
  'Untitled'

const resetManualForm = () => {
  manualForm.id = null
  manualForm.title = ''
  manualForm.note = ''
  manualForm.type = 'others'
}

const startEdit = (type, item) => {
  activeTab.value = type
  manualForm.id = item?.id || null
  manualForm.title = item?.title || item?.reason || item?.label || ''
  manualForm.note = item?.note || item?.description || ''
  manualForm.type = item?.type || 'others'
}

watch(
  () => props.open,
  async (value) => {
    if (!value) return
    activeTab.value = props.initialTab || 'indiscipline'
    resetManualForm()
    attachmentMode.value = 'file'
    attachmentTitle.value = ''
    attachmentFile.value = null
    attachmentDocType.value = 'other'
    letterForm.title = ''
    letterForm.body_html = ''
    letterForm.doc_type = 'other'
    if (userId.value && props.monthStart) {
      await reportStore.ensureMonthRecord(userId.value, props.year, props.monthStart)
    }
    if (props.editItem) {
      startEdit(props.editType || activeTab.value, props.editItem)
    }
  }
)

watch(
  () => props.initialTab,
  (value) => {
    if (props.open && value) activeTab.value = value
  }
)

watch(
  () => props.editItem,
  (item) => {
    if (props.open && item) startEdit(props.editType || activeTab.value, item)
  }
)

watch(activeTab, () => {
  if (!manualForm.id) resetManualForm()
})

const saveManual = async () => {
  if (!manualForm.title && !manualForm.note) return
  if (!userId.value || !props.monthStart) return
  isSaving.value = true
  const basePayload = {
    user_id: userId.value,
    year: props.year,
    month_start: props.monthStart,
    type: manualForm.type,
    title: manualForm.title,
    note: manualForm.note,
  }
  if (recordId.value) basePayload.month_record_id = recordId.value

  try {
    if (activeTab.value === 'indiscipline') {
      if (manualForm.id) {
        await reportStore.updateManualIndiscipline(
          manualForm.id,
          { title: manualForm.title, note: manualForm.note, type: manualForm.type },
          { user_id: userId.value, month_start: props.monthStart }
        )
      } else {
        await reportStore.createManualIndiscipline(basePayload)
      }
    } else {
      if (manualForm.id) {
        await reportStore.updateManualAction(
          manualForm.id,
          { title: manualForm.title, note: manualForm.note, type: manualForm.type },
          { user_id: userId.value, month_start: props.monthStart }
        )
      } else {
        await reportStore.createManualAction(basePayload)
      }
    }
    resetManualForm()
  } catch (err) {
    console.error('Failed to save manual item:', err)
  } finally {
    isSaving.value = false
  }
}

const deleteManualItem = async (type, item) => {
  if (!item?.id) return
  if (!confirm('Delete this item?')) return
  if (type === 'indiscipline') {
    await reportStore.deleteManualIndiscipline(item.id, { month_start: props.monthStart })
  } else {
    await reportStore.deleteManualAction(item.id, { month_start: props.monthStart })
  }
}

const onFileChange = (event) => {
  const file = event.target.files?.[0]
  attachmentFile.value = file || null
}

const uploadAttachment = async () => {
  if (!attachmentFile.value || !userId.value || !props.monthStart) return
  isSaving.value = true
  try {
    await reportStore.uploadAttachment({
      file: attachmentFile.value,
      title: attachmentTitle.value,
      doc_type: attachmentDocType.value,
      mode: 'file',
      user_id: userId.value,
      month_start: props.monthStart,
      year: props.year,
    })
    attachmentFile.value = null
    attachmentTitle.value = ''
    attachmentDocType.value = 'other'
  } catch (err) {
    console.error('Failed to upload attachment:', err)
  } finally {
    isSaving.value = false
  }
}

const saveLetter = async () => {
  if (!letterForm.title || !letterForm.body_html) return
  if (!userId.value || !props.monthStart) return
  isSaving.value = true
  try {
    await reportStore.createLetter({
      title: letterForm.title,
      body_html: letterForm.body_html,
      doc_type: letterForm.doc_type,
      mode: 'text',
      user_id: userId.value,
      month_start: props.monthStart,
      year: props.year,
    })
    letterForm.title = ''
    letterForm.body_html = ''
    letterForm.doc_type = 'other'
  } catch (err) {
    console.error('Failed to save letter:', err)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/40">
    <div class="w-full max-w-4xl rounded-2xl border border-slate-100 bg-white shadow-xl">
      <div class="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Month Record</p>
          <h3 class="text-lg font-semibold text-slate-800">
            {{ user?.name || user?.user || 'Employee' }}
          </h3>
          <p class="text-xs text-slate-500">{{ monthStart }}</p>
        </div>
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
          @click="emit('close')"
        >
          <i class="far fa-times"></i>
        </button>
      </div>

      <div class="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
        <button
          type="button"
          class="tab-btn"
          :class="{ 'tab-btn--active': activeTab === 'indiscipline' }"
          @click="activeTab = 'indiscipline'"
        >
          Indiscipline
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ 'tab-btn--active': activeTab === 'action' }"
          @click="activeTab = 'action'"
        >
          Action
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ 'tab-btn--active': activeTab === 'attachment' }"
          @click="activeTab = 'attachment'"
        >
          Attachment / Letter
        </button>
      </div>

      <div class="max-h-[70vh] overflow-auto px-5 py-4">
        <div v-if="activeTab === 'indiscipline'" class="grid gap-4 md:grid-cols-[1.1fr_1fr]">
          <div class="space-y-3">
            <h4 class="text-sm font-semibold text-slate-700">Manual Indiscipline</h4>
            <div class="space-y-2">
              <input
                v-model="manualForm.title"
                type="text"
                placeholder="Title"
                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              <div>
                <label class="text-[11px] font-semibold text-slate-500">Type</label>
                <select
                  v-model="manualForm.type"
                  class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="misconduct">Misconduct</option>
                  <option value="negligence">Negligence</option>
                  <option value="others">Others</option>
                </select>
              </div>
              <textarea
                v-model="manualForm.note"
                rows="3"
                placeholder="Notes"
                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              ></textarea>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                  :disabled="isSaving"
                  @click="saveManual"
                >
                  {{ manualForm.id ? 'Update' : 'Save' }}
                </button>
                <button
                  v-if="manualForm.id"
                  type="button"
                  class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                  @click="resetManualForm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <h4 class="text-sm font-semibold text-slate-700">Existing Manual Items</h4>
            <div class="space-y-2">
              <div
                v-for="item in manualIndisciplines"
                :key="item?.id || itemLabel(item)"
                class="rounded-lg border border-slate-100 bg-slate-50/70 p-2"
              >
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="text-xs font-semibold text-slate-700">{{ itemLabel(item) }}</p>
                    <p v-if="item?.note || item?.description" class="text-[11px] text-slate-500">
                      {{ item?.note || item?.description }}
                    </p>
                  </div>
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      class="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-white"
                      @click="startEdit('indiscipline', item)"
                    >
                      <i class="far fa-pen text-[11px]"></i>
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-7 w-7 items-center justify-center rounded-full text-rose-500 hover:bg-white"
                      @click="deleteManualItem('indiscipline', item)"
                    >
                      <i class="far fa-trash text-[11px]"></i>
                    </button>
                  </div>
                </div>
              </div>

              <p v-if="manualIndisciplines.length === 0" class="text-xs text-slate-400">
                No manual indiscipline items yet.
              </p>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'action'" class="grid gap-4 md:grid-cols-[1.1fr_1fr]">
          <div class="space-y-3">
            <h4 class="text-sm font-semibold text-slate-700">Manual Action</h4>
            <div class="space-y-2">
              <input
                v-model="manualForm.title"
                type="text"
                placeholder="Title"
                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              <div>
                <label class="text-[11px] font-semibold text-slate-500">Type</label>
                <select
                  v-model="manualForm.type"
                  class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="warning">Warning</option>
                  <option value="showcause">Show Cause</option>
                  <option value="notice">Notice</option>
                  <option value="training">Training</option>
                  <option value="counselling">Counselling</option>
                  <option value="suspension">Suspension</option>
                  <option value="others">Others</option>
                </select>
              </div>
              <textarea
                v-model="manualForm.note"
                rows="3"
                placeholder="Notes"
                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              ></textarea>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                  :disabled="isSaving"
                  @click="saveManual"
                >
                  {{ manualForm.id ? 'Update' : 'Save' }}
                </button>
                <button
                  v-if="manualForm.id"
                  type="button"
                  class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                  @click="resetManualForm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <h4 class="text-sm font-semibold text-slate-700">Existing Manual Actions</h4>
            <div class="space-y-2">
              <div
                v-for="item in manualActions"
                :key="item?.id || itemLabel(item)"
                class="rounded-lg border border-slate-100 bg-slate-50/70 p-2"
              >
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="text-xs font-semibold text-slate-700">{{ itemLabel(item) }}</p>
                    <p v-if="item?.note || item?.description" class="text-[11px] text-slate-500">
                      {{ item?.note || item?.description }}
                    </p>
                  </div>
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      class="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-white"
                      @click="startEdit('action', item)"
                    >
                      <i class="far fa-pen text-[11px]"></i>
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-7 w-7 items-center justify-center rounded-full text-rose-500 hover:bg-white"
                      @click="deleteManualItem('action', item)"
                    >
                      <i class="far fa-trash text-[11px]"></i>
                    </button>
                  </div>
                </div>
              </div>

              <p v-if="manualActions.length === 0" class="text-xs text-slate-400">
                No manual actions yet.
              </p>
            </div>
          </div>
        </div>

        <div v-else class="space-y-4">
          <div class="flex flex-wrap items-center gap-4">
            <label class="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input
                type="radio"
                class="text-slate-700"
                value="file"
                v-model="attachmentMode"
              />
              File Upload
            </label>
            <label class="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input
                type="radio"
                class="text-slate-700"
                value="letter"
                v-model="attachmentMode"
              />
              Write Letter
            </label>
          </div>

          <div v-if="attachmentMode === 'file'" class="grid gap-3 md:grid-cols-[1fr_auto]">
            <div class="space-y-2">
              <input
                v-model="attachmentTitle"
                type="text"
                placeholder="Attachment title (optional)"
                class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              <div>
                <label class="text-[11px] font-semibold text-slate-500">Doc Type</label>
                <select
                  v-model="attachmentDocType"
                  class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="warning_letter">Warning Letter</option>
                  <option value="showcause">Show Cause</option>
                  <option value="notice">Notice</option>
                  <option value="proof">Proof</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <input
                type="file"
                class="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm"
                @change="onFileChange"
              />
            </div>
            <button
              type="button"
              class="h-10 rounded-full bg-slate-900 px-4 text-xs font-semibold text-white"
              :disabled="isSaving || !attachmentFile || !attachmentDocType"
              @click="uploadAttachment"
            >
              Upload
            </button>
          </div>

          <div v-else class="space-y-3">
            <input
              v-model="letterForm.title"
              type="text"
              placeholder="Letter title"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <div>
              <label class="text-[11px] font-semibold text-slate-500">Doc Type</label>
              <select
                v-model="letterForm.doc_type"
                class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="warning_letter">Warning Letter</option>
                <option value="showcause">Show Cause</option>
                <option value="notice">Notice</option>
                <option value="proof">Proof</option>
                <option value="other">Other</option>
              </select>
            </div>
            <LetterEditor v-model="letterForm.body_html" />
            <div class="flex justify-end">
              <button
                type="button"
                class="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                :disabled="
                  isSaving || !letterForm.title || !letterForm.body_html || !letterForm.doc_type
                "
                @click="saveLetter"
              >
                Save Letter
              </button>
            </div>
          </div>

          <div class="space-y-2">
            <h4 class="text-sm font-semibold text-slate-700">Existing Attachments</h4>
            <div class="space-y-2">
              <div
                v-for="item in attachments"
                :key="item?.id || itemLabel(item)"
                class="rounded-lg border border-slate-100 bg-slate-50/70 p-2"
              >
                <p class="text-xs font-semibold text-slate-700">{{ itemLabel(item) }}</p>
                <p class="text-[11px] text-slate-500">
                  {{ item._type === 'letter' ? 'Letter' : 'File' }}
                </p>
              </div>

              <p v-if="attachments.length === 0" class="text-xs text-slate-400">
                No attachments added yet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-btn { @apply rounded-full border border-slate-200 px-4 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800; }
.tab-btn--active { @apply border-slate-900 bg-slate-900 text-white; }
</style>
