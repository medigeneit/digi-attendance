<script setup>
import { computed } from 'vue'

const props = defineProps({
  group: { type: Object, required: true },
  isPersonal: { type: Boolean, default: false },
  lanes: { type: Array, default: () => [] },
  editableLaneKey: { type: String, default: null },
  canEdit: { type: Boolean, default: false },
  marks: { type: Object, default: () => ({}) },
  headerLabel: { type: String, default: '' },
  itemLabel: { type: String, default: 'Item' },
  helperText: { type: String, default: '' },
  showQuickFillGroup: { type: Boolean, default: false },
  autoFillLabel: { type: String, default: '' },
  autoFillVisible: { type: Boolean, default: false },
  onAutoFill: { type: Function, default: null },
  serialMap: { type: Object, default: () => ({}) },
  getLaneMark: { type: Function, default: () => '' },
  getHrMark: { type: Function, default: () => '' },
  onMarkChange: { type: Function, default: null },
  onCap: { type: Function, default: null },
  onQuickFillItem: { type: Function, default: null },
  onQuickFillGroup: { type: Function, default: null },
})

const items = computed(() => props.group?.items ?? [])

const groupMax = computed(() =>
  items.value.reduce((acc, item) => acc + Number(item?.max || 0), 0),
)

const groupGot = computed(() =>
  items.value.reduce((acc, item) => {
    const v = props.marks?.[item.id]
    const num = v === '' || v == null ? 0 : Number(v)
    return acc + Math.min(Math.max(num || 0, 0), Number(item?.max || 0))
  }, 0),
)

const serialFor = (item, idx) => props.serialMap?.[item.id] ?? idx + 1

const isEditableLane = (lane) =>
  lane?.key === props.editableLaneKey && lane?.can_current_user_review

// Smooth typing: update on input, cap on blur/change
const updateMark = (id, value) => {
  const num = value === '' ? '' : Number(value)
  if (value !== '' && Number.isNaN(num)) return
  props.onMarkChange?.(id, num)
}
const capMark = (id, max) => props.onCap?.(id, max)
</script>

