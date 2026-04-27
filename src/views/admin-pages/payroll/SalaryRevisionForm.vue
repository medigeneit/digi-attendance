<script setup>
import { computed, ref, watch, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useSalaryRevisionStore } from '@/stores/salaryRevision'
import { useUserStore } from '@/stores/user'
import apiClient from '@/axios'

import {
  PROVIDENT_FUND_RATE,
  calculateAllowanceTotal,
  calculateBonusAmount,
  calculateCoreGross,
  calculatePfDeduction,
  getSalaryComponentPolicy,
  isPfAllowedForEmploymentType,
  normalizeAllowances,
  normalizeEmploymentType,
  resolvePfDeduction,
  splitGrossByPolicy
} from '@/utils/salaryPolicy'

import { formatCurrency, toNum } from '@/utils/currency'
import EmployeeFilter from '@/components/common/EmployeeFilter.vue'

const router=useRouter()
const route=useRoute()
const toast=useToast()

const revisionStore=useSalaryRevisionStore()
const userStore=useUserStore()

/* ---------------- state ---------------- */

const submitting=ref(false)
const loadingStructure=ref(false)
const fieldErrors=ref({})
const currentStructure=ref(null)

const selectedCompanyId=ref('')
const selectedDepartmentId=ref('')
const selectedLineType=ref('all')
const selectedEmploymentType=ref('')
const selectedUserProfile=ref(null)

const employeeFilterKey=ref(1)
const queryHydrated=ref(false)

const DAY_HONORIUM_ALLOWANCE_CODE='DAY_HONORIUM'
const DAY_HONORIUM_ALLOWANCE_NAME='Day Honorium'
const DEFAULT_DAY_HONORIUM_AMOUNT=1000
const BASIC_ONLY_LINE_TYPES=['doctor','academy_body','academic_body']

const normalizeLineType=(value)=>
 String(value||'')
  .trim()
  .toLowerCase()
  .replace(/[\s-]+/g,'_')

/* ---------------- form ---------------- */

const now=new Date()

const form=ref({
 user_id:null,

 review_date:
 `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`,

 effective_month:
 `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`,

 gross_salary:'',
 basic_salary:'',
 house_rent:'',
 medical_allowance:'',
 conveyance_allowance:'',
 pf_deduction:'',

 increment_type:'fixed',
 increment_value:'',
 remarks:'',

 allowances:[]
})

/* ---------------- init from query ---------------- */

async function hydrateFromQuery(){

 const q=route.query

 selectedCompanyId.value=q.company_id
   ? String(q.company_id)
   : ''

 selectedDepartmentId.value=q.department_id
   ? String(q.department_id)
   : ''

 selectedLineType.value=q.line_type
   ? String(q.line_type)
   : 'all'

 form.value.user_id=
   q.user_id || q.employee_id
     ? Number(q.user_id || q.employee_id)
     : null

 await nextTick()

 /* force EmployeeFilter re-render after props ready */
 employeeFilterKey.value++

 queryHydrated.value=true
}

onMounted(async()=>{
 await hydrateFromQuery()
})

/* ---------------- helpers ---------------- */

function assignEmploymentType(v){
 selectedEmploymentType.value=v || ''
}

function assignUserMeta(user){
 selectedUserProfile.value=user || null
 assignEmploymentType(user?.employment_type)
 if(user?.type){
  selectedLineType.value=user.type
 }
}

async function fetchEmploymentType(id){
 if(!id){
   assignEmploymentType('')
   return
 }

 try{
   const user=await userStore.fetchUser(id)
   assignUserMeta(user)
 }catch{
   assignEmploymentType('')
   selectedUserProfile.value=null
 }
}

const employmentTypeLabel=computed(()=>{
 const n=normalizeEmploymentType(
   selectedEmploymentType.value
 )

 if(!n) return 'Not Set'

 return n
   .split('_')
   .map(i=>i.charAt(0).toUpperCase()+i.slice(1))
   .join(' ')
})

