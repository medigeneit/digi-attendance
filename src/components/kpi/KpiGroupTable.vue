<script setup>
import { computed, ref } from 'vue'

defineOptions({ name: 'KpiGroupTable' })

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

  // readers
  getLaneMark: { type: Function, default: () => '' },
  getHrMark: { type: Function, default: () => '' },

  // writers
  onMarkChange: { type: Function, default: null },
  onCap: { type: Function, default: null },
  onQuickFillItem: { type: Function, default: null },
  onQuickFillGroup: { type: Function, default: null },
})

/* ---------- Constants (sticky offsets) ---------- */
const COL_W_SERIAL = 44
const COL_W_ITEM = 320
const COL_W_MAX = 84
const STICKY_LEFT_ITEM = COL_W_SERIAL
const STICKY_LEFT_MAX = COL_W_SERIAL + COL_W_ITEM

/* ---------- Safe sources ---------- */
const lanesSafe = computed(() => (Array.isArray(props.lanes) ? props.lanes : []))
const items = computed(() => (Array.isArray(props.group?.items) ? props.group.items : []))

/* ---------- Quick fill visibility ---------- */
const showQuickFillGroupEffective = computed(
  () => props.showQuickFillGroup || (props.isPersonal && props.canEdit),
)

/* ---------- Helpers ---------- */
const toNumOrNull = (v) => {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
const toNum0 = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const clamp = (val, min, max) => Math.min(Math.max(val, min), max)
const fmt = (v) => {
  const n = toNumOrNull(v)
  return n == null ? '—' : n.toFixed(2)
}

/* ---------- Totals ---------- */
const groupMax = computed(() =>
  items.value.reduce((acc, it) => acc + toNum0(it?.max), 0),
)

const groupGot = computed(() =>
  items.value.reduce((acc, it) => {
    const v = props.marks?.[it.id]
    const num = v === '' || v == null ? 0 : Number(v)
    const max = toNum0(it?.max)
    return acc + clamp(toNum0(num), 0, max)
  }, 0),
)

/* ---------- Serial ---------- */
const serialFor = (item, idx) => props.serialMap?.[item.id] ?? idx + 1

/* ---------- Lane logic ---------- */
const showAllLanes = ref(false)

const isEditableLane = (lane) =>
  lane?.key === props.editableLaneKey && Boolean(lane?.can_current_user_review)

const laneItemValue = (lane, item) => {
  if (!lane || !item) return null
  if (isEditableLane(lane)) return toNumOrNull(props.marks?.[item.id])
  if (lane?.can_view_marks) return toNumOrNull(props.getLaneMark?.(lane.key, item.id))
  return null
}

/* ---------- Per-lane summaries ---------- */
const laneSummaries = computed(() => {
  const out = {}
  const maxTotal = toNum0(groupMax.value)

  lanesSafe.value.forEach((lane) => {
    const canShow = isEditableLane(lane) || Boolean(lane?.can_view_marks)
    if (!lane?.key) return

    let got = 0
    let hasData = false

    items.value.forEach((item) => {
      const raw = laneItemValue(lane, item)
      if (raw == null) return
      hasData = true
      const max = toNum0(item?.max)
      got += clamp(toNum0(raw), 0, max)
    })

    const percent = maxTotal > 0 ? Math.round((got / maxTotal) * 100) : 0

    out[lane.key] = {
      got: Number(got.toFixed(2)),
      max: Number(maxTotal.toFixed(2)),
      percent,
      hasData,
      canShow,
    }
  })

  return out
})

/**
 * Visible lanes rule (personal table):
 * - showAllLanes=true => all
 * - else => editable lane always + lanes with hasData
 * - if filtered becomes empty => fallback all
 */
const visibleLanes = computed(() => {
  const all = lanesSafe.value
  if (showAllLanes.value) return all

  const filtered = all.filter((lane) => {
    if (isEditableLane(lane)) return true
    return Boolean(laneSummaries.value?.[lane.key]?.hasData)
  })

  return filtered.length ? filtered : all
})

const laneBarWidth = (laneKey) => {
  const s = laneSummaries.value?.[laneKey]
  if (!s || !s.max) return '0%'
  const pct = clamp((s.got / s.max) * 100, 0, 100)
  return `${pct}%`
}

/* ---------- Missing mark indicator ---------- */
const isMissingMark = (item) => {
  if (!props.canEdit) return false
  const v = props.marks?.[item.id]
  return v === '' || v == null
}

/* ---------- update + cap ---------- */
const updateMark = (id, value) => {
  const num = value === '' ? '' : Number(value)
  if (value !== '' && Number.isNaN(num)) return
  props.onMarkChange?.(id, num)
}
const capMark = (id, max) => props.onCap?.(id, max)
</script>

<template>
  <section class="border rounded-2xl bg-white shadow-sm overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between border-b bg-slate-50 px-3 py-2 gap-2">
      <div class="flex items-center gap-2 min-w-0">
        <div class="text-sm font-semibold text-slate-800 truncate">
          {{ headerLabel }}
        </div>

        <button
          v-if="isPersonal && (lanesSafe.length > 1)"
          type="button"
          class="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-800"
          @click="showAllLanes = !showAllLanes"
        >
          {{ showAllLanes ? 'Show only filled lanes' : 'Show all lanes' }}
        </button>
      </div>

      <div v-if="helperText" class="text-[11px] text-slate-500 truncate">
        {{ helperText }}
      </div>

      <!-- Group quick fill -->
      <div v-if="showQuickFillGroupEffective" class="flex items-center gap-2 shrink-0">
        <div class="inline-flex items-center rounded-xl border bg-white p-1 shadow-sm">
          <button
            type="button"
            class="px-3 py-1 text-[11px] font-semibold rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            @click="onQuickFillGroup?.(group, 'half')"
            :disabled="!canEdit"
          >
            All 1/2
          </button>

          <button
            type="button"
            class="px-3 py-1 text-[11px] font-semibold rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            @click="onQuickFillGroup?.(group, 'threeQuarter')"
            :disabled="!canEdit"
          >
            All 3/4
          </button>

          <button
            type="button"
            class="px-3 py-1 text-[11px] font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40"
            @click="onQuickFillGroup?.(group, 'full')"
            :disabled="!canEdit"
          >
            All Full
          </button>
        </div>

        <button
          v-if="autoFillVisible"
          type="button"
          class="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:border-slate-400"
          @click="onAutoFill?.()"
        >
          {{ autoFillLabel }}
        </button>
      </div>
    </div>

    <div class="overflow-auto">
      <!-- PERSONAL TABLE -->
      <table v-if="isPersonal" class="min-w-[980px] w-full text-[11px]">
        <thead class="bg-slate-50 sticky top-0 z-10">
          <tr class="text-slate-700">
            <!-- # -->
            <th
              class="sticky left-0 z-20 bg-slate-50 px-2 py-2 text-center font-medium"
              :style="{ width: COL_W_SERIAL + 'px' }"
            >
              #
            </th>

            <!-- Item -->
            <th
              class="sticky z-20 bg-slate-50 px-2 py-2 text-left font-medium"
              :style="{ left: STICKY_LEFT_ITEM + 'px', width: COL_W_ITEM + 'px' }"
            >
              {{ itemLabel }}
            </th>

            <!-- Max -->
            <th
              class="sticky z-20 bg-slate-50 px-2 py-2 text-center font-medium"
              :style="{ left: STICKY_LEFT_MAX + 'px', width: COL_W_MAX + 'px' }"
            >
              Max
            </th>

            <!-- Lanes -->
            <th
              v-for="lane in visibleLanes"
              :key="lane.key"
              class="px-2 py-2 text-center font-medium"
            >
              <div class="text-[11px] font-semibold">
                {{ lane.label || lane.key }}
              </div>
              <div class="text-[10px] text-slate-500 flex flex-col items-center">
                <span class="truncate max-w-[140px]" :title="lane.assigned_user_name || ''">
                  {{ lane.assigned_user_name || '-' }}
                </span>

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
          <!-- Group label row -->
          <tr class="bg-slate-100/80 border-t">
            <td :colspan="3 + visibleLanes.length" class="px-2 py-2 font-medium text-slate-800">
              {{ group.label || 'Personal' }}
            </td>
          </tr>

          <!-- Items -->
          <tr
            v-for="(item, idx) in items"
            :key="item.id"
            class="border-t hover:bg-slate-50/60 group"
            :class="isMissingMark(item) ? 'bg-rose-50/30 border-l-4 border-rose-400' : ''"
          >
            <!-- serial -->
            <td
              class="sticky left-0 z-10 bg-white px-2 py-2 text-center text-slate-500"
              :style="{ width: COL_W_SERIAL + 'px' }"
            >
              {{ serialFor(item, idx) }}
            </td>

            <!-- item label + quick buttons -->
            <td
              class="sticky z-10 bg-white px-2 py-2 align-top"
              :style="{ left: STICKY_LEFT_ITEM + 'px', width: COL_W_ITEM + 'px' }"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="font-medium text-slate-800 truncate pr-2" :title="item.label">
                  {{ item.label }}
                </div>

                <!-- per-item quick fill (hover + focus-within) -->
                <div class="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition shrink-0">
                  <div class="inline-flex items-center rounded-lg border bg-white p-0.5 shadow-sm">
                    <button
                      type="button"
                      class="px-2 py-1 text-[11px] font-semibold rounded-md text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      :disabled="!canEdit"
                      @click="canEdit && onQuickFillItem?.(item.id, item.max, 'zero')"
                      title="Set 0"
                    >
                      0
                    </button>

                    <button
                      type="button"
                      class="px-2 py-1 text-[11px] font-semibold rounded-md text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      :disabled="!canEdit"
                      @click="canEdit && onQuickFillItem?.(item.id, item.max, 'quarter')"
                      title="Set 25%"
                    >
                      ¼
                    </button>

                    <button
                      type="button"
                      class="px-2 py-1 text-[11px] font-semibold rounded-md text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      :disabled="!canEdit"
                      @click="canEdit && onQuickFillItem?.(item.id, item.max, 'half')"
                      title="Set 50%"
                    >
                      ½
                    </button>

                    <button
                      type="button"
                      class="px-2 py-1 text-[11px] font-semibold rounded-md text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                      :disabled="!canEdit"
                      @click="canEdit && onQuickFillItem?.(item.id, item.max, 'threeQuarter')"
                      title="Set 75%"
                    >
                      ¾
                    </button>

                    <button
                      type="button"
                      class="px-2 py-1 text-[11px] font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
                      :disabled="!canEdit"
                      @click="canEdit && onQuickFillItem?.(item.id, item.max, 'full')"
                      title="Set 100%"
                    >
                      Full
                    </button>
                  </div>
                </div>
              </div>
            </td>

            <!-- max -->
            <td
              class="sticky z-10 bg-white px-2 py-2 text-center text-slate-700 tabular-nums"
              :style="{ left: STICKY_LEFT_MAX + 'px', width: COL_W_MAX + 'px' }"
            >
              {{ toNum0(item.max).toFixed(1).replace(/\.0$/, '') }}
            </td>

            <!-- lane cells -->
            <td
              v-for="lane in visibleLanes"
              :key="lane.key"
              class="px-2 py-2 text-center"
            >
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
                  class="w-16 text-right rounded-md px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-200 border tabular-nums"
                  :class="isMissingMark(item) ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'"
                  :aria-label="`Score for ${item.label}`"
                />
              </div>

              <div v-else-if="lane.can_view_marks" class="text-slate-700 tabular-nums">
                {{ props.getLaneMark(lane.key, item.id) || '—' }}
              </div>

              <div v-else class="text-slate-300">—</div>
            </td>
          </tr>

          <!-- ✅ per-lane totals row -->
          <tr class="bg-slate-50 border-t">
            <td
              class="sticky left-0 z-20 bg-slate-50 px-2 py-2"
              :style="{ width: COL_W_SERIAL + 'px' }"
            ></td>

            <td
              class="sticky z-20 bg-slate-50 px-2 py-2 text-right font-medium text-slate-700"
              :style="{ left: STICKY_LEFT_ITEM + 'px', width: COL_W_ITEM + 'px' }"
            >
              Group Total
            </td>

            <td
              class="sticky z-20 bg-slate-50 px-2 py-2 text-center font-semibold text-slate-800 tabular-nums"
              :style="{ left: STICKY_LEFT_MAX + 'px', width: COL_W_MAX + 'px' }"
            >
              {{ groupMax.toFixed(2) }}
            </td>

            <td
              v-for="lane in visibleLanes"
              :key="lane.key"
              class="px-2 py-2 text-center align-top"
            >
              <template v-if="laneSummaries?.[lane.key]?.canShow && (isEditableLane(lane) || laneSummaries?.[lane.key]?.hasData)">
                <div class="font-semibold text-slate-900 tabular-nums">
                  {{ laneSummaries[lane.key].got.toFixed(2) }}
                </div>
                <div class="text-[10px] text-slate-500 tabular-nums">
                  / {{ laneSummaries[lane.key].max.toFixed(2) }} · {{ laneSummaries[lane.key].percent }}%
                </div>
                <div class="mt-1 h-1 rounded bg-slate-200 overflow-hidden">
                  <div class="h-1 bg-slate-900/40" :style="{ width: laneBarWidth(lane.key) }"></div>
                </div>
              </template>

              <template v-else>
                <div class="text-slate-300">—</div>
              </template>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- HR TABLE -->
      <table v-else class="w-full text-[11px]">
        <thead class="sticky top-0 bg-white z-10">
          <tr class="bg-slate-100 text-slate-700">
            <th class="px-2 py-2 w-[36px] text-center font-medium">#</th>
            <th class="text-left px-2 py-2 w-[34%] font-medium">{{ itemLabel }}</th>
            <th class="px-2 py-2 text-center w-[70px] font-medium">Max</th>
            <th class="px-2 py-2 text-center w-[90px] font-medium">HR Score</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(item, idx) in items"
            :key="item.id"
            class="border-t hover:bg-slate-50/60"
            :class="isMissingMark(item) ? 'bg-rose-50/30 border-l-4 border-rose-400' : ''"
          >
            <td class="px-2 py-2 text-center text-slate-500">{{ idx + 1 }}</td>
            <td class="px-2 py-2 font-medium text-slate-800 truncate" :title="item.label">
              {{ item.label }}
            </td>
            <td class="px-2 py-2 text-center text-slate-700 tabular-nums">
              {{ toNum0(item.max).toFixed(1).replace(/\.0$/, '') }}
            </td>

            <td class="px-2 py-2 text-center">
              <template v-if="canEdit">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  :max="item.max"
                  :value="marks[item.id] ?? ''"
                  @input="updateMark(item.id, $event.target.value)"
                  @blur="capMark(item.id, item.max)"
                  class="w-16 text-right rounded-md px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-200 border tabular-nums"
                  :class="isMissingMark(item) ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'"
                />
              </template>
              <template v-else>
                <span class="text-slate-700 tabular-nums">{{ props.getHrMark(item.id) || '—' }}</span>
              </template>
            </td>
          </tr>

          <tr class="bg-slate-50 border-t">
            <td></td>
            <td class="px-2 py-2 text-right font-medium text-slate-700">Group Total</td>
            <td class="px-2 py-2 text-center font-semibold text-slate-800 tabular-nums">
              {{ groupMax.toFixed(2) }}
            </td>
            <td class="px-2 py-2 text-center font-semibold text-slate-900 tabular-nums">
              {{ groupGot.toFixed(2) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
