import apiClient from '@/axios'

/**
 * @typedef {Object} YearlyAttendanceSummaryParams
 * @property {string|number=} company_id
 * @property {string|number=} year
 * @property {string|number=} department_id
 * @property {boolean|number=} department_id_is_null
 * @property {string|number=} user_id
 * @property {string=} search
 * @property {number=} page
 * @property {number=} per_page
 * @property {string=} sort_by
 * @property {string=} sort_dir
 */

/**
 * @typedef {Object} YearlyAttendanceSummaryRow
 * @property {number|string} company_id
 * @property {number|string|null} department_id
 * @property {number|string} user_id
 * @property {number|string} year
 * @property {number} total_months
 * @property {number} yearly_present_pct
 * @property {number} score_months
 * @property {number} attendance_score_avg
 * @property {string=} department_name
 * @property {string=} user_name
 */

/**
 * @typedef {Object} YearlyAttendanceSummaryMeta
 * @property {number=} total
 * @property {number=} current_page
 * @property {number=} last_page
 * @property {number=} per_page
 */

/**
 * @typedef {Object} YearlyAttendanceSummaryResponse
 * @property {YearlyAttendanceSummaryRow[]=} data
 * @property {YearlyAttendanceSummaryMeta=} meta
 */

/**
 * Fetch yearly attendance summary rows.
 * @param {YearlyAttendanceSummaryParams} params
 * @returns {Promise<{data: YearlyAttendanceSummaryResponse}>}
 */
export const fetchYearlyAttendanceSummary = (params) => {
  return apiClient.get('/yearly-attendance-summary', { params })
}

/**
 * Export yearly attendance summary as CSV.
 * @param {YearlyAttendanceSummaryParams} params
 * @returns {Promise<{data: Blob}>}
 */
export const exportYearlyAttendanceSummary = (params) => {
  return apiClient.get('/yearly-attendance-summary/export', {
    params,
    responseType: 'blob',
  })
}
