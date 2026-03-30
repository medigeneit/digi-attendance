import { toNum } from '@/utils/currency'

export const SALARY_COMPONENT_POLICY = [
  { key: 'basic_salary', label: 'Basic Salary', ratio: 0.6, shortLabel: 'Basic' },
  { key: 'house_rent', label: 'House Rent', ratio: 0.3, shortLabel: 'House Rent' },
  { key: 'medical_allowance', label: 'Medical Allowance', ratio: 0.05, shortLabel: 'Medical' },
  {
    key: 'conveyance_allowance',
    label: 'Conveyance Allowance',
    ratio: 0.05,
    shortLabel: 'Conveyance',
  },
]

export const CONTRACT_SALARY_COMPONENT_POLICY = [
  { key: 'basic_salary', label: 'Basic Salary', ratio: 0.5, shortLabel: 'Basic' },
  { key: 'house_rent', label: 'House Rent', ratio: 0.3, shortLabel: 'House Rent' },
  { key: 'medical_allowance', label: 'Medical Allowance', ratio: 0.1, shortLabel: 'Medical' },
  {
    key: 'conveyance_allowance',
    label: 'Conveyance Allowance',
    ratio: 0.1,
    shortLabel: 'Conveyance',
  },
]

export const PROBATIONARY_SALARY_COMPONENT_POLICY = [
  { key: 'basic_salary', label: 'Basic Salary', ratio: 0.6, shortLabel: 'Basic' },
]

export const PROVIDENT_FUND_RATE = 0.05

export const normalizeEmploymentType = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

export const getSalaryComponentPolicy = (employmentType) =>
  normalizeEmploymentType(employmentType) === 'contract'
    ? CONTRACT_SALARY_COMPONENT_POLICY
    : normalizeEmploymentType(employmentType) === 'probationary'
      ? PROBATIONARY_SALARY_COMPONENT_POLICY
      : SALARY_COMPONENT_POLICY

export const isPfAllowedForEmploymentType = (employmentType) =>
  normalizeEmploymentType(employmentType) !== 'probationary'

export const roundCurrency = (value) => Number.parseFloat(toNum(value).toFixed(2))

export const calculateAllowanceTotal = (allowances = []) =>
  Array.isArray(allowances)
    ? roundCurrency(
        allowances
          .filter((allowance) => allowance?.is_active)
          .reduce((sum, allowance) => sum + toNum(allowance?.amount), 0),
      )
    : 0

export const calculateCoreGross = (salary) =>
  roundCurrency(
    ['basic_salary', 'house_rent', 'medical_allowance', 'conveyance_allowance'].reduce(
      (sum, key) => sum + toNum(salary?.[key]),
      0,
    ),
  )

export const calculateBonusAmount = (employmentType, basicSalary) => {
  const type = normalizeEmploymentType(employmentType)
  const rate = type === 'probationary' ? 0.25 : ['permanent', 'contract'].includes(type) ? 1 : 0
  return roundCurrency(toNum(basicSalary) * rate)
}

export const calculateTotalGross = (salary) =>
  roundCurrency(calculateCoreGross(salary) + calculateAllowanceTotal(salary?.allowances))

export const calculatePfDeduction = (basicSalary) =>
  roundCurrency(toNum(basicSalary) * PROVIDENT_FUND_RATE)

export const hasStoredPfDeduction = (salary) =>
  salary?.pf_deduction !== null &&
  salary?.pf_deduction !== undefined &&
  salary?.pf_deduction !== ''

export const hasStoredPfPercent = (salary) =>
  salary?.pf_percent !== null && salary?.pf_percent !== undefined && salary?.pf_percent !== ''

export const resolvePfDeduction = (salary) => {
  if (hasStoredPfDeduction(salary)) {
    return roundCurrency(salary.pf_deduction)
  }

  if (hasStoredPfPercent(salary)) {
    return roundCurrency((toNum(salary.basic_salary) * toNum(salary.pf_percent)) / 100)
  }

  return null
}

export const splitGrossByPolicy = (grossSalary, employmentType = null) => {
  const gross = roundCurrency(grossSalary)
  const policy = getSalaryComponentPolicy(employmentType)

  if (gross <= 0) {
    return {
      basic_salary: 0,
      house_rent: 0,
      medical_allowance: 0,
      conveyance_allowance: 0,
    }
  }

  if (policy.length === 1 && policy[0].key === 'basic_salary') {
    return {
      basic_salary: roundCurrency(gross * policy[0].ratio),
      house_rent: 0,
      medical_allowance: 0,
      conveyance_allowance: 0,
    }
  }

  const [basic, houseRent, medical] = policy.slice(0, 3).map((item) =>
    roundCurrency(gross * item.ratio),
  )
  const conveyance = roundCurrency(gross - basic - houseRent - medical)

  return {
    basic_salary: basic,
    house_rent: houseRent,
    medical_allowance: medical,
    conveyance_allowance: conveyance,
  }
}

export const normalizeAllowances = (allowances = []) =>
  Array.isArray(allowances)
    ? allowances.map((allowance) => ({
        allowance_code: allowance?.allowance_code || '',
        allowance_name: allowance?.allowance_name || '',
        amount: allowance?.amount ?? '',
        is_active: allowance?.is_active ?? true,
        remarks: allowance?.remarks || '',
      }))
    : []
