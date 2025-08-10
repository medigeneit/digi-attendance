<script setup>
import { ref } from 'vue'
import { useDeviceStore } from '@/stores/device'

const deviceStore = useDeviceStore()

const props = defineProps({
  device: Object,
})

const status = ref(false)
const message = ref('')
const loading = ref(false)

const checkDeviceConnection = async () => {
  loading.value = true
  const response = await deviceStore.checkDeviceConnection(props.device.id)

  status.value = response
  message.value = response ? 'success' : 'Failed'

  loading.value = false

  setTimeout(() => {
    message.value = false
  }, 1000 * 60)
}
</script>

<template>
  <div class="flex justify-center items-center gap-2">
    <button @click="checkDeviceConnection" class="text-blue-600 hover:text-blue-800">
      <i
        class="fas fa-sync-alt"
        :class="{
          'animate-spin': loading,
        }"
      ></i>
    </button>
    <span v-if="message" :class="status ? 'text-green-600' : 'text-red-600'">
      {{ message }}
    </span>
  </div>
</template>