<template>
  <section class="border rounded-2xl bg-white shadow-sm overflow-hidden">
    <div class="flex items-center justify-between border-b bg-slate-50 px-4 py-2.5">
      <div class="text-sm font-semibold text-slate-800">
        {{ headerLabel }}
      </div>

      <div v-if="helperText" class="text-xs text-slate-500">
        {{ helperText }}
      </div>

      <!-- ✅ Better Quick Fill UI (segmented pill) -->
      <div v-else-if="showQuickFillGroup" class="flex items-center gap-2">
        <span class="text-xs font-medium text-slate-500">Quick fill</span>

        <div class="inline-flex items-center rounded-xl border bg-white p-1 shadow-sm">
          <button
            type="button"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-100 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 disabled:opacity-40"
            @click="onQuickFillGroup?.(group, 'half')"
            :disabled="!canEdit"
            title="Fill all items with 50%"
          >
            All 1/2
          </button>

          <button
            type="button"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-100 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 disabled:opacity-40"
            @click="onQuickFillGroup?.(group, 'threeQuarter')"
            :disabled="!canEdit"
            title="Fill all items with 75%"
          >
            All 3/4
          </button>

          <button
            type="button"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:opacity-40"
            @click="onQuickFillGroup?.(group, 'full')"
            :disabled="!canEdit"
            title="Fill all items with 100%"
          >
            All Full
          </button>
        </div>

        <button
          v-if="autoFillVisible"
          type="button"
          class="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:border-slate-400 hover:text-slate-800"
          @click="onAutoFill?.()"
        >
          {{ autoFillLabel }}
        </button>
      </div>
    </div>

    <div class="overflow-auto">
      <!-- PERSONAL TABLE -->
      <table class="min-w-[980px] w-full text-sm" v-if="isPersonal">
        <thead class="bg-slate-50 sticky top-0 z-10">
          <tr class="text-slate-700">
            <th class="px-3 py-2 w-[40px] text-center font-medium">#</th>
            <th class="text-left px-3 py-2 w-[20%] font-medium">
              {{ itemLabel }}
            </th>
            <th class="px-3 py-2 text-center font-medium">Max</th>

            <th v-for="lane in lanes" :key="lane.key" class="px-3 py-2 text-center font-medium">
              <div class="font-medium">{{ lane.label || lane.key }}</div>
              <div class="text-[11px] text-slate-500 flex flex-col items-center">
                <span>{{ lane.assigned_user_name || '-' }}</span>
                <span
                  v-if="isEditableLane(lane)"
                  class="mt-0.5 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200"
                >
                  ✎ You can edit
                </span>
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr class="bg-slate-100/80 border-t">
            <td :colspan="3 + lanes.length" class="px-3 py-2 font-medium text-slate-800">
              {{ group.label || 'Personal' }}
            </td>
          </tr>

          <tr
            v-for="(item, idx) in items"
            :key="item.id"
            class="border-t hover:bg-slate-50/60 group"
          >
            <td class="px-3 py-2 text-center text-slate-500">
              {{ serialFor(item, idx) }}
            </td>

            <td class="px-3 py-2 align-top">
              <div class="font-medium text-slate-800">{{ item.label }}</div>

              <!-- ✅ Better per-item quick buttons (compact + hover only) -->
              <div class="mt-1">
                <div
                  class="inline-flex items-center rounded-lg border bg-white p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition"
                >
                  <button
                    type="button"
                    class="px-2 py-1 text-[11px] font-semibold rounded-md text-slate-700 hover:bg-slate-100 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    :disabled="!canEdit"
                    @click="canEdit && onQuickFillItem?.(item.id, item.max, 'zero')"
                    title="Set 0"
                  >
                    0
                  </button>

                  <button
                    type="button"
                    class="px-2 py-1 text-[11px] font-semibold rounded-md text-slate-700 hover:bg-slate-100 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    :disabled="!canEdit"
                    @click="canEdit && onQuickFillItem?.(item.id, item.max, 'quarter')"
                    title="Set 25%"
                  >
                    ¼
                  </button>

                  <button
                    type="button"
                    class="px-2 py-1 text-[11px] font-semibold rounded-md text-slate-700 hover:bg-slate-100 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    :disabled="!canEdit"
                    @click="canEdit && onQuickFillItem?.(item.id, item.max, 'half')"
                    title="Set 50%"
                  >
                    ½
                  </button>

                  <button
                    type="button"
                    class="px-2 py-1 text-[11px] font-semibold rounded-md text-slate-700 hover:bg-slate-100 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    :disabled="!canEdit"
                    @click="canEdit && onQuickFillItem?.(item.id, item.max, 'threeQuarter')"
                    title="Set 75%"
                  >
                    ¾
                  </button>

                  <button
                    type="button"
                    class="px-2 py-1 text-[11px] font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    :disabled="!canEdit"
                    @click="canEdit && onQuickFillItem?.(item.id, item.max, 'full')"
                    title="Set 100%"
                  >
                    Full
                  </button>
                </div>
              </div>
            </td>

            <td class="px-3 py-2 text-center text-slate-700">{{ item.max }}</td>

            <td v-for="lane in lanes" :key="lane.key" class="px-3 py-2 text-center">
              <div v-if="isEditableLane(lane)" class="flex items-center justify-center">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  :max="item.max"
                  :value="marks[item.id] ?? ''"
                  @input="updateMark(item.id, $event.target.value)"
                  @blur="capMark(item.id, item.max)"
                  inputmode="decimal"
                  class="w-24 text-right rounded-lg border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div v-else-if="lane.can_view_marks" class="text-slate-700 text-sm">
                {{ getLaneMark(lane.key, item.id) }}
              </div>

              <div v-else class="text-slate-300 text-sm">—</div>
            </td>
          </tr>

          <tr class="bg-slate-50 border-t">
            <td></td>
            <td class="px-3 py-2 text-right font-medium text-slate-700">Group Total</td>
            <td class="px-3 py-2 text-center font-semibold text-slate-800">
              {{ groupMax.toFixed(2) }}
            </td>
            <td :colspan="lanes.length" class="px-3 py-2 text-center text-sm">
              <span class="font-semibold text-slate-900">{{ groupGot.toFixed(2) }}</span>
              <span class="text-slate-500">/ {{ groupMax.toFixed(2) }}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- HR TABLE -->
      <table v-else class="w-full text-sm">
        <thead class="sticky top-0 bg-white z-10">
          <tr class="bg-slate-100 text-slate-700">
            <th class="px-3 py-2 w-[40px] text-center font-medium">#</th>
            <th class="text-left px-3 py-2 w-[30%] font-medium">{{ itemLabel }}</th>
            <th class="px-3 py-2 text-center w-[40px] font-medium">Max</th>
            <th class="px-3 py-2 text-center w-[80px] font-medium">HR Score</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(item, idx) in items"
            :key="item.id"
            class="border-t hover:bg-slate-50/60 group"
          >
            <td class="px-3 py-2 text-center text-slate-500">{{ idx + 1 }}</td>

            <td class="px-3 py-2">
              <div class="font-medium text-slate-800">{{ item.label }}</div>

              <!-- Same improved quick buttons for HR rows (optional but consistent) -->
              <!-- <div class="mt-1">
                <div
                  class="inline-flex items-center rounded-lg border bg-white p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition"
                >
                  <button
                    type="button"
                    class="px-2 py-1 text-[11px] font-semibold rounded-md text-slate-700 hover:bg-slate-100 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    :disabled="!canEdit"
                    @click="canEdit && onQuickFillItem?.(item.id, item.max, 'zero')"
                    title="Set 0"
                  >
                    0
                  </button>

                  <button
                    type="button"
                    class="px-2 py-1 text-[11px] font-semibold rounded-md text-slate-700 hover:bg-slate-100 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    :disabled="!canEdit"
                    @click="canEdit && onQuickFillItem?.(item.id, item.max, 'quarter')"
                    title="Set 25%"
                  >
                    ¼
                  </button>

                  <button
                    type="button"
                    class="px-2 py-1 text-[11px] font-semibold rounded-md text-slate-700 hover:bg-slate-100 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    :disabled="!canEdit"
                    @click="canEdit && onQuickFillItem?.(item.id, item.max, 'half')"
                    title="Set 50%"
                  >
                    ½
                  </button>

                  <button
                    type="button"
                    class="px-2 py-1 text-[11px] font-semibold rounded-md text-slate-700 hover:bg-slate-100 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    :disabled="!canEdit"
                    @click="canEdit && onQuickFillItem?.(item.id, item.max, 'threeQuarter')"
                    title="Set 75%"
                  >
                    ¾
                  </button>

                  <button
                    type="button"
                    class="px-2 py-1 text-[11px] font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    :disabled="!canEdit"
                    @click="canEdit && onQuickFillItem?.(item.id, item.max, 'full')"
                    title="Set 100%"
                  >
                    Full
                  </button>
                </div>
              </div> -->
            </td>

            <td class="px-3 py-2 text-center text-slate-700">{{ item.max }}</td>

            <td class="px-3 py-2 text-center">
              <template v-if="canEdit">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  :max="item.max"
                  :value="marks[item.id] ?? ''"
                  @input="updateMark(item.id, $event.target.value)"
                  @blur="capMark(item.id, item.max)"
                  inputmode="decimal"
                  class="w-24 text-right rounded-lg border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </template>
              <template v-else>
                <p class="text-slate-700 text-sm">{{ getHrMark(item.id) || '—' }}</p>
              </template>
            </td>
          </tr>

          <tr class="bg-slate-50 border-t">
            <td></td>
            <td class="px-3 py-2 text-right font-medium text-slate-700">Group Total</td>
            <td class="px-3 py-2 text-center font-semibold text-slate-800">
              {{ groupMax.toFixed(2) }}
            </td>
            <td class="px-3 py-2 text-center text-sm">
              {{ groupGot.toFixed(2) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
