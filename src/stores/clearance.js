import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiClient from '../axios';
export const useClearanceStore = defineStore('clearance', () => {
  // --- filters ---
  const departmentId = ref(null)
  const templateId   = ref(null)
  const userId       = ref(null)
  const statusFilter = ref('') // '', PENDING, WORKING, COMPLETED

  // dropdown data
  const departments = ref([])
  const templates   = ref([])
  const users       = ref([])

  // assigned items (active) for dept+template
  const assignedItems = ref([]) // [{template_item_id, label, order_no, ...}]
  // current user clearances by template_item_id
  const clearanceByItemId = ref(new Map()) // Map<tid, row>
  const dirty = ref(new Set()) // track changed tid

  // ui state
  const loading = ref(false)
  const saving  = ref(false)
  const error   = ref('')

  const itemsForTable = computed(() => {
    // Merge assignedItems + clearances
    const list = assignedItems.value.slice().sort((a,b)=>(a.order_no??0)-(b.order_no??0)).map(ai => {
      const row = clearanceByItemId.value.get(ai.template_item_id) || {}
      return {
        template_item_id: ai.template_item_id,
        label: ai.label || ai.item_label || ai.item_key,
        status: row.status || 'PENDING',
        handover_status: row.handover_status || 'NA',
        present_condition: row.present_condition || '',
        receiver_name: row.receiver_name || '',
        remarks: row.remarks || '',
        _isDirty: dirty.value.has(ai.template_item_id),
      }
    })
    // optional filter by status
    return statusFilter.value ? list.filter(x => x.status === statusFilter.value) : list
  })

  function markDirty(tid, v=true) {
    if (v) dirty.value.add(tid); else dirty.value.delete(tid)
  }
  function clearDirty() { dirty.value.clear() }

  async function loadFiltersData() {
    error.value = ''
    try {
      // আপনার প্রকল্পে endpoints ভিন্ন হলে বদলান
      const [d, t] = await Promise.all([
        apiClient.get('/departments', { params:{ per_page: 1000 }}),
        apiClient.get('/checklist-templates', { params:{ per_page: 1000 }}),
      ])
      departments.value = d.data?.data || d.data || []
      templates.value   = t.data?.data || t.data || []
    } catch (e) {
      error.value = 'Failed to load filter data'
      console.error(e)
    }
  }

  async function loadUsersByDept(deptId) {
    error.value = ''
    try {
      // আপনার ইউজার এন্ডপয়েন্ট অনুযায়ী সামঞ্জস্য করুন
      const res = await apiClient.get('/users', { params: { department_id: deptId, per_page: 1000 } })
      users.value = res.data?.data || res.data || []
    } catch (e) {
      error.value = 'Failed to load users'
      console.error(e)
    }
  }

  async function loadAssignedItems(deptId, tplId) {
    assignedItems.value = []
    error.value = ''
    try {
      const res = await apiClient.get('/department-item-assignments', {
        params: { department_id: deptId, template_id: tplId, is_active: true, per_page: 1000 }
      })
      const raw = res.data?.data || res.data || []
      // normalize
      assignedItems.value = raw.map(r => ({
        template_item_id: r.template_item_id ?? r.templateItem?.id,
        label: r.templateItem?.label ?? r.templateItem?.item_key ?? r.label,
        order_no: r.templateItem?.order_no ?? 0,
      })).filter(x => x.template_item_id)
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

  async function refreshAll() {
    if (!departmentId.value || !templateId.value) return
    loading.value = true
    error.value = ''
    try {
      await loadAssignedItems(departmentId.value, templateId.value)
      if (userId.value) await loadClearances(userId.value, departmentId.value, templateId.value)
    } catch (e) {
      error.value = 'Failed to refresh data'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  async function saveBulk() {
    if (!userId.value || !departmentId.value) return
    const toSave = itemsForTable.value.filter(x => dirty.value.has(x.template_item_id))
      .map(x => ({
        template_item_id: x.template_item_id,
        status: x.status,
        handover_status: x.handover_status,
        present_condition: x.present_condition?.trim() || null,
        receiver_name: x.receiver_name?.trim() || null,
        remarks: x.remarks?.trim() || null,
      }))
    if (toSave.length === 0) return

    saving.value = true
    error.value = ''
    try {
      await apiClient.post('/clearances/bulk-upsert', {
        user_id: userId.value,
        department_id: departmentId.value,
        items: toSave,
      })
      clearDirty()
      await loadClearances(userId.value, departmentId.value, templateId.value)
    } catch (e) {
      error.value = 'Failed to save'
      console.error(e)
    } finally {
      saving.value = false
    }
  }

  return {
    // state
    departmentId, templateId, userId, statusFilter,
    departments, templates, users,
    assignedItems, clearanceByItemId, itemsForTable, dirty,
    loading, saving, error,
    // actions
    loadFiltersData, loadUsersByDept, refreshAll, saveBulk,
    markDirty,
  }
})