const employmentTypeBadgeClass=computed(()=>{
 const type=normalizeEmploymentType(
   selectedEmploymentType.value
 )

 if(type==='permanent')
   return 'bg-emerald-50 text-emerald-700 ring-emerald-200'

 if(type==='contract')
   return 'bg-sky-50 text-sky-700 ring-sky-200'

 if(type==='probationary')
   return 'bg-amber-50 text-amber-700 ring-amber-200'

 return 'bg-slate-100 text-slate-600 ring-slate-200'
})

/* ---------------- policy ---------------- */

const activePolicy=computed(
()=>usesBasicOnlySalaryPolicy.value
 ? [{ key:'basic_salary', label:'Basic Salary', ratio:1, shortLabel:'Basic' }]
 : getSalaryComponentPolicy(
    selectedEmploymentType.value
   )
)

const activePolicySummary=computed(
()=>activePolicy.value
 .map(i=>`${Math.round(i.ratio*100)}% ${i.shortLabel}`)
 .join(', ')
)

const activePolicyCompact=computed(
()=>activePolicy.value
 .map(i=>Math.round(i.ratio*100))
 .join(' / ')
)

const pfAllowedForCurrentEmploymentType=computed(
()=>usesBasicOnlySalaryPolicy.value ||
 isPfAllowedForEmploymentType(
  selectedEmploymentType.value
 )
)

const selectedPayrollLineType=computed(()=>
 normalizeLineType(
  selectedUserProfile.value?.type ||
  currentStructure.value?.user?.type ||
  selectedLineType.value
 )
)

const usesBasicOnlySalaryPolicy=computed(()=>
 BASIC_ONLY_LINE_TYPES.includes(selectedPayrollLineType.value)
)

const usesDayHonoriumAllowance=computed(()=>
 selectedPayrollLineType.value==='doctor'
)

const deductionTitle=computed(()=>
 usesBasicOnlySalaryPolicy.value ? 'Somiti Deduction' : 'PF Deduction'
)

const deductionSummaryTitle=computed(()=>
 usesBasicOnlySalaryPolicy.value ? 'Net After Somiti' : 'Net After PF'
)

const deductionSupportText=computed(()=>
 usesBasicOnlySalaryPolicy.value
  ? 'Somiti deduction is carried forward manually for doctor or academy body salary.'
  : `${(PROVIDENT_FUND_RATE*100).toFixed(0)}% of revised basic salary.`
)

const pageIntroText=computed(()=>
 usesBasicOnlySalaryPolicy.value
  ? usesDayHonoriumAllowance.value
   ? 'Doctor revisions keep gross salary as basic. Increment updates Day Honorium only.'
   : 'Academy body revisions save gross salary as basic. Bonus and PF auto allowance are not applied.'
  : `Revise current gross salary directly. Policy breakdown: ${activePolicySummary.value}. PF is 5% of basic.`
)

const revisionRuleText=computed(()=>
 usesBasicOnlySalaryPolicy.value
  ? usesDayHonoriumAllowance.value
   ? 'Increment changes Day Honorium allowance. Gross and basic salary stay unchanged.'
   : 'Increment changes saved gross/basic salary. Somiti deduction carries forward.'
  : 'Increment changes the saved gross salary. Component split and PF are recalculated automatically.'
)

const incrementSupportText=computed(()=>
 usesDayHonoriumAllowance.value
  ? 'Applied on current Day Honorium.'
  : 'Applied on current gross.'
)

const revisedGrossSupportText=computed(()=>
 usesDayHonoriumAllowance.value
  ? 'Doctor gross/basic salary stays unchanged.'
  : 'This gross salary is saved directly.'
)

const currentGross=computed(()=>{
 if(!currentStructure.value) return 0

 return toNum(
   currentStructure.value.gross_salary ||
   calculateCoreGross(
     currentStructure.value
   )
 )
})

const currentPolicyGross=computed(()=>{
 if(!currentStructure.value) return 0
 return calculateCoreGross(
   currentStructure.value
 )
})

