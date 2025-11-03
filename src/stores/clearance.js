import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiClient from '../axios'

export const useClearanceStore = defineStore('clearance', () => {
  const userId            = ref(null)
  const statusFilter      = ref('') // '', PENDING, WORKING, COMPLETED
  const departments             = ref([])
  const users             = ref([])
  const assignedItems     = ref([]) // [{template_item_id,label,order_no}]
  const clearanceByItemId = ref(new Map()) // Map<tid,row>
  const dirty             = ref(new Set())

  // ui
  const loading = ref(false)
  const saving  = ref(false)
  const error   = ref('')

const itemsForTable = computed(() => {
  const list = (assignedItems.value ?? [])
    .slice()
    .sort((a, b) => (a.order_no ?? 0) - (b.order_no ?? 0))
    .map((ai) => {
      // row => user-এর লাইভ ইনপুট/সেভ স্টেট (clearance)
      const row = clearanceByItemId.value.get(ai.id) || {}

      // show/hide receiver: server flag > fallback to handover_to
      const showReceiver =
        typeof ai.show_receiver !== 'undefined'
          ? !!ai.show_receiver
          : (ai.handover_to !== 'departmental_incharge')

      // receiver default: saved row > server handover_user > ''
      const serverReceiver =
        row.receiver_name ??
        ai.handover_user?.name ??
        ai.handover_user?.label ??
        ''

      return {
        // IDs (always include both)
        id: ai.id,
        template_item_id: ai.id,

        // display + sort
        label: ai.label || ai.item_label || ai.item_key,
        order_no: ai.order_no ?? 0,

        // handover meta (for UI hide/show & badges)
        handover_to: ai.handover_to ?? null,
        show_receiver: showReceiver,

        // editable fields (with safe defaults)
        status: row.status ?? 'PENDING',
        handover_status: row.handover_status ?? 'NA',
        present_condition: row.present_condition ?? '',
        receiver_name: showReceiver ? serverReceiver : '', // hide করলে প্রি-ফিল না
        remarks: row.remarks ?? '',
      }
    })

  return statusFilter.value
    ? list.filter(x => x.status === statusFilter.value)
    : list
})

  function markDirty(tid, v = true) {
    if (v) dirty.value.add(tid)
    else dirty.value.delete(tid)
  }
  function clearDirty() { dirty.value.clear() }

  const fetchDepartments = async (companyId = null) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get('/departments', {
        params: { company_id: companyId },
      });
      departments.value = response.data;
    } catch (err) {
      error.value = err.response?.data?.message || 'ডিপার্টমেন্ট লোড করতে ব্যর্থ হয়েছে।';
      console.error('Error fetching departments:', err);
    } finally {
      loading.value = false;
    }
  };

  async function loadUsersByDept(deptId) {
    error.value = ''
    try {
      const res = await apiClient.get('/without-permission-users', { params: { department_id: deptId, per_page: 1000 } })
      users.value = res.data?.data || res.data || []
    } catch (e) {
      error.value = 'Failed to load users'
      console.error(e)
    }
  }

  async function loadAssignedItems() {
    assignedItems.value = []
    error.value = ''
    try {
      const res = await apiClient.get('/department-clearance-items')
      const raw = res.data?.data || res.data || []
      assignedItems.value = raw
    } catch (e) {
      error.value = 'Failed to load assigned items'
      console.error(e)
    }
  }

  async function loadClearances(uId, deptId, tplId) {
    clearanceByItemId.value = new Map()
    error.value = ''
    try {
      const res = await apiClient.get('/clearances', {
        params: { user_id: uId, department_id: deptId, template_id: tplId, per_page: 1000 }
      })
      const rows = res.data?.data || res.data || []
      for (const r of rows) {
        clearanceByItemId.value.set(r.template_item_id, r)
      }
    } catch (e) {
      error.value = 'Failed to load clearances'
      console.error(e)
    }
  }

  async function refreshAll(deptId, tplId) {
    if (!deptId || !tplId) return
    loading.value = true
    error.value = ''
    try {
      await loadAssignedItems(deptId, tplId)
      if (userId.value) {
        await loadClearances(userId.value, deptId, tplId)
      }
    } catch (e) {
      error.value = 'Failed to refresh data'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  async function saveBulk(deptId, tplId) {
    if (!userId.value) return
    const toSave = itemsForTable.value
      .filter(x => dirty.value.has(x.template_item_id))
      .map(x => ({
        template_item_id: x.template_item_id,
        status: x.status,
        handover_status: x.handover_status,
        present_condition: (typeof x.present_condition === 'string' ? x.present_condition.trim() : '') || null,
        receiver_name: (typeof x.receiver_name === 'string' ? x.receiver_name.trim() : '') || null,
        remarks: (typeof x.remarks === 'string' ? x.remarks.trim() : '') || null,
      }))

    if (toSave.length === 0) return

    saving.value = true
    error.value = ''
    try {
      await apiClient.post('/clearances/bulk-upsert', {
        user_id: userId.value,
        department_id: deptId,
        items: toSave,
      })
      clearDirty()
      await loadClearances(userId.value, deptId, tplId)
    } catch (e) {
      error.value = 'Failed to save'
      console.error(e)
    } finally {
      saving.value = false
    }
  }

  return {
    // state
    userId,departments, statusFilter, users,
    assignedItems, clearanceByItemId, itemsForTable, dirty,
    loading, saving, error,

    // actions
    loadUsersByDept, fetchDepartments, loadAssignedItems, loadClearances, refreshAll, saveBulk, markDirty,
  }
})
