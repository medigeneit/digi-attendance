import AppLayout from '@/layouts/AppLayout.vue'
import GuestLayout from '@/layouts/GuestLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/public-pages/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: GuestLayout,
      children: [
        {
          path: '/',
          name: 'Home',
          component: HomeView,
        },

        {
          path: '/about',
          name: 'About',
          component: () => import('@/views/public-pages/AboutView.vue'),
        },

        {
          path: '/login',
          name: 'login',
          component: () => import('../views/public-pages/LoginView.vue'),
        },

        {
          path: '/register',
          name: 'register',
          component: () => import('@/views/public-pages/RegisterView.vue'),
        },

        {
          path: '/privacy-policy',
          name: 'PrivacyPolicy',
          component: () => import('@/views/public-pages/PrivacyPolicy.vue'),
        },
      ],
    },
    {
      path: '/',
      component: AppLayout,
      children: [
        {
          path: '/profile',
          name: 'ProfileView',
          component: () => import('../views/private-pages/ProfileView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: '/dashboard',
          name: 'Dashboard',
          component: () => import('@/views/private-pages/DashBoard.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: 'task-management',
          name: 'TaskManagementView',
          component: () => import('@/views/private-pages/TaskManagementView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'projects',
          name: 'ProjectList',
          component: () => import('@/views/private-pages/projects/ProjectList.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'projects/add',
          name: 'ProjectAdd',
          component: () => import('@/views/private-pages/projects/ProjectAdd.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'projects/edit/:id',
          name: 'ProjectEdit',
          component: () => import('@/views/private-pages/projects/ProjectEdit.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: 'requirements',
          name: 'RequirementList',
          component: () => import('@/views/private-pages/requirements/RequirementList.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: 'requirements/add',
          name: 'RequirementAdd',
          component: () => import('@/views/private-pages/requirements/RequirementAdd.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'requirements/edit/:id',
          name: 'RequirementEdit',
          component: () => import('@/views/private-pages/requirements/RequirementEdit.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: 'tasks',
          name: 'TaskList',
          component: () => import('@/views/private-pages/tasks/TaskList.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: 'tasks/add',
          name: 'TaskAdd',
          component: () => import('@/views/private-pages/tasks/TaskAdd.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: 'tasks/edit/:id',
          name: 'TaskEdit',
          component: () => import('@/views/private-pages/tasks/TaskEdit.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: 'tasks/:id',
          name: 'TaskShow',
          component: () => import('@/views/private-pages/tasks/TaskShow.vue'),
          meta: { requiresAuth: true },
          children: [
            {
              path: 'reports',
              name: 'TaskReports',
              component: () => import('@/views/private-pages/tasks/TaskReports.vue'),
              meta: { requiresAuth: true }
            },
            {
              path: 'add-report',
              name: 'TaskReportAdd',
              component: () => import('@/views/private-pages/tasks/AddTaskReport.vue'),
              meta: { requiresAuth: true }
            },
          ]
        },

        {
          path: 'tasks/:id/assign-users',
          name: 'TaskUserAssign',
          component: () => import('@/views/private-pages/tasks/TaskUserAssign.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: 'my-todos',
          name: 'MyTodoList',
          component: () => import('@/views/private-pages/MyTodoList.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: 'todos',
          name: 'TodoList',
          component: () => import('@/views/private-pages/todos/TodoList.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: 'todos/add/:todoable_id',
          name: 'TodoAdd',
          component: () => import('@/views/private-pages/todos/TodoAdd.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: 'todos/edit/:id',
          name: 'TodoEdit',
          component: () => import('@/views/private-pages/todos/TodoEdit.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: 'bugs',
          name: 'BugList',
          component: () => import('@/views/private-pages/bugs/BugList.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'bugs/add',
          name: 'BugAdd',
          component: () => import('@/views/private-pages/bugs/BugAdd.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'bugs/:id/edit',
          name: 'BugEdit',
          component: () => import('@/views/private-pages/bugs/BugEdit.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: 'bugs/:id/assign-users',
          name: 'BugUserAssign',
          component: () => import('@/views/private-pages/bugs/BugUserAssign.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: 'meetings',
          name: 'MeetingList',
          component: () => import('@/views/private-pages/meetings/MeetingList.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'meetings/add',
          name: 'MeetingAdd',
          component: () => import('@/views/private-pages/meetings/MeetingAdd.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'meetings/edit/:id',
          name: 'MeetingEdit',
          component: () => import('@/views/private-pages/meetings/MeetingEdit.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: 'meeting/:id/assign-users',
          name: 'MeetingUserAssign',
          component: () => import('@/views/private-pages/meetings/MeetingUserAssign.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: 'comments',
          name: 'CommentList',
          component: () => import('@/views/private-pages/comments/CommentList.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'comments/add',
          name: 'CommentAdd',
          component: () => import('@/views/private-pages/comments/CommentAdd.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'comments/edit/:id',
          name: 'CommentEdit',
          component: () => import('@/views/private-pages/comments/CommentEdit.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: '/my-attendance',
          name: 'MyAttendance',
          component: () => import('@/views/private-pages/MyAttendance.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: '/attendance',
          name: 'AttendanceView',
          component: () => import('@/views/private-pages/AttendanceView.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },
        {
          path: '/settings',
          name: 'SettingsView',
          component: () => import('@/views/admin-pages/SettingsView.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },
        {
          path: '/settings/user-list',
          name: 'UserList',
          component: () => import('@/views/admin-pages/UserList.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },
        {
          path: '/settings/user-add',
          name: 'UserAdd',
          component: () => import('@/views/admin-pages/UserAdd.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },
        {
          path: '/settings/user-show/:id',
          name: 'UserShow',
          component: () => import('@/views/admin-pages/UserShow.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },
        {
          path: '/settings/user-edit/:id',
          name: 'UserEdit',
          component: () => import('@/views/admin-pages/UserEdit.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },
        {
          path: '/settings/device-list',
          name: 'DeviceList',
          component: () => import('@/views/admin-pages/DeviceList.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },
        {
          path: '/settings/company-list',
          name: 'CompanyList',
          component: () => import('@/views/admin-pages/CompanyList.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },
        {
          path: '/settings/department-list',
          name: 'DepartmentList',
          component: () => import('@/views/admin-pages/DepartmentList.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },
        {
          path: '/settings/designation-list',
          name: 'DesignationList',
          component: () => import('@/views/admin-pages/DesignationList.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },
        {
          path: '/settings/shift-list',
          name: 'ShiftList',
          component: () => import('@/views/admin-pages/ShiftList.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },
        {
          path: '/settings/leave-type-list',
          name: 'LeaveTypeList',
          component: () => import('@/views/admin-pages/LeaveTypeList.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },
        {
          path: '/settings/leave-approval-list',
          name: 'LeaveApprovalList',
          component: () => import('@/views/admin-pages/LeaveApprovalList.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },
        {
          path: '/settings/other-approval-list',
          name: 'OtherApprovalList',
          component: () => import('@/views/admin-pages/LeaveApprovalList.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },
        {
          path: '/settings/holiday-list',
          name: 'HoliDayList',
          component: () => import('@/views/admin-pages/HoliDayList.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },
        {
          path: '/hrd/notice',
          name: 'NoticeList',
          component: () => import('@/views/admin-pages/NoticeList.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },

        {
          path: '/hrd/notice-add',
          name: 'NoticeAdd',
          component: () => import('@/views/admin-pages/NoticeAdd.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },
        {
          path: '/hrd/notice-show/:id',
          name: 'NoticeShow',
          component: () => import('@/views/admin-pages/NoticeShow.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },

        {
          path: '/hrd/notice-feedback-show/:id',
          name: 'NoticeFeedbackShow',
          component: () => import('@/views/admin-pages/NoticeFeedbackList.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },

        {
          path: '/hrd/notice-edit/:id',
          name: 'NoticeEdit',
          component: () => import('@/views/admin-pages/NoticeEdit.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },

        {
          path: '/reports',
          name: 'ReportView',
          component: () => import('@/views/admin-pages/ReportView.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },
        {
          path: '/reports/today-attendance-report',
          name: 'TodayAttendanceReport',
          component: () => import('@/views/admin-pages/TodayAttendanceReport.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },
        {
          path: '/reports/monthly-attendance-report',
          name: 'MonthlyAttendanceReport',
          component: () => import('@/views/admin-pages/MonthlyAttendanceReport.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },
        {
          path: '/reports/monthly-attendance-summary-report',
          name: 'AttendanceSummaryReport',
          component: () => import('@/views/admin-pages/MonthlyAttendanceSummaryReport.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },
        {
          path: '/reports/leave-attendance-list',
          name: 'LateAttendanceReport',
          component: () => import('@/views/admin-pages/LateAttendanceReport.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },

        {
          path: '/hrd',
          name: 'HrdView',
          component: () => import('@/views/admin-pages/HrdView.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },

        {
          path: '/hrd/em-attendance',
          name: 'EmployeeAttendance',
          component: () => import('@/views/admin-pages/EmployeeAttendance.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },

        {
          path: '/hrd/em-attendance-log',
          name: 'EmployeeAttendanceLog',
          component: () => import('@/views/admin-pages/EmployeeAttendanceLog.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },

        {
          path: '/hrd/shift-schedules',
          name: 'ShiftSchedule',
          component: () => import('@/views/admin-pages/ShiftScheduleForm.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },

        {
          path: '/hrd/leave-application-list',
          name: 'LeaveApplicationList',
          component: () => import('@/views/admin-pages/LeaveApplicationList.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },

        {
          path: '/hrd/short-leave-list',
          name: 'ShortLeaveList',
          component: () => import('@/views/admin-pages/ShortLeaveList.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },

        {
          path: '/hrd/offday-exchange-list',
          name: 'OffdayExchangeList',
          component: () => import('@/views/admin-pages/OffdayExchangeList.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },

        {
          path: '/hrd/shift-exchange-list',
          name: 'ShiftExchangeList',
          component: () => import('@/views/admin-pages/ShiftExchangeList.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },

        {
          path: '/hrd/manual-attendance-list',
          name: 'ManualAttendanceList',
          component: () => import('@/views/admin-pages/ManualAttendanceList.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] },
        },

        {
          path: '/my-profile',
          name: 'MyProfile',
          component: () => import('@/views/private-pages/MyProfile.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: '/my-profile/edit',
          name: 'EditProfile',
          component: () => import('@/views/private-pages/ProfileEdit.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: '/my-notifications',
          name: 'MyNotificationList',
          component: () => import('@/views/private-pages/MyNotificationList.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: '/my-notifications/:type',
          name: 'MySpecificNotificationList',
          component: () => import('@/views/private-pages/MySpecificNotificationList.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: '/notifications',
          name: 'NotificationList',
          component: () => import('@/components/NotificationList.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: '/notices',
          name: 'NoticeView',
          component: () => import('@/views/private-pages/NoticeView.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: '/general-notices',
          name: 'MyNoticeList',
          component: () => import('@/views/private-pages/NoticeList.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: '/policy',
          name: 'PolicyList',
          component: () => import('@/views/private-pages/PolicyList.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: '/policy-details/:id',
          name: 'PolicyDetails',
          component: () => import('@/views/private-pages/PolicyDetails.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: '/notice-details/:id',
          name: 'MyNoticeDetails',
          component: () => import('@/views/private-pages/NoticeDetails.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: '/my-applications',
          name: 'MyApplications',
          component: () => import('@/views/private-pages/MyApplications.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: '/my-applications/leave-applications',
          name: 'MyLeaveApplications',
          component: () => import('@/views/private-pages/MyLeaveApplications.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: '/my-applications/leave-application-add',
          name: 'LeaveApplicationAdd',
          component: () => import('@/views/private-pages/LeaveApplicationAdd.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: '/my-applications/leave-application-show/:id',
          name: 'MyLeaveApplicationShow',
          component: () => import('@/views/private-pages/LeaveApplicationShow.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: '/leave-application-show/:id',
          name: 'LeaveApplicationShow',
          component: () => import('@/views/private-pages/LeaveApplicationShow.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: '/leave-application-edit/:id',
          name: 'LeaveApplicationEdit',
          component: () => import('@/views/private-pages/LeaveApplicationEdit.vue'),
          meta: { requiresAuth: true, roles: ['super_admin', 'developer'] },
        },
        {
          path: '/my-applications/short-leaves',
          name: 'MyShortLeaves',
          component: () => import('@/views/private-pages/MyShortLeaves.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: '/my-applications/short-leaves-add',
          name: 'ShortLeaveAdd',
          component: () => import('@/views/private-pages/ShortLeaveAdd.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: '/short-leave-show/:id',
          name: 'ShortLeaveShow',
          component: () => import('@/views/private-pages/ShortLeaveShow.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: '/my-applications/my-offday-exchanges',
          name: 'MyOffdayExchangeList',
          component: () => import('@/views/private-pages/MyOffdayExchangeList.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: '/my-applications/offday-exchanges-add',
          name: 'OffdayExchangeAdd',
          component: () => import('@/views/private-pages/OffdayExchangeAdd.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: '/my-applications/my-shift-exchanges',
          name: 'MyShiftExchangeList',
          component: () => import('@/views/private-pages/MyShiftExchangeList.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: '/my-applications/shift-exchanges-add',
          name: 'ShiftExchangeAdd',
          component: () => import('@/views/private-pages/ShiftExchangeAdd.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: '/exchange-shift-show/:id',
          name: 'ExchangeShiftShow',
          component: () => import('@/views/private-pages/ExchangeShiftShow.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: '/exchange-offday-show/:id',
          name: 'ExchangeOffdayShow',
          component: () => import('@/views/private-pages/ExchangeOffdayShow.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: '/my-applications/my-manual-attendances',
          name: 'MyManualAttendanceList',
          component: () => import('@/views/private-pages/MyManualAttendanceList.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: '/my-applications/manual-attendances-add',
          name: 'ManualAttendanceAdd',
          component: () => import('@/views/private-pages/ManualAttendanceAdd.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: '/manual-attendance-show/:id',
          name: 'ManualAttendanceShow',
          component: () => import('@/views/private-pages/ManualAttendanceShow.vue'),
          meta: { requiresAuth: true },
        },
      ],
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  const isAuthenticated = !!authStore.token || localStorage.getItem('auth_token')

  if (to.matched.some((record) => record.meta.requiresAuth) && !isAuthenticated) {
    localStorage.setItem('next', to.fullPath)

    next({ name: 'login' })
  } else {
    next()
  }
})

export default router