const currentPfDeduction=computed(()=>{
 if(!currentStructure.value) return 0
 return resolvePfDeduction(
   currentStructure.value
 )
})

const currentAllowanceTotal=computed(()=>{
 if(!currentStructure.value) return 0
 return calculateAllowanceTotal(
  currentStructure.value.allowances
 )
})

const currentDayHonoriumAllowance=computed(()=>{
 if(!currentStructure.value) return null

 return (currentStructure.value.allowances || [])
  .find(row=>isDayHonoriumAllowanceRow(row)) || null
})

const currentDayHonoriumAmount=computed(()=>{
 if(!usesDayHonoriumAllowance.value) return 0

 if(!currentDayHonoriumAllowance.value)
  return DEFAULT_DAY_HONORIUM_AMOUNT

 return toNum(currentDayHonoriumAllowance.value.amount)
})

const revisedAllowanceTotal=computed(()=>
 calculateAllowanceTotal(form.value.allowances)
)

/* ---------------- increment ---------------- */

const incrementAmount=computed(()=>{
 const val=toNum(form.value.increment_value)
 const base=usesDayHonoriumAllowance.value
  ? currentDayHonoriumAmount.value
  : currentGross.value

 if(val<=0)
   return 0

 if(form.value.increment_type==='percentage'){
   if(!base) return 0

   return Number(
     ((base*val)/100)
      .toFixed(2)
   )
 }

 return val
})

const revisedDayHonoriumAmount=computed(()=>
 usesDayHonoriumAllowance.value
  ? Number(
     (currentDayHonoriumAmount.value+incrementAmount.value)
      .toFixed(2)
    )
  : 0
)

const revisedGross=computed(
()=>Number(
((currentGross.value||0)+(usesDayHonoriumAllowance.value ? 0 : incrementAmount.value))
.toFixed(2)
)
)

const revisedBonus=computed(
()=>usesBasicOnlySalaryPolicy.value
 ? 0
 : calculateBonusAmount(
    selectedEmploymentType.value,
    form.value.basic_salary
   )
)

const revisedNetPayable=computed(
()=>Math.max(
0,
(usesBasicOnlySalaryPolicy.value
 ? revisedGross.value+revisedAllowanceTotal.value
 : revisedGross.value)-
 toNum(form.value.pf_deduction)
)
)

const componentCards=computed(
()=>activePolicy.value.map(item=>({
 ...item,
 currentAmount:currentStructure.value
   ? toNum(currentStructure.value[item.key])
   :0,
 revisedAmount:toNum(
   form.value[item.key]
 )
}))
)

const isDayHonoriumAllowanceRow=(allowance={})=>{
 const code=String(allowance?.allowance_code||'').trim().toUpperCase()
 const name=String(allowance?.allowance_name||'').trim().toLowerCase()
 return code===DAY_HONORIUM_ALLOWANCE_CODE ||
  name===DAY_HONORIUM_ALLOWANCE_NAME.toLowerCase()
}

function normalizeRevisionAllowances(allowances=[]){
 const rows=normalizeAllowances(allowances)

 if(!usesDayHonoriumAllowance.value){
  return rows.filter(row=>!isDayHonoriumAllowanceRow(row))
 }

 const existingIndex=rows.findIndex(row=>isDayHonoriumAllowanceRow(row))
const dayHonoriumRow={
  allowance_code:DAY_HONORIUM_ALLOWANCE_CODE,
  allowance_name:DAY_HONORIUM_ALLOWANCE_NAME,
  amount:revisedDayHonoriumAmount.value || DEFAULT_DAY_HONORIUM_AMOUNT,
  is_active:true,
  remarks:existingIndex!==-1
   ? rows[existingIndex].remarks || 'Doctor day honorium rate'
   : 'Doctor day honorium rate'
 }

 if(existingIndex!==-1){
  rows[existingIndex]={...rows[existingIndex],...dayHonoriumRow}
 }else{
  rows.unshift(dayHonoriumRow)
 }

 return rows
}

/* ---------------- breakdown ---------------- */

