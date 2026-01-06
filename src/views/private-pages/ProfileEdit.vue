<script setup>
import LoaderView from '@/components/common/LoaderView.vue'
import PhotoModal from '@/components/common/PhotoModal.vue'
import ChangePasswordModal from '@/components/user/ChangePasswordModal.vue'
import { useAuthStore } from '@/stores/auth'
import { storeToRefs } from 'pinia'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'

const authStore = useAuthStore()
const { user } = storeToRefs(authStore)
const toast = useToast()
const router = useRouter()

const form = reactive({
  name: '',
  bn_name: '',
  phone: '',
  email: '',
  nid: '',
  date_of_birth: '',
  address: '',
  blood: '',
})

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const isSaving = ref(false)
const isLoading = ref(false)

const changePasswordModal = ref(false)

const isPhotoModalOpen = ref(false)
const selectedPhoto = ref(null)
const selectedFile = ref(null)
const isUploading = ref(false)
const isUploadComplete = ref(false)

const initials = computed(() => {
  const n = (user.value?.name || '').trim()
  if (!n) return 'U'
  const parts = n.split(' ').filter(Boolean)
  const a = parts[0]?.[0] || 'U'
  const b = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (a + b).toUpperCase()
})

const profileMeta = computed(() => [
  { label: 'Employee ID', value: user.value?.employee_id || user.value?.id || '-' },
  { label: 'Company', value: user.value?.company?.name || '-' },
  { label: 'Department', value: user.value?.department?.name || '-' },
])

const loadUser = () => {
  form.name = user.value?.name || ''
  form.bn_name = user.value?.bn_name || ''
  form.phone = user.value?.phone || ''
  form.email = user.value?.email || ''
  form.address = user.value?.address || ''
  form.nid = user.value?.nid || ''
  form.blood = user.value?.blood || ''
  form.date_of_birth = user.value?.date_of_birth || ''
}

onMounted(() => {
  if (user.value) loadUser()
})

watch(
  user,
  (newUser) => {
    if (newUser) loadUser()
  },
  { immediate: true }
)

const openPhotoModal = () => {
  selectedPhoto.value = user.value?.photo || null
  isPhotoModalOpen.value = true
}

const closePhotoModal = () => {
  isPhotoModalOpen.value = false
  selectedFile.value = null
  isUploadComplete.value = false
}

const handleFileSelected = (file) => {
  selectedFile.value = file
}

const CloseModal = () => {
  changePasswordModal.value = false
}

const updateUser = async () => {
  if (isSaving.value) return
  try {
    isSaving.value = true
    await authStore.updateProfile(form)
    toast.success('Profile updated successfully!')
    router.push({ name: 'MyProfile' })
  } catch (error) {
    console.error('Failed to update profile:', error)
    toast.error(authStore.error || 'Failed to save profile!')
  } finally {
    isSaving.value = false
  }
}

const uploadPhoto = async () => {
  if (!selectedFile.value || isUploading.value) return

  const formData = new FormData()
  formData.append('photo', selectedFile.value)
  formData.append('user_id', user.value.id)

  try {
    isUploading.value = true
    await authStore.uploadProfilePhoto(formData)

    isUploadComplete.value = true
    toast.success('Image updated successfully!')

    setTimeout(() => {
      closePhotoModal()
      isUploading.value = false
      isUploadComplete.value = false
    }, 900)
  } catch (error) {
    console.error('Failed to upload photo:', error)
    toast.error(authStore.error || 'Failed to save profile!')
  } finally {
    isUploading.value = false
  }
}
</script>

