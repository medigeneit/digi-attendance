<!-- components/VerifyModal.vue -->
<script setup>
import { onMounted } from 'vue'
import { useBiometricStore } from '@/stores/biometric'
import { useToast } from 'vue-toastification'

const props = defineProps({ zkUserid: { type: [String, Number], required: true } })
const emit = defineEmits(['close'])
const bio = useBiometricStore()
const toast = useToast()

onMounted(async () => {
  const ok = await bio.verify(props.zkUserid)
  toast[ok ? 'success' : 'error'](ok ? 'Verified' : 'Verify failed')
})
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center">
    <div class="bg-white rounded-xl p-4 w-full max-w-3xl">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold">Verify — {{ props.zkUserid }}</h3>
        <button class="btn-sm" @click="emit('close')">Close</button>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr>
              <th>Device</th>
              <th>Online</th>
              <th>User</th>
              <th v-for="f in 10" :key="f">F{{ f - 1 }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in bio.deviceMatrix" :key="row.device_id">
              <td>{{ row.device_name }}</td>
              <td>{{ row.online ? '✓' : '✗' }}</td>
              <td>{{ row.user ? '✓' : '—' }}</td>
              <td v-for="f in 10" :key="f">
                {{ (row.fingers || []).includes(f - 1) ? '✓' : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-3 text-right">
        <button class="btn-sm" :disabled="bio.verifying" @click="bio.verify(props.zkUserid)">
          Refresh
        </button>
      </div>
    </div>
  </div>
</template>
