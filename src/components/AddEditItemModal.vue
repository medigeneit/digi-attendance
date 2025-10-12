<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'add' }, // 'add' | 'edit'
  model: { type: Object, default: () => ({}) }, // existing row for edit
  nextOrder: { type: Number, default: 0 } // suggested order for create
})
const emit = defineEmits(['close', 'submit'])

const form = ref({
  item_key: '',
  label: '',
  required: false,
  order_no: 0
})
const err = ref('')

watch(() => props.open, (v) => {
  if (v) {
    if (props.mode === 'edit') {
      form.value = {
        item_key: props.model?.item_key ?? '',
        label: props.model?.label ?? '',
        required: !!props.model?.required,
        order_no: props.model?.order_no ?? 0
      }
    } else {
      form.value = {
        item_key: '',
        label: '',
        required: false,
        order_no: props.nextOrder ?? 0
      }
    }
    err.value = ''
  }
}, { immediate: true })

const title = computed(() => props.mode === 'edit' ? 'Edit Item' : 'Add Item')

function close() { emit('close') }

function submit() {
  err.value = ''
  if (props.mode === 'add' && !form.value.item_key.trim()) {
    err.value = 'Item key is required'; return
  }
  if (!form.value.label.trim()) {
    err.value = 'Label is required'; return
  }
  emit('submit', { ...form.value })
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div class="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold">{{ title }}</h3>
        <button class="rounded p-1 hover:bg-gray-100" @click="close" title="Close">
          ✕
        </button>
      </div>

      <div class="space-y-4">
        <div v-if="props.mode==='add'">
          <label class="block text-sm font-medium">Item Key</label>
          <input v-model="form.item_key" type="text" class="mt-1 w-full rounded border px-3 py-2" placeholder="e.g., nid_copy" />
          <p class="mt-1 text-xs text-gray-500">Unique machine key (max 80 chars)</p>
        </div>

        <div>
          <label class="block text-sm font-medium">Label</label>
          <input v-model="form.label" type="text" class="mt-1 w-full rounded border px-3 py-2" placeholder="e.g., National ID Copy" />
        </div>

        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2">
            <input v-model="form.required" type="checkbox" class="h-4 w-4" />
            <span>Required</span>
          </label>
          <div class="ml-auto w-40">
            <label class="block text-sm font-medium">Order No</label>
            <input v-model.number="form.order_no" type="number" class="mt-1 w-full rounded border px-3 py-2" min="0" />
          </div>
        </div>

        <p v-if="err" class="text-sm text-rose-600">{{ err }}</p>
      </div>

      <div class="mt-6 flex justify-end gap-2">
        <button class="rounded border px-3 py-2 hover:bg-gray-50" @click="close">Cancel</button>
        <button class="rounded bg-gray-900 px-3 py-2 text-white hover:bg-gray-800" @click="submit">
          {{ props.mode==='edit' ? 'Update' : 'Create' }}
        </button>
      </div>
    </div>
  </div>
</template>