<template>
  <div class="my-container">
    <!-- Header -->
    <div class="header-card">
      <div>
        <p class="kicker">Account Settings</p>
        <h2 class="heading">Update Profile</h2>
        <p class="subheading">
          Keep your information up to date. Changes reflect across systems instantly.
        </p>
      </div>

      <div class="actions">
        <RouterLink :to="{ name: 'MyProfile' }" class="btn-1">
          Back
        </RouterLink>
        <button type="button" class="btn-2" @click="changePasswordModal = true">
          Change Password
        </button>
      </div>
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
      <!-- Left: Profile Card -->
      <div class="card">
        <div class="p-5 md:p-6">
          <div class="flex items-center gap-4">
            <button
              type="button"
              class="avatar-btn group"
              @click="openPhotoModal"
              aria-label="Change profile photo"
            >
              <img v-if="user?.photo" class="h-full w-full object-cover" :src="user.photo" alt="Profile Photo" />
              <div v-else class="h-full w-full grid place-items-center avatar-fallback">
                {{ initials }}
              </div>

              <div class="avatar-overlay">
                <span class="chip chip-solid">Change</span>
              </div>
            </button>

            <div class="min-w-0">
              <p class="name truncate">{{ user?.name || 'Your Name' }}</p>
              <p class="muted truncate">{{ user?.designation?.title || 'Designation' }}</p>

              <div class="mt-2 flex flex-wrap gap-2">
                <span class="chip">{{ user?.role?.name || 'User' }}</span>
                <span class="chip chip-soft">{{ user?.phone || 'No phone' }}</span>
              </div>
            </div>
          </div>

          <div class="mt-6 space-y-3">
            <div
              v-for="m in profileMeta"
              :key="m.label"
              class="meta-row"
            >
              <p class="meta-label">{{ m.label }}</p>
              <p class="meta-value truncate">{{ m.value }}</p>
            </div>
          </div>

          <div class="mt-6 tip-box">
            <p class="tip-title">Tips</p>
            <p class="tip-text">
              Use a clear photo and keep phone/email updated for notifications.
            </p>
          </div>
        </div>
      </div>

      <!-- Right: Form -->
      <div class="card">
        <div class="p-5 md:p-6">
          <LoaderView v-if="isLoading" class="rounded-2xl border border-slate-200 bg-white shadow-none" />

          <form v-else @submit.prevent="updateUser" class="space-y-6">
            <!-- Section: Basics -->
            <div class="section">
              <div class="section-head">
                <div>
                  <p class="section-title">Basic Information</p>
                  <p class="section-sub">Name, phone and contact details.</p>
                </div>
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <label class="field-label">Name</label>
                  <input v-model="form.name" type="text" required class="input-light" placeholder="Full name" />
                </div>

                <div>
                  <label class="field-label">Bangla Name</label>
                  <input v-model="form.bn_name" type="text" class="input-light" placeholder="বাংলা নাম" />
                </div>

                <div>
                  <label class="field-label">Phone</label>
                  <input v-model="form.phone" type="text" required class="input-light" placeholder="01XXXXXXXXX" />
                </div>

                <div>
                  <label class="field-label">Email</label>
                  <input v-model="form.email" type="email" class="input-light" placeholder="name@email.com" />
                </div>
              </div>
            </div>

            <!-- Section: Personal -->
            <div class="section">
              <div class="section-head">
                <div>
                  <p class="section-title">Personal Details</p>
                  <p class="section-sub">Blood group, NID, DOB and address.</p>
                </div>
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <label class="field-label">Blood Group</label>
                  <select v-model="form.blood" class="input-light">
                    <option disabled value="">Select blood group</option>
                    <option v-for="group in bloodGroups" :key="group" :value="group">
                      {{ group }}
                    </option>
                  </select>
                </div>

                <div>
                  <label class="field-label">NID</label>
                  <input v-model="form.nid" type="text" class="input-light" placeholder="NID number" />
                </div>

                <div>
                  <label class="field-label">Date of Birth</label>
                  <input v-model="form.date_of_birth" type="date" class="input-light" />
                </div>

                <div class="md:col-span-2">
                  <label class="field-label">Address</label>
                  <textarea v-model="form.address" rows="3" class="input-light" placeholder="Full address"></textarea>
                </div>
              </div>
            </div>

            <!-- Footer actions -->
            <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
              <div class="flex flex-wrap gap-2">
                <RouterLink :to="{ name: 'MyProfile' }" class="btn-2-red">
                  Cancel
                </RouterLink>

                <button type="submit" class="btn-2" :disabled="isSaving">
                  <span v-if="!isSaving">Save Changes</span>
                  <span v-else>Saving...</span>
                </button>
              </div>

              <button type="button" class="btn-1" @click="openPhotoModal">
                Update Photo
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <ChangePasswordModal v-if="changePasswordModal" @close="CloseModal" :user="user" />

    <PhotoModal
      :imageSrc="selectedPhoto"
      :isOpen="isPhotoModalOpen"
      @close="closePhotoModal"
      @fileSelected="handleFileSelected"
      @uploadPhoto="uploadPhoto"
      :isUploading="isUploading"
      :isUploadComplete="isUploadComplete"
    />
  </div>