function applyRevisionBreakdown(){

 if(!currentStructure.value){
   form.value.basic_salary=''
   form.value.house_rent=''
   form.value.medical_allowance=''
   form.value.conveyance_allowance=''
   form.value.pf_deduction=''
   form.value.gross_salary=''
   return
 }

 form.value.gross_salary=revisedGross.value

 if(usesBasicOnlySalaryPolicy.value){
  form.value.basic_salary=revisedGross.value || ''
  form.value.house_rent=0
  form.value.medical_allowance=0
  form.value.conveyance_allowance=0
  form.value.pf_deduction=
   currentStructure.value?.pf_deduction ??
   form.value.pf_deduction ??
   ''
  form.value.allowances=normalizeRevisionAllowances(
   currentStructure.value.allowances
  )
  return
 }

 const breakdown=
 splitGrossByPolicy(
   revisedGross.value,
   selectedEmploymentType.value
 )

 form.value.basic_salary=
 breakdown.basic_salary || ''

 form.value.house_rent=
 breakdown.house_rent || ''

 form.value.medical_allowance=
 breakdown.medical_allowance || ''

 form.value.conveyance_allowance=
 breakdown.conveyance_allowance || ''

 form.value.pf_deduction=
 pfAllowedForCurrentEmploymentType.value
 ? calculatePfDeduction(
     breakdown.basic_salary
   )
 :''

 form.value.allowances=
 normalizeRevisionAllowances(
   currentStructure.value.allowances
 )
}

/* ---------------- employee filter sync ---------------- */

function syncQuery(){

 router.replace({
  query:{
   company_id:selectedCompanyId.value||undefined,
   department_id:selectedDepartmentId.value||undefined,
   line_type:selectedLineType.value||undefined,
   employee_id:form.value.user_id||undefined,
   user_id:form.value.user_id||undefined
  }
 })
}

function handleEmployeeFilterChange(payload={}){

 selectedCompanyId.value=
 payload.company_id || ''

 selectedDepartmentId.value=
 payload.department_id || ''

 selectedLineType.value=
 payload.line_type || 'all'

 form.value.user_id=
 payload.employee_id || null

 if(!form.value.user_id){
  selectedUserProfile.value=null
  assignEmploymentType('')
 }

 syncQuery()
}

/* ---------------- load structure ---------------- */

watch(
()=>form.value.user_id,
async(id)=>{

 if(!queryHydrated.value && !id) return

 currentStructure.value=null

 if(!id) return

 loadingStructure.value=true

 try{

 const res=await apiClient.get(
 '/salary-structures',
 {
  params:{
   user_id:id,
   is_active:1,
   per_page:1
  }
 })

 const rows=res.data?.data || []

 if(rows.length){

  currentStructure.value=rows[0]

  if(rows[0]?.user){
   assignUserMeta(rows[0].user)
  }else{
   assignEmploymentType(
    rows[0]?.user?.employment_type
   )
  }

  if(!selectedEmploymentType.value || !selectedUserProfile.value?.type){
   await fetchEmploymentType(id)
  }

  applyRevisionBreakdown()
 }

 }finally{
  loadingStructure.value=false
}

},
{ immediate:true }
)

watch(
[
currentGross,
()=>form.value.increment_type,
()=>form.value.increment_value,
selectedEmploymentType,
selectedPayrollLineType
],
()=>{
applyRevisionBreakdown()
}
)

/* ---------------- submit ---------------- */

function validate(){

 const errors={}

 if(!form.value.user_id){
  errors.user_id='Employee required'
 }

 if(
 toNum(form.value.increment_value)<=0
 ){
  errors.increment_value=
  'Increment must be greater than zero'
 }

 fieldErrors.value=errors

 return !Object.keys(errors).length
}

