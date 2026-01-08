export function useLeaveReportFormat() {
  const safeNum = (v) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }

  /**
   * Backend keys (based on your current code)
   * - Special Leave backend key: "SPECIAL LEAVE"
   * - WPL backend key: "WITHOUT PAY LEAVE(WPL)"
   * - DPC backend key: "DAY PAY CUT"
   */
  const LEAVE = {
    CL: 'CL',
    ML: 'ML',
    SL: 'SPECIAL LEAVE', // ✅ show as SL in UI
    WPL: 'WITHOUT PAY LEAVE(WPL)',
    DPC: 'DAY PAY CUT',
  }

  const LABEL = {
    [LEAVE.CL]: 'CL',
    [LEAVE.ML]: 'ML',
    [LEAVE.SL]: 'SL',
    [LEAVE.WPL]: 'WPL',
    [LEAVE.DPC]: 'DPC',
  }

  // balances[typeKey] = { effective_annual_quota, used_approved_leave_days, remaining }
  const getBalanceQuota = (row, typeKey) => safeNum(row?.balances?.[typeKey]?.effective_annual_quota)
  const getBalanceUsed = (row, typeKey) => safeNum(row?.balances?.[typeKey]?.used_approved_leave_days)
  const getBalanceRemaining = (row, typeKey) => safeNum(row?.balances?.[typeKey]?.remaining)

  /**
   * DPC is NOT like normal leave in many APIs.
   * In your code you already have: row?.day_pay_cut_days and row?.hour_pay_cut
   * We'll treat:
   * - total DPC = quota if exists else 0 (you can wire it later)
   * - used DPC = day_pay_cut_days
   * - balance DPC = total - used
   */
  const getDpcUsed = (row) => safeNum(row?.day_pay_cut_days)
  const getDpcTotal = (row) => {
    // if your backend later provides something like row?.dpc_quota, put it here
    return safeNum(row?.dpc_quota ?? row?.day_pay_cut_total ?? 0)
  }
  const getDpcBalance = (row) => {
    const total = getDpcTotal(row)
    const used = getDpcUsed(row)
    return safeNum(total - used)
  }

  const getTotal = (row, typeKey) => {
    if (typeKey === LEAVE.DPC) return getDpcTotal(row)
    return getBalanceQuota(row, typeKey)
  }

  const getUsed = (row, typeKey) => {
    if (typeKey === LEAVE.DPC) return getDpcUsed(row)
    return getBalanceUsed(row, typeKey)
  }

  const getBalance = (row, typeKey) => {
    if (typeKey === LEAVE.DPC) return getDpcBalance(row)
    return getBalanceRemaining(row, typeKey)
  }

  const employeeLines = (row) => ({
    name: row?.user?.name || 'Unknown',
    meta: `${row?.user?.department || ''}${row?.user?.department && row?.user?.designation ? ' • ' : ''}${
      row?.user?.designation || ''
    }`,
  })

  // ✅ Part-2 column layout like image-2
  const PART2_GROUPS = [
    {
      title: 'Total',
      cols: [LEAVE.WPL, LEAVE.SL, LEAVE.DPC], // image-2 shows WPL, Special Leave, Day Pay Cut
    },
    {
      title: 'Used',
      cols: [LEAVE.CL, LEAVE.ML, LEAVE.SL, LEAVE.WPL, LEAVE.SL, LEAVE.DPC],
      // If you don't want duplicate SL, remove one.
      // But screenshot looks like: CL ML SL WPL Special Leave Day Pay Cut
      // We'll keep a single SL (recommended) in Step-2.
    },
    {
      title: 'Balance',
      cols: [LEAVE.CL, LEAVE.ML, LEAVE.SL, LEAVE.WPL, LEAVE.SL, LEAVE.DPC],
    },
  ]

  return {
    LEAVE,
    LABEL,
    employeeLines,
    getTotal,
    getUsed,
    getBalance,
    PART2_GROUPS,
  }
}
