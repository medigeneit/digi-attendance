<script setup>
import { fileUrl, isImage, isPDF } from '@/libs/attachment-functions'
import { onMounted, ref, watch } from 'vue'

const props = defineProps({
  attachments: { type: Array, default: () => [] },
  selected: { type: String, default: '' },
})

const fileToShow = ref('')

const emit = defineEmits(['change', 'clickClose'])

function handleClickFile(file) {
  fileToShow.value = file
  emit('change', file)
}

function handlePrev() {
  const currentIndex = (props.attachments || []).indexOf(fileToShow.value)
  console.log({ currentIndex, attachments: props.attachments })

  if (props.attachments?.[currentIndex - 1]) {
    fileToShow.value = props.attachments?.[currentIndex - 1]
    emit('change', fileToShow.value)
  }
}

function handleNext() {
  const currentIndex = (props.attachments || []).indexOf(fileToShow.value)

  if (props.attachments?.[currentIndex + 1]) {
    fileToShow.value = props.attachments?.[currentIndex + 1]
    emit('change', fileToShow.value)
  }
}

onMounted(() => {
  fileToShow.value = props.attachments?.length == 1 ? props.attachments[0] : fileToShow.value
})

watch(
  () => props.selected,
  (selectedFile) => (fileToShow.value = selectedFile),
  { immediate: true },
)
</script>
<template>
  <div>
    <div class="border-b flex items-center px-2 py-1">
      <h2 class="text-xl font-semibold">Attachments</h2>

      <a
        :href="fileUrl(fileToShow)"
        target="_blank"
        class="text-sky-600 hover:text-sky-400 hover:underline ml-2"
        v-if="fileToShow"
      >
        <i class="fas fa-external-link"></i> <span class="hidden md:inline">Open In New tab</span>
      </a>

      <div class="ml-auto flex items-center gap-2">
        <template v-if="fileToShow && attachments.length > 1">
          <button @click.prevent="handleClickFile('')" class="btn-icon">
            <i class="fas fa-list"></i>
          </button>

          <button @click.prevent="handlePrev" class="btn-icon">
            <i class="fas fa-angle-left"></i>
          </button>

          <button @click.prevent="handleNext" class="btn-icon">
            <i class="fas fa-angle-right"></i>
          </button>
        </template>
        <button @click.prevent="emit('clickClose')" class="btn-icon ml-6">&times;</button>
      </div>
    </div>

    <div>
      <div class="p-2 min-h-[50vh] max-h-[70vh] overflow-y-auto" v-if="fileToShow">
        <!-- Image preview -->
        <img
          v-if="isImage(fileToShow)"
          :src="fileUrl(fileToShow)"
          alt="attachment"
          class="object-cover w-full h-full rounded"
        />

        <!-- PDF preview -->
        <iframe
          v-else-if="isPDF(fileToShow)"
          :src="fileUrl(fileToShow)"
          class="w-full h-[60vh] border rounded-md"
        />
      </div>
      <div v-else>
        <div
          class="grid grid-cols-4 p-4 gap-8 min-h-[50vh] max-h-[70vh] overflow-y-auto"
          v-if="attachments && attachments.length"
        >
          <div
            v-for="(file, index) in attachments"
            :key="index"
            class="border p-1 rounded aspect-square flex items-center justify-center bg-gray-50 relative cursor-pointer hover:bg-gray-100 hover:shadow-md hover:border-gray-300 hover:scale-[1.02] transition-transform"
            tabindex="0"
            @click.prevent="handleClickFile(file)"
            @keydown.enter.prevent="handleClickFile(file)"
          >
            <!-- Image preview -->
            <img
              v-if="isImage(file)"
              :src="fileUrl(file)"
              alt="attachment"
              class="object-cover w-full h-full rounded"
            />

            <!-- PDF preview -->
            <a
              v-else-if="isPDF(file)"
              :href="fileUrl(file)"
              target="_blank"
              class="text-xs text-blue-600 text-center break-words hover:underline"
            >
              <i class="fas fa-file-pdf fa-2x mb-1 text-amber-700"></i>
              <div class="whitespace-nowrap text-xs mt-1">Open PDF</div>
            </a>

            <!-- Unknown file type -->
            <span v-else class="text-xs text-gray-500 text-center">Unknown</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
