<script setup>
import { reactive, ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'vue-toastification'

const emit = defineEmits(['close', 'updated'])

defineProps({
  user: Object,
})

const authStore = useAuthStore()
const toast = useToast()

const form = reactive({
  old_password: '',
  new_password: '',
  confirm_password: '',
})

const showOldPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

const saving = ref(false)

const toggleOldPassword = () => (showOldPassword.value = !showOldPassword.value)
const toggleNewPassword = () => (showNewPassword.value = !showNewPassword.value)
const toggleConfirmPassword = () => (showConfirmPassword.value = !showConfirmPassword.value)

const passwordsMatch = computed(() => {
  if (!form.confirm_password) return true
  return form.new_password === form.confirm_password
})

const passwordStrength = computed(() => {
  const p = form.new_password || ''
  let score = 0
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++

  if (!p) return { label: 'Enter a password', level: 0 }
  if (score <= 1) return { label: 'Weak', level: 1 }
  if (score === 2) return { label: 'Fair', level: 2 }
  if (score === 3) return { label: 'Good', level: 3 }
  return { label: 'Strong', level: 4 }
})

const canSubmit = computed(() => {
  return (
    form.old_password &&
    form.new_password &&
    form.confirm_password &&
    passwordsMatch.value &&
    !saving.value
  )
})

const updateUser = async () => {
  if (!passwordsMatch.value) {
    toast.error('New Password and Confirm Password do not match!')
    return
  }

  try {
    saving.value = true
    const payload = {
      old_password: form.old_password,
      new_password: form.new_password,
      confirm_password: form.confirm_password,
    }
    await authStore.changePassword(payload)
    toast.success('Password updated successfully!')
    emit('updated')
    emit('close')
  } catch (e) {
    console.error(e)
    toast.error(authStore.error || 'Failed to update password!')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <!-- Backdrop -->
  <div class="cp-backdrop" @click.self="emit('close')">
    <!-- Modal -->
    <div class="cp-modal" role="dialog" aria-modal="true" aria-label="Change password">
      <div class="cp-head">
        <div>
          <p class="cp-kicker">Security</p>
          <h2 class="cp-title">Change Password</h2>
        </div>

        <button type="button" class="cp-x" @click="emit('close')" aria-label="Close">
          ✕
        </button>
      </div>

      <form @submit.prevent="updateUser" class="space-y-4">
        <!-- Old -->
        <div class="cp-field">
          <label>Old Password</label>
          <div class="cp-input-wrap">
            <input
              v-model="form.old_password"
              :type="showOldPassword ? 'text' : 'password'"
              class="input-light"
              placeholder="Enter old password"
              autocomplete="current-password"
              required
            />
            <button type="button" class="cp-eye" @click="toggleOldPassword" aria-label="Toggle old password">
              <span v-if="showOldPassword">🙈</span>
              <span v-else><i class="fas fa-eye"></i></span>
            </button>
          </div>
        </div>

        <!-- New -->
        <div class="cp-field">
          <label>New Password</label>
          <div class="cp-input-wrap">
            <input
              v-model="form.new_password"
              :type="showNewPassword ? 'text' : 'password'"
              class="input-light"
              placeholder="At least 8 characters"
              autocomplete="new-password"
              required
            />
            <button type="button" class="cp-eye" @click="toggleNewPassword" aria-label="Toggle new password">
              <span v-if="showNewPassword">🙈</span>
              <span v-else><i class="fas fa-eye"></i></span>
            </button>
          </div>

          <!-- Strength -->
          <div class="cp-strength">
            <div class="cp-bars">
              <span class="cp-bar" :class="{ on: passwordStrength.level >= 1 }"></span>
              <span class="cp-bar" :class="{ on: passwordStrength.level >= 2 }"></span>
              <span class="cp-bar" :class="{ on: passwordStrength.level >= 3 }"></span>
              <span class="cp-bar" :class="{ on: passwordStrength.level >= 4 }"></span>
            </div>
            <p class="cp-strength-text">
              Strength: <span class="cp-strong">{{ passwordStrength.label }}</span>
            </p>
          </div>
        </div>

        <!-- Confirm -->
        <div class="cp-field">
          <label>Confirm Password</label>
          <div class="cp-input-wrap">
            <input
              v-model="form.confirm_password"
              :type="showConfirmPassword ? 'text' : 'password'"
              class="input-light"
              placeholder="Re-type new password"
              autocomplete="new-password"
              required
            />
            <button type="button" class="cp-eye" @click="toggleConfirmPassword" aria-label="Toggle confirm password">
              <span v-if="showConfirmPassword">🙈</span>
              <span v-else>
                <i class="fas fa-eye"></i>
              </span>
            </button>
          </div>

          <p v-if="!passwordsMatch" class="cp-error">
            Passwords do not match.
          </p>
        </div>

        <!-- Actions -->
        <div class="cp-actions">
          <button type="button" class="btn-2-red" @click="emit('close')">
            Cancel
          </button>

          <button type="submit" class="btn-2" :disabled="!canSubmit">
            <span v-if="!saving">Update Password</span>
            <span v-else>Updating...</span>
          </button>
        </div>

        <div class="cp-hint">
          <span class="dot"></span>
          Tip: Use uppercase, numbers and symbols for stronger password.
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Backdrop */
.cp-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(6px);
}

/* Modal */
.cp-modal {
  width: 100%;
  max-width: 520px;
  border-radius: 1.5rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 25px 70px rgba(15, 23, 42, 0.22);
  padding: 1.25rem;
}

/* Header */
.cp-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 1rem;
}
.cp-kicker {
  font-size: 0.72rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 900;
}
.cp-title {
  margin-top: 0.2rem;
  font-size: 1.4rem;
  font-weight: 900;
  color: #0f172a;
}
.cp-sub {
  margin-top: 0.25rem;
  font-size: 0.92rem;
  color: #64748b;
}
.cp-x {
  height: 38px;
  width: 38px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #0f172a;
  font-weight: 900;
  transition: transform 0.15s ease, background 0.15s ease;
}
.cp-x:hover {
  transform: translateY(-1px);
  background: #f8fafc;
}

/* Fields */
.cp-field {
  display: grid;
  gap: 0.45rem;
}
.cp-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: #64748b;
  font-weight: 900;
}
.cp-input-wrap {
  position: relative;
}
.cp-eye {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  height: 34px;
  width: 34px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  display: grid;
  place-items: center;
  transition: background 0.15s ease, transform 0.15s ease;
}
.cp-eye:hover {
  background: #eef2ff;
  transform: translateY(-50%) scale(1.02);
}

/* Strength */
.cp-strength {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-top: 0.2rem;
}
.cp-bars {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  width: 160px;
}
.cp-bar {
  height: 7px;
  border-radius: 999px;
  background: #e2e8f0;
}
.cp-bar.on {
  background: #38bdf8;
}
.cp-strength-text {
  font-size: 0.85rem;
  color: #64748b;
}
.cp-strong {
  color: #0f172a;
  font-weight: 900;
}

/* Error */
.cp-error {
  font-size: 0.85rem;
  color: #ef4444;
  font-weight: 700;
}

/* Actions */
.cp-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  padding-top: 0.25rem;
}
/* Hint */
.cp-hint {
  margin-top: 0.6rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #64748b;
}
.dot {
  height: 8px;
  width: 8px;
  border-radius: 999px;
  background: #38bdf8;
}
</style>