</template>

<style scoped>
/* Header */
.header-card {
  border-radius: 1.5rem;
  background: linear-gradient(135deg, #ffffff, #f8fafc);
  border: 1px solid #e2e8f0;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.10);
  padding: 1.25rem;
  display: flex;
  gap: 1rem;
  flex-direction: column;
}
@media (min-width: 768px) {
  .header-card {
    padding: 1.5rem;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}
.kicker {
  font-size: 0.72rem;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 800;
}
.heading {
  font-size: 1.75rem;
  font-weight: 900;
  color: #0f172a;
  margin-top: 0.2rem;
}
.subheading {
  margin-top: 0.25rem;
  color: #64748b;
  font-size: 0.92rem;
  max-width: 56rem;
}
.actions {
  display: flex;
  gap: 0.5rem;
}

/* Cards */
.card {
  border-radius: 1.5rem;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(10px);
  border: 1px solid #e2e8f0;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
}

/* Avatar */
.avatar-btn {
  height: 80px;
  width: 80px;
  border-radius: 1.25rem;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  background: #fff;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
  position: relative;
}
.avatar-fallback {
  background: linear-gradient(135deg, #e2e8f0, #f1f5f9);
  color: #0f172a;
  font-weight: 900;
  font-size: 1.1rem;
}
.avatar-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(2, 6, 23, 0.45);
  opacity: 0;
  transition: opacity 0.2s ease;
}
.avatar-btn:hover .avatar-overlay {
  opacity: 1;
}

/* Text */
.name {
  color: #0f172a;
  font-weight: 800;
  font-size: 1.05rem;
}
.muted {
  color: #64748b;
  font-size: 0.9rem;
}

/* Chips */
.chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.32rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: #0f172a;
  border: 1px solid #e2e8f0;
  background: #fff;
}
.chip-soft {
  color: #334155;
  background: #f8fafc;
}
.chip-solid {
  color: #fff;
  background: rgba(255,255,255,0.16);
  border: 1px solid rgba(255,255,255,0.28);
}

/* Meta rows */
.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-radius: 1.1rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 0.8rem 1rem;
}
.meta-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: #64748b;
  font-weight: 900;
}
.meta-value {
  font-size: 0.9rem;
  font-weight: 800;
  color: #0f172a;
  max-width: 60%;
  text-align: right;
}

/* Tips */
.tip-box {
  border-radius: 1.1rem;
  border: 1px solid #dbeafe;
  background: linear-gradient(135deg, rgba(14,165,233,0.10), rgba(99,102,241,0.08));
  padding: 1rem;
}
.tip-title {
  font-weight: 900;
  color: #0f172a;
}
.tip-text {
  margin-top: 0.25rem;
  color: #475569;
  font-size: 0.9rem;
}

/* Sections */
.section {
  border-radius: 1.25rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 1.1rem;
}
.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}
.section-title {
  color: #0f172a;
  font-weight: 900;
  font-size: 1rem;
}
.section-sub {
  color: #64748b;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

/* Fields */
.field-label {
  display: block;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: #64748b;
  margin-bottom: 0.35rem;
  font-weight: 900;
}
</style>