async function handleSubmit(){

 if(!validate()) return

 submitting.value=true

 try{

 await revisionStore.createRevision({
   ...form.value,
   gross_salary:toNum(form.value.gross_salary),
   basic_salary:toNum(form.value.basic_salary),
   house_rent:toNum(form.value.house_rent),
   medical_allowance:toNum(form.value.medical_allowance),
   conveyance_allowance:toNum(form.value.conveyance_allowance),
   pf_deduction:toNum(form.value.pf_deduction),
   increment_value:toNum(form.value.increment_value),
   allowances:normalizeRevisionAllowances(
      form.value.allowances
   )
 })

 toast.success(
 'Salary revision created successfully'
 )

 router.push({
  name:'PayrollSalaryStructureList'
 })

 }catch(e){
 toast.error(
 e.message || 'Failed'
 )
 }finally{
 submitting.value=false
 }

}

const inputClass=
'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm'
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-3 p-3 md:p-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Salary Revision</p>
        <h1 class="mt-1 text-2xl font-semibold text-slate-900">Create Salary Revision</h1>
        <p class="mt-1 text-sm text-slate-500">
          {{ pageIntroText }}
        </p>
      </div>

      <div class="flex gap-2">
        <button class="btn-3" @click="router.push({ name: 'PayrollSalaryStructureList' })">
          <i class="far fa-arrow-left"></i>
          <span class="hidden sm:flex">Back</span>
        </button>
        <button class="btn-2" @click="handleSubmit" :disabled="submitting">
          <i class="far" :class="submitting ? 'fa-spinner fa-spin' : 'fa-check'"></i>
          <span>{{ submitting ? 'Applying...' : 'Apply Revision' }}</span>
        </button>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-3">
      <div class="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm space-y-3">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 class="text-sm font-semibold text-slate-900">Employee Setup</h2>
          </div>
          <span
            class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
            :class="employmentTypeBadgeClass"
          >
            {{ employmentTypeLabel }}
          </span>
        </div>
        <EmployeeFilter
          :key="employeeFilterKey"
          :company_id="selectedCompanyId"
          :department_id="selectedDepartmentId"
          :line_type="selectedLineType"
          :employee_id="form.user_id"
          @filter-change="handleEmployeeFilterChange"
          />
      </div>
      <div class="grid items-start gap-3 xl:grid-cols-[0.92fr_0.88fr]">
        <section class="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">

          <div class="space-y-4">
           
            <p v-if="fieldErrors.user_id" class="mt-1 text-xs text-red-500">
              {{ fieldErrors.user_id }}
            </p>

            <div class="grid gap-3">
              <!-- <div class="rounded-xl bg-slate-50 px-3 py-2">
                <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Department</p>
                <p class="mt-1 text-sm font-medium text-slate-800">{{ userDisplay.dept || 'Not selected' }}</p>
              </div> -->

              <div class="rounded-xl bg-slate-50 px-3 py-2">
                <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Revision Rule</p>
                <p class="mt-1 text-xs font-medium text-slate-800">
                  {{ revisionRuleText }}
                </p>
              </div>

              <div v-if="loadingStructure" class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                Loading current structure...
              </div>

              <div
                v-else-if="currentStructure"
                class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Current Structure</p>
                    <p class="mt-1 text-sm font-medium text-slate-800">
                      Effective from {{ currentStructure.effective_from || 'N/A' }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Current Gross</p>
                    <p class="mt-1 font-mono text-sm font-semibold text-slate-900">
                      {{ formatCurrency(currentGross) }}
                    </p>
                  </div>
                </div>

                <div class="mt-3 grid gap-2 sm:grid-cols-2">
                  <div class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                    <p class="text-[11px] text-slate-400">Policy Breakdown</p>
                    <p class="mt-1 font-mono text-sm font-semibold text-slate-900">{{ formatCurrency(currentPolicyGross) }}</p>
                  </div>
                  <div class="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                    <p class="text-[11px] text-slate-400">Current {{ usesBasicOnlySalaryPolicy ? 'Somiti' : 'PF' }}</p>
                    <p class="mt-1 font-mono text-sm font-semibold text-slate-900">{{ formatCurrency(currentPfDeduction) }}</p>
                  </div>
                </div>
              </div>

              <div
                v-else-if="form.user_id"
                class="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-500"
              >
                No active salary structure found for this employee. Create a salary structure first.
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">
                  Review Date <span class="text-red-500">*</span>
                </label>
                <input v-model="form.review_date" type="date" :class="inputClass" />
                <p v-if="fieldErrors.review_date" class="mt-1 text-xs text-red-500">
                  {{ fieldErrors.review_date }}
                </p>
              </div>

              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">
                  Effective Month <span class="text-red-500">*</span>
                </label>
                <input v-model="form.effective_month" type="month" :class="inputClass" />
                <p v-if="fieldErrors.effective_month" class="mt-1 text-xs text-red-500">
                  {{ fieldErrors.effective_month }}
                </p>
              </div>
            </div>

            <section class="grid gap-2 sm:grid-cols-1 xl:grid-cols-2">
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Current Gross</p>
                <p class="mt-1 font-mono text-lg font-semibold text-slate-900">{{ formatCurrency(currentGross) }}</p>
                <p class="mt-1 text-xs text-slate-500">Active saved gross salary.</p>
              </div>

              <div class="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2.5 shadow-sm">
                <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700">Increment</p>
                <p class="mt-1 font-mono text-lg font-semibold text-cyan-900">{{ formatCurrency(incrementAmount) }}</p>
                <p class="mt-1 text-xs text-cyan-700">{{ incrementSupportText }}</p>
              </div>

              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Revised Gross</p>
                <p class="mt-1 font-mono text-lg font-semibold text-slate-900">{{ formatCurrency(revisedGross) }}</p>
                <p class="mt-1 text-xs text-slate-500">{{ revisedGrossSupportText }}</p>
              </div>

              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{{ deductionSummaryTitle }}</p>
                <p class="mt-1 font-mono text-lg font-semibold text-emerald-700">{{ formatCurrency(revisedNetPayable) }}</p>
                <p class="mt-1 text-xs text-slate-500">
                  {{ usesBasicOnlySalaryPolicy ? 'Revised gross plus allowances minus Somiti deduction.' : 'Revised gross minus PF deduction.' }}
                </p>
              </div>
            </section>
          </div>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 class="text-sm font-semibold text-slate-900">Revision Calculator</h2>
              <p class="text-xs text-slate-500">Compact inputs with real-time revised breakdown.</p>
            </div>
            <div class="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
              {{ activePolicyCompact }}
            </div>
          </div>

          <div class="space-y-3.5">
            <div class="grid gap-3 sm:grid-cols-[1fr_1.1fr]">
              <div>
                <label class="mb-2 block text-sm font-medium text-slate-700">Increment Type</label>
                <div class="grid grid-cols-2 gap-1 rounded-xl bg-slate-50 p-1">
                  <button
                    type="button"
                    class="rounded-lg px-3 py-2 text-sm font-medium transition"
                    :class="form.increment_type === 'fixed' ? 'bg-white text-cyan-700 shadow-sm ring-1 ring-cyan-100' : 'text-slate-600'"
                    @click="form.increment_type = 'fixed'"
                  >
                    Fixed
                  </button>
                  <button
                    type="button"
                    class="rounded-lg px-3 py-2 text-sm font-medium transition"
                    :class="form.increment_type === 'percentage' ? 'bg-white text-cyan-700 shadow-sm ring-1 ring-cyan-100' : 'text-slate-600'"
                    @click="form.increment_type = 'percentage'"
                  >
                    Percent
                  </button>
                </div>
              </div>

              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">
                  Increment Value <span class="text-red-500">*</span>
                </label>
                <input
                  v-model="form.increment_value"
                  type="number"
                  min="0"
                  step="0.01"
                  :class="inputClass"
                  :placeholder="form.increment_type === 'percentage' ? 'e.g. 10 (%)' : '0.00'"
                  :disabled="!currentStructure"
                />
                <p v-if="fieldErrors.increment_value" class="mt-1 text-xs text-red-500">
                  {{ fieldErrors.increment_value }}
                </p>
              </div>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
              <textarea
                v-model="form.remarks"
                rows="2"
                :class="inputClass + ' resize-none'"
                placeholder="Optional notes about this revision..."
              ></textarea>
            </div>

            <div class="grid gap-2 sm:grid-cols-2">
              <div
                v-for="item in componentCards"
                :key="item.key"
                class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-sm font-medium text-slate-700">{{ item.shortLabel }}</p>
                    <p class="text-[11px] text-slate-400">
                      {{ usesBasicOnlySalaryPolicy ? '100% of revised gross' : `${Math.round(item.ratio * 100)}% of revised gross` }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="font-mono text-sm font-semibold text-slate-900">{{ formatCurrency(item.revisedAmount) }}</p>
                    <p class="mt-1 text-[11px] text-slate-400">Prev {{ formatCurrency(item.currentAmount) }}</p>
                  </div>
                </div>
              </div>

              <div v-if="!usesBasicOnlySalaryPolicy" class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-sm font-medium text-amber-800">Bonus</p>
                    <p class="text-[11px] text-amber-600">Reference only</p>
                  </div>
                  <p class="font-mono text-sm font-semibold text-amber-900">{{ formatCurrency(revisedBonus) }}</p>
                </div>
              </div>
            </div>

            <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                    <p class="text-sm font-semibold text-slate-900">{{ deductionTitle }}</p>
                    <p class="mt-1 text-xs text-slate-500">
                    {{ deductionSupportText }}
                  </p>
                </div>
                <div class="text-right">
                  <p
                    class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                    :class="pfAllowedForCurrentEmploymentType ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'"
                  >
                    {{ pfAllowedForCurrentEmploymentType ? 'Applicable' : 'Not Applicable' }}
                  </p>
                  <p class="mt-2 font-mono text-sm font-semibold text-slate-900">{{ formatCurrency(form.pf_deduction) }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 class="text-sm font-semibold text-slate-900">Preserved Additional Allowances</h2>
            <p class="text-xs text-slate-500">
              {{ usesDayHonoriumAllowance ? 'Day Honorium is revised here. Other allowances carry forward unchanged.' : 'Existing additional allowances carry forward unchanged.' }}
            </p>
          </div>
          <div class="rounded-xl bg-slate-50 px-3 py-2 text-right">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Allowance Total</p>
            <p class="mt-1 font-mono text-sm font-semibold text-slate-900">{{ formatCurrency(revisedAllowanceTotal) }}</p>
          </div>
        </div>

        <div v-if="form.allowances.length" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="(allowance, index) in form.allowances"
            :key="`${allowance.allowance_code || allowance.allowance_name || 'allowance'}-${index}`"
            class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-slate-900">{{ allowance.allowance_name || 'Additional Allowance' }}</p>
                <p class="mt-1 text-xs text-slate-500">{{ allowance.allowance_code || 'No code' }}</p>
              </div>
              <span
                class="rounded-full px-2.5 py-1 text-xs font-medium"
                :class="allowance.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'"
              >
                {{ allowance.is_active ? 'Active' : 'Inactive' }}
              </span>
            </div>
            <p class="mt-3 font-mono text-lg font-semibold text-slate-900">{{ formatCurrency(allowance.amount) }}</p>
            <p v-if="allowance.remarks" class="mt-1 text-xs text-slate-500">{{ allowance.remarks }}</p>
          </div>
        </div>

        <div
          v-else
          class="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm italic text-slate-500"
        >
          No additional allowances will be carried forward.
        </div>
      </section>

      <div class="flex justify-end gap-3">
        <button
          type="button"
          class="btn-3"
          @click="router.push({ name: 'PayrollSalaryStructureList' })"
        >
          Cancel
        </button>
        <button type="submit" class="btn-2" :disabled="submitting">
          <i class="far" :class="submitting ? 'fa-spinner fa-spin' : 'fa-check'"></i>
          {{ submitting ? 'Applying...' : 'Apply Revision' }}
        </button>
      </div>
    </form>
  </div>
</template>
