<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useChecklistBoardStore } from '@/stores/checklistBoard'

const store = useChecklistBoardStore()
const router = useRouter()

const showOnlyMissing = ref(false)
const showOnlyRequired = ref(true)

function itemLabel(it) {
  return it.label || it?.template_item?.label || it?.templateItem?.label || ''
}
function isRequired(it) {
  return !!(it.required ?? it?.template_item?.required ?? it?.templateItem?.required)
}
function hasAttachment(it) {
  return !!it.attachment_id || !!it.attachment
}
function missingPredicate(it) {
  if (showOnlyRequired.value && !isRequired(it)) return false
  return it.status !== 'done' || !hasAttachment(it) // "data/attachment নাই" হিসেবে ধরা
}

async function toggleExpand(u) {
  const r = store.rows[String(u.id)] || {}
  r.expanded = !r.expanded
  store.rows[String(u.id)] = { ...r }
  if (r.expanded) {
    await store.ensureRow(u.id)
    await store.loadChecklistDetail(u)
  }
}

function goOpen(u) {
  const tplId = store.templateId
  if (!tplId) return
  // create-if-needed route we built earlier
  router.push({ name: 'checklist.create', params: { userId: u.id, templateId: tplId } })
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-4">
      <label class="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" v-model="showOnlyRequired" />
        Only required
      </label>
      <label class="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" v-model="showOnlyMissing" />
        Only missing
      </label>
    </div>

    <div v-for="(deps, company) in store.grouped" :key="company" class="space-y-4">
      <h2 class="text-lg font-semibold">{{ company }}</h2>

      <div v-for="(people, dept) in deps" :key="dept" class="space-y-2">
        <h3 class="text-base font-medium text-gray-700">{{ dept }}</h3>

        <div class="overflow-x-auto border rounded">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="text-left border-b bg-gray-50">
                <th class="p-2 w-10"></th>
                <th class="p-2">User</th>
                <th class="p-2">Position</th>
                <th class="p-2 w-64">Progress</th>
                <th class="p-2 w-24">Status</th>
                <th class="p-2 w-36">Actions</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="u in people" :key="u.id">
                <tr class="border-b hover:bg-gray-50">
                  <td class="p-2">
                    <button class="text-xs underline" @click="toggleExpand(u)">
                      {{ store.rows[String(u.id)]?.expanded ? 'Hide' : 'View' }}
                    </button>
                  </td>
                  <td class="p-2">
                    <div class="font-medium">{{ u.name || u.full_name || u.email }}</div>
                    <div class="text-xs text-gray-500">{{ u.email }}</div>
                  </td>
                  <td class="p-2">
                    <!-- {{ store.positionTitleOf(u) }} -->
                </td>
                  <td class="p-2">
                    <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div class="bg-green-500 h-2"
                           :style="{ width: (store.rows[String(u.id)]?.percent || 0) + '%' }"></div>
                    </div>
                    <div class="text-xs text-gray-600 mt-1">
                      {{ store.rows[String(u.id)]?.percent || 0 }}%
                    </div>
                  </td>
                  <td class="p-2 capitalize">
                    {{ store.rows[String(u.id)]?.status || 'not_started' }}
                  </td>
                  <td class="p-2">
                    <button class="px-3 py-1.5 rounded bg-gray-900 text-white" @click="goOpen(u)">
                      Open
                    </button>
                  </td>
                </tr>

                <!-- Expanded detail: show which data/attachment given vs missing -->
                <tr v-if="store.rows[String(u.id)]?.expanded">
                  <td colspan="6" class="p-0">
                    <div class="p-3 bg-gray-50">
                      <div v-if="store.rows[String(u.id)]?.loading" class="text-gray-600">Loading…</div>
                      <div v-else>
                        <div class="flex items-center gap-2 text-xs mb-2">
                          <span class="px-2 py-0.5 rounded bg-green-100 text-green-700">Done</span>
                          <span class="px-2 py-0.5 rounded bg-rose-100 text-rose-700">Missing/Not done</span>
                        </div>

                        <div class="grid md:grid-cols-2 gap-2">
                          <div v-for="it in (store.rows[String(u.id)]?.items || []).filter(i => showOnlyRequired ? (i.required ?? i?.template_item?.required ?? i?.templateItem?.required) : true)"
                               :key="it.id"
                               v-show="showOnlyMissing ? (it.status !== 'done' || !(it.attachment_id || it.attachment)) : true"
                               class="border rounded p-2 bg-white flex items-start justify-between">
                            <div>
                              <div class="font-medium">{{ itemLabel(it) }}</div>
                              <div class="text-xs text-gray-500">
                                Required: {{ isRequired(it) ? 'Yes' : 'No' }} |
                                Status: {{ it.status }}
                              </div>
                              <div class="text-xs mt-1" v-if="it.comment">
                                <span class="text-gray-500">Note:</span> {{ it.comment }}
                              </div>
                              <div class="text-xs mt-1" v-if="it.attachment">
                                <a :href="it.attachment.url || it.attachment.path" target="_blank" class="underline">
                                  Attachment
                                </a>
                              </div>
                            </div>
                            <div>
                              <span v-if="it.status === 'done' && (it.attachment_id || it.attachment)"
                                    class="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">Done</span>
                              <span v-else class="px-2 py-0.5 rounded text-xs bg-rose-100 text-rose-700">Missing</span>
                            </div>
                          </div>
                        </div>

                        <div v-if="(store.rows[String(u.id)]?.items || []).length === 0"
                             class="text-sm text-gray-600">
                          No checklist items yet for this user/template.
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>

              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>

  </div>
</template>
