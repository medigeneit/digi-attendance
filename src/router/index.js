import AppLayout from '@/layouts/AppLayout.vue'
import GuestLayout from '@/layouts/GuestLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/public-pages/HomeView.vue'
import { useRouteHistory } from './history'

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
          meta: { title: 'Home' },
        },

        {
          path: '/about',
          name: 'About',
          component: () => import('@/views/public-pages/AboutView.vue'),
          meta: { title: 'About' },
        },

        {
          path: '/login',
          name: 'login',
          component: () => import('../views/public-pages/LoginView.vue'),
          meta: { title: 'Login' },
        },

        {
          path: '/register',
          name: 'register',
          component: () => import('@/views/public-pages/RegisterView.vue'),
          meta: { title: 'Register' },
        },

        {
          path: '/privacy-policy',
          name: 'PrivacyPolicy',
          component: () => import('@/views/public-pages/PrivacyPolicy.vue'),
          meta: { title: 'Privacy Policy' },
        },
      ],
    },
    {
      path: '/',
      component: AppLayout,
      children: [
        // {
        //   path: '/profile',
        //   name: 'ProfileView',
        //   component: () => import('../views/private-pages/ProfileView.vue'),
        //   meta: { requiresAuth: true, title: 'Profile' },
        // },
        {
          path: '/dashboard',
          name: 'Dashboard',
          component: () => import('@/views/private-pages/DashBoard.vue'),
          meta: { requiresAuth: true, title: 'Dashboard' },
        },

        {
          path: 'task-management',
          name: 'TaskManagementView',
          component: () => import('@/views/private-pages/TaskManagementView.vue'),
          meta: { requiresAuth: true, title: 'Task Management' },
        },
        {
          path: 'projects',
          name: 'ProjectList',
          component: () => import('@/views/private-pages/projects/ProjectList.vue'),
          meta: { requiresAuth: true, title: 'Projects' },
        },
        {
          path: 'projects/add',
          name: 'ProjectAdd',
          component: () => import('@/views/private-pages/projects/ProjectAdd.vue'),
          meta: { requiresAuth: true, title: 'Add Project' },
        },
        {
          path: 'projects/edit/:id',
          name: 'ProjectEdit',
          component: () => import('@/views/private-pages/projects/ProjectEdit.vue'),
          meta: { requiresAuth: true, title: 'Edit Project' },
        },

        {
          path: 'requirements',
          name: 'RequirementList',
          component: () => import('@/views/private-pages/requirements/RequirementList.vue'),
          meta: { requiresAuth: true, title: 'Requirement List' },
        },

        {
          path: 'requirements/add',
          name: 'RequirementAdd',
          component: () => import('@/views/private-pages/requirements/RequirementAdd.vue'),
          meta: { requiresAuth: true, title: 'Add Requirement' },
        },
        {
          path: 'requirements/edit/:id',
          name: 'RequirementEdit',
          component: () => import('@/views/private-pages/requirements/RequirementEdit.vue'),
          meta: { requiresAuth: true, title: 'Edit Requirement' },
        },
        {
          path: 'requirements/show/:id',
          name: 'RequirementShow',
          component: () => import('@/views/private-pages/requirements/RequirementShow.vue'),
          meta: { requiresAuth: true, title: 'Show Requirement' },
        },
        {
          path: 'tasks',
          name: 'TaskList',
          component: () => import('@/views/private-pages/tasks/TaskList.vue'),
          meta: { requiresAuth: true, title: 'Task List' },
        },
        {
          path: 'task-reports',
          name: 'MonthlyTaskReports',
          component: () => import('@/views/private-pages/tasks/MonthlyTaskReportPage.vue'),
          meta: { requiresAuth: true, title: 'Task List' },
        },

        {
          path: 'tasks/add',
          name: 'TaskAdd',
          component: () => import('@/views/private-pages/tasks/TaskAdd.vue'),
          meta: { requiresAuth: true, title: 'Add Task' },
        },

        {
          path: 'tasks/edit/:id',
          name: 'TaskEdit',
          component: () => import('@/views/private-pages/tasks/TaskEdit.vue'),
          meta: { requiresAuth: true, title: 'Edit Task' },
        },

        {
          path: 'tasks/:id',
          name: 'TaskShow',
          component: () => import('@/views/private-pages/tasks/TaskShow.vue'),
          meta: { requiresAuth: true, title: 'Task Show' },
          children: [
            {
              path: 'sub-tasks',
              name: 'SubTasks',
              component: () => import('@/views/private-pages/tasks/SubTasks.vue'),
              meta: { requiresAuth: true },
            },
            {
              path: 'reports',
              name: 'TaskReports',
              component: () => import('@/views/private-pages/tasks/TaskReports.vue'),
              meta: { requiresAuth: true },
            },
            {
              path: 'add-report',
              name: 'TaskReportAdd',
              component: () => import('@/views/private-pages/tasks/AddTaskReport.vue'),
              meta: { requiresAuth: true },
            },
          ],
        },
        {
          path: 'my-tasks/:id',
          name: 'MyTaskShow',
          component: () => import('@/views/private-pages/tasks/TaskShow.vue'),
          meta: { requiresAuth: true, title: 'Task Show' },
          children: [
            {
              path: 'sub-tasks',
              name: 'MySubTasks',
              component: () => import('@/views/private-pages/tasks/SubTasks.vue'),
              meta: { requiresAuth: true },
            },
            {
              path: 'reports',
              name: 'MyTaskReports',
              component: () => import('@/views/private-pages/tasks/TaskReports.vue'),
              meta: { requiresAuth: true },
            },
            {
              path: 'add-report',
              name: 'MyTaskReportAdd',
              component: () => import('@/views/private-pages/tasks/AddTaskReport.vue'),
              meta: { requiresAuth: true },
            },
          ],
        },

        {
          path: 'tasks/:id/assign-users',
          name: 'TaskUserAssign',
          component: () => import('@/views/private-pages/tasks/TaskUserAssignForm.vue'),
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
          path: 'tasks',
          name: 'TaskList',
          component: () => import('@/views/private-pages/tasks/TaskList.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'my-tasks',
          name: 'MyTaskList',
          component: () => import('@/views/private-pages/tasks/TaskList.vue'),
          meta: { requiresAuth: true, isMyTask: true },
        },

        {
          path: '/attendance',
          name: 'MyAttendance',
          component: () => import('@/views/private-pages/MyAttendance.vue'),
          meta: { requiresAuth: true, title: 'Attendance' },
        },

        {
          path: '/attendance',
          name: 'AttendanceView',
          component: () => import('@/views/private-pages/AttendanceView.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Attendance View',
          },
        },

        {
          path: '/settings',
          name: 'SettingsView',
          component: () => import('@/views/admin-pages/SettingsView.vue'),
          meta: { requiresAuth: true, roles: ['super_admin', 'developer'], title: 'Settings View' },
        },
        {
          path: '/settings/permissions-add',
          name: 'PermissionsAdd',
          component: () => import('@/views/admin-pages/PermissionAdd.vue'),
          meta: {
            requiresAuth: true,
            roles: ['super_admin', 'developer'],
            title: 'Permissions Add',
          },
        },
        {
          path: '/settings/permissions-edit/:id',
          name: 'PermissionEdit',
          component: () => import('@/views/admin-pages/PermissionEdit.vue'),
          meta: {
            requiresAuth: true,
            roles: ['super_admin', 'developer'],
            title: 'Permissions Add',
          },
        },

        {
          path: '/settings/permissions-list',
          name: 'PermissionList',
          component: () => import('@/views/admin-pages/PermissionList.vue'),
          meta: {
            requiresAuth: true,
            roles: ['super_admin', 'developer'],
            title: 'Permissions List',
          },
        },

        {
          path: '/settings/user-list',
          name: 'UserList',
          component: () => import('@/views/admin-pages/UserList.vue'),
          meta: { requiresAuth: true, roles: ['super_admin', 'developer'], title: 'User List' },
        },
        {
          path: '/settings/user-add',
          name: 'UserAdd',
          component: () => import('@/views/admin-pages/UserAdd.vue'),
          meta: { requiresAuth: true, roles: ['super_admin', 'developer'], title: 'Add User' },
        },
        {
          path: '/settings/user-show/:id',
          name: 'UserShow',
          component: () => import('@/views/admin-pages/UserShow.vue'),
          meta: { requiresAuth: true, roles: ['super_admin', 'developer'], title: 'Show User' },
        },
        {
          path: '/settings/user-edit/:id',
          name: 'UserEdit',
          component: () => import('@/views/admin-pages/UserEdit.vue'),
          meta: { requiresAuth: true, roles: ['super_admin', 'developer'], title: 'Edit User' },
        },
        {
          path: '/settings/device-list',
          name: 'DeviceList',
          component: () => import('@/views/admin-pages/DeviceList.vue'),
          meta: { requiresAuth: true, roles: ['super_admin', 'developer'], title: 'Device List' },
        },
        {
          path: '/settings/zk-users',
          name: 'ZKUsers',
          component: () => import('@/views/admin-pages/ZKUsers.vue'),
          meta: { requiresAuth: true, roles: ['super_admin', 'developer'], title: 'ZKU List' },
        },
        {
          path: '/settings/company-list',
          name: 'CompanyList',
          component: () => import('@/views/admin-pages/CompanyList.vue'),
          meta: { requiresAuth: true, roles: ['super_admin', 'developer'], title: 'Company List' },
        },
        {
          path: '/settings/department-list',
          name: 'DepartmentList',
          component: () => import('@/views/admin-pages/DepartmentList.vue'),
          meta: {
            requiresAuth: true,
            roles: ['super_admin', 'developer'],
            title: 'Department List',
          },
        },
        {
          path: '/settings/designation-list',
          name: 'DesignationList',
          component: () => import('@/views/admin-pages/DesignationList.vue'),
          meta: {
            requiresAuth: true,
            roles: ['super_admin', 'developer'],
            title: 'Designation List',
          },
        },
        {
          path: '/settings/shift-list',
          name: 'ShiftList',
          component: () => import('@/views/admin-pages/ShiftList.vue'),
          meta: { requiresAuth: true, roles: ['super_admin', 'developer'], title: 'Shift List' },
        },
        {
          path: '/settings/leave-type-list',
          name: 'LeaveTypeList',
          component: () => import('@/views/admin-pages/LeaveTypeList.vue'),
          meta: {
            requiresAuth: true,
            roles: ['super_admin', 'developer'],
            title: 'Leave Type List',
          },
        },
        {
          path: '/settings/leave-approval-list',
          name: 'LeaveApprovalList',
          component: () => import('@/views/admin-pages/LeaveApprovalList.vue'),
          meta: {
            requiresAuth: true,
            roles: ['super_admin', 'developer'],
            title: 'Leave Approval List',
          },
        },
        {
          path: '/settings/other-approval-list',
          name: 'OtherApprovalList',
          component: () => import('@/views/admin-pages/LeaveApprovalList.vue'),
          meta: {
            requiresAuth: true,
            roles: ['super_admin', 'developer'],
            title: 'Other Approval List',
          },
        },
        {
          path: '/settings/holiday-list',
          name: 'HoliDayList',
          component: () => import('@/views/admin-pages/HoliDayList.vue'),
          meta: { requiresAuth: true, roles: ['super_admin', 'developer'], title: 'HoliDay List' },
        },
        {
          path: '/hrd/notice',
          name: 'NoticeList',
          component: () => import('@/views/admin-pages/NoticeList.vue'),
          meta: {
            requiresAuth: true,
            roles: ['super_admin', 'developer'],
            title: 'Notice List',
          },
        },

        {
          path: '/hrd/notice-add',
          name: 'NoticeAdd',
          component: () => import('@/views/admin-pages/NoticeAdd.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Notice Add',
          },
        },
        {
          path: '/hrd/notice-show/:id',
          name: 'NoticeShow',
          component: () => import('@/views/admin-pages/NoticeShow.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Notice Show',
          },
        },

        {
          path: '/hrd/notice-feedback-show/:id',
          name: 'NoticeFeedbackShow',
          component: () => import('@/views/admin-pages/NoticeFeedbackList.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Notice Feedback Show',
          },
        },

        {
          path: '/hrd/notice-edit/:id',
          name: 'NoticeEdit',
          component: () => import('@/views/admin-pages/NoticeEdit.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Notice Edit',
          },
        },

        {
          path: '/reports',
          name: 'ReportView',
          component: () => import('@/views/admin-pages/ReportView.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Report View',
          },
        },
        {
          path: '/reports/today-attendance-report',
          name: 'TodayAttendanceReport',
          component: () => import('@/views/admin-pages/TodayAttendanceReport.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Today Attendance Report',
          },
        },
        {
          path: '/reports/monthly-attendance-report',
          name: 'MonthlyAttendanceReport',
          component: () => import('@/views/admin-pages/MonthlyAttendanceReport.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Monthly Attendance Report',
          },
        },
        {
          path: '/reports/monthly-attendance-summary-report',
          name: 'AttendanceSummaryReport',
          component: () => import('@/views/admin-pages/MonthlyAttendanceSummaryReport.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Attendance Summary Report',
          },
        },

        {
          path: '/reports/date-wise-attendance-summary-report',
          name: 'DateWiseAttendanceSummaryReport',
          component: () => import('@/views/admin-pages/DateRangeWiseAttendanceReport.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Attendance Summary Report',
          },
        },

        {
          path: '/reports/monthly-late-report-list',
          name: 'LateAttendanceReport',
          component: () => import('@/views/admin-pages/LateAttendanceReport.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Late Attendance Report',
          },
        },

        {
          path: '/reports/overtime-report',
          name: 'OvertimeReport',
          component: () => import('@/views/admin-pages/OvertimeReport.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Late Attendance Report',
          },
        },

        {
          path: '/reports/daily-late-report-list',
          name: 'DailyLateAttendanceReport',
          component: () => import('@/views/admin-pages/DailyLateAttendanceReport.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Daily Late Attendance Report',
          },
        },

        {
          path: '/hrd',
          name: 'HrdView',
          component: () => import('@/views/admin-pages/HrdView.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Hrd View',
          },
        },

        {
          path: '/hrd/em-attendance',
          name: 'EmployeeAttendance',
          component: () => import('@/views/admin-pages/EmployeeAttendance.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Attendance',
          },
        },

        {
          path: '/hrd/em-attendance-log',
          name: 'EmployeeAttendanceLog',
          component: () => import('@/views/admin-pages/EmployeeAttendanceLog.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Attendance Log',
          },
        },

        {
          path: '/hrd/month-wise-application-log',
          name: 'MonthWiseApplicationLog',
          component: () => import('@/views/admin-pages/MonthWiseApplicationLog.vue'),
          meta: {
            requiresAuth: true,
            roles: ['super_admin', 'developer'],
            title: 'Monthly Application Log',
          },
        },

        {
          path: '/hrd/shift-schedules',
          name: 'ShiftSchedule',
          component: () => import('@/views/admin-pages/ShiftScheduleForm.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Shift Schedule',
          },
        },

        {
          path: '/hrd/leave-application-list',
          name: 'LeaveApplicationList',
          component: () => import('@/views/admin-pages/LeaveApplicationList.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Leave Application List',
          },
        },
        {
          path: '/hrd/leave-applications-for-day',
          name: 'LeaveApplicationsForDay',
          component: () => import('@/views/admin-pages/LeaveApplicationForDays.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Leave Application List',
          },
        },

        {
          path: '/hrd/pre-after-leave-applications',
          name: 'PreviousAfterApplicationList',
          component: () => import('@/views/admin-pages/PrevAfterLeaveApplicationList.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Leave Application List',
          },
        },

        {
          path: '/hrd/short-leave-list',
          name: 'ShortLeaveList',
          component: () => import('@/views/admin-pages/ShortLeaveList.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Short Leave List',
          },
        },

        {
          path: '/hrd/date-wise-short-leave-list',
          name: 'DateWiseShortLeaveList',
          component: () => import('@/views/admin-pages/DateWiseShortLeaveList.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Short Leave List',
          },
        },

        {
          path: '/hrd/offday-exchange-list',
          name: 'OffdayExchangeList',
          component: () => import('@/views/admin-pages/OffdayExchangeList.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Offday Exchange List',
          },
        },

        {
          path: '/hrd/shift-exchange-list',
          name: 'ShiftExchangeList',
          component: () => import('@/views/admin-pages/ShiftExchangeList.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Shift Exchange List',
          },
        },

        {
          path: '/hrd/manual-attendance-list',
          name: 'ManualAttendanceList',
          component: () => import('@/views/admin-pages/ManualAttendanceList.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Manual Attendance List',
          },
        },
        {
          path: '/hrd/admin-manual-attendance-application',
          name: 'HrdAdminManualAttendanceApplication',
          component: () => import('@/views/admin-pages/AdminManualAttendanceApplication.vue'),
          meta: {
            requiresAuth: true,
            roles: ['super_admin', 'developer'],
            title: 'Hrd Admin Manual Attendace Application',
          },
        },

        {
          path: '/hrd/overtime-list',
          name: 'OvertimeList',
          component: () => import('@/views/admin-pages/OvertimeList.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Overtime List',
          },
        },

        {
          path: '/hrd/paycut-list',
          name: 'PayCutList',
          component: () => import('@/views/admin-pages/PayCutList.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Overtime List',
          },
        },

        {
          path: '/hrd/manual-attendance-add',
          name: 'HrdManualAttendanceAdd',
          component: () => import('@/views/admin-pages/ManualAttendanceAdd.vue'),
          meta: {
            requiresAuth: true,
            roles: ['admin', 'super_admin', 'developer'],
            title: 'Hrd Manual Attendance Add',
          },
        },

        {
          path: '/hrd/admin-leave-application',
          name: 'HrdAdminLeaveApplication',
          component: () => import('@/views/admin-pages/AdminLeaveApplication.vue'),
          meta: {
            requiresAuth: true,
            roles: ['super_admin', 'developer'],
            title: 'Hrd Admin Leave Application',
          },
        },

        {
          path: '/profile',
          name: 'MyProfile',
          component: () => import('@/views/private-pages/MyProfile.vue'),
          meta: { requiresAuth: true, title: 'Profile' },
        },

        {
          path: '/profile/edit',
          name: 'EditProfile',
          component: () => import('@/views/private-pages/ProfileEdit.vue'),
          meta: { requiresAuth: true, title: 'Edit Profile' },
        },

        {
          path: '/notifications',
          name: 'MyNotificationList',
          component: () => import('@/views/private-pages/MyNotificationList.vue'),
          meta: { requiresAuth: true, title: 'Notification List' },
        },

        {
          path: '/notifications/:type',
          name: 'MySpecificNotificationList',
          component: () => import('@/views/private-pages/MySpecificNotificationList.vue'),
          meta: { requiresAuth: true, title: 'Notification List' },
        },
        {
          path: '/task-notifications/:type',
          name: 'MyTaskNotificationList',
          component: () => import('@/views/private-pages/MyTaskNotificationList.vue'),
          meta: { requiresAuth: true, title: 'Other Notification List' },
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
          meta: { requiresAuth: true, title: 'Notices' },
        },

        {
          path: '/general-notices',
          name: 'MyNoticeList',
          component: () => import('@/views/private-pages/NoticeList.vue'),
          meta: { requiresAuth: true, title: 'General Notices' },
        },
        {
          path: '/policy',
          name: 'PolicyList',
          component: () => import('@/views/private-pages/PolicyList.vue'),
          meta: { requiresAuth: true, title: 'Polices ' },
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
          path: '/applications',
          name: 'MyApplications',
          component: () => import('@/views/private-pages/MyApplications.vue'),
          meta: { requiresAuth: true, title: 'My Applications' },
        },

        {
          path: '/applications/leave-applications',
          name: 'MyLeaveApplications',
          component: () => import('@/views/private-pages/MyLeaveApplications.vue'),
          meta: { requiresAuth: true, title: 'Leave Applications' },
        },
        {
          path: '/applications/leave-application-add',
          name: 'LeaveApplicationAdd',
          component: () => import('@/views/private-pages/LeaveApplicationAdd.vue'),
          meta: { requiresAuth: true, title: 'Add Applications' },
        },
        {
          path: '/applications/leave-application-show/:id',
          name: 'MyLeaveApplicationShow',
          component: () => import('@/views/private-pages/LeaveApplicationShow.vue'),
          meta: { requiresAuth: true, title: 'Show Applications' },
        },
        {
          path: '/leave-application-show/:id',
          name: 'LeaveApplicationShow',
          component: () => import('@/views/private-pages/LeaveApplicationShow.vue'),
          meta: { requiresAuth: true, title: 'Show Applications' },
        },
        {
          path: '/leave-application-edit/:id',
          name: 'LeaveApplicationEdit',
          component: () => import('@/views/private-pages/LeaveApplicationEdit.vue'),
          meta: {
            requiresAuth: true,
            roles: ['super_admin', 'developer'],
            title: 'Edit Applications',
          },
        },
        {
          path: '/applications/short-leaves',
          name: 'MyShortLeaves',
          component: () => import('@/views/private-pages/MyShortLeaves.vue'),
          meta: { requiresAuth: true, title: 'Short Leave Applications' },
        },

        {
          path: '/applications/short-leaves-add',
          name: 'ShortLeaveAdd',
          component: () => import('@/views/private-pages/ShortLeaveAdd.vue'),
          meta: { requiresAuth: true, title: 'Add Short Leave' },
        },

        {
          path: '/short-leave-show/:id',
          name: 'ShortLeaveShow',
          component: () => import('@/views/private-pages/ShortLeaveShow.vue'),
          meta: { requiresAuth: true, title: 'Show Short Leave' },
        },

        {
          path: '/applications/offday-exchanges',
          name: 'MyOffdayExchangeList',
          component: () => import('@/views/private-pages/MyOffdayExchangeList.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: '/applications/offday-exchanges-add',
          name: 'OffdayExchangeAdd',
          component: () => import('@/views/private-pages/OffdayExchangeAdd.vue'),
          meta: { requiresAuth: true },
        },

        {
          path: '/applications/shift-exchanges',
          name: 'MyShiftExchangeList',
          component: () => import('@/views/private-pages/MyShiftExchangeList.vue'),
          meta: { requiresAuth: true, title: 'Shift Exchange List' },
        },

        {
          path: '/applications/shift-exchanges-add',
          name: 'ShiftExchangeAdd',
          component: () => import('@/views/private-pages/ShiftExchangeAdd.vue'),
          meta: { requiresAuth: true, title: 'Add Shift Exchange' },
        },

        {
          path: '/exchange-shift-show/:id',
          name: 'ExchangeShiftShow',
          component: () => import('@/views/private-pages/ExchangeShiftShow.vue'),
          meta: { requiresAuth: true, title: 'Show Shift Exchange' },
        },

        {
          path: '/exchange-offday-show/:id',
          name: 'ExchangeOffdayShow',
          component: () => import('@/views/private-pages/ExchangeOffdayShow.vue'),
          meta: { requiresAuth: true, title: 'Show Shift Exchange' },
        },

        {
          path: '/applications/manual-attendances',
          name: 'MyManualAttendanceList',
          component: () => import('@/views/private-pages/MyManualAttendanceList.vue'),
          meta: { requiresAuth: true, title: 'Manual Attendance List' },
        },

        {
          path: '/applications/manual-attendances-add',
          name: 'ManualAttendanceAdd',
          component: () => import('@/views/private-pages/ManualAttendanceAdd.vue'),
          meta: { requiresAuth: true, title: 'Add Manual Attendance' },
        },

        {
          path: '/manual-attendance-show/:id',
          name: 'ManualAttendanceShow',
          component: () => import('@/views/private-pages/ManualAttendanceShow.vue'),
          meta: { requiresAuth: true, title: 'Show Manual Attendance' },
        },

        {
          path: '/overtime-show/:id',
          name: 'OvertimeShow',
          component: () => import('@/views/private-pages/OvertimeShow.vue'),
          meta: { requiresAuth: true, title: 'Monthly Overtime Show' },
        },

        {
          path: '/applications/overtimes',
          name: 'MyOvertimeList',
          component: () => import('@/views/private-pages/MyOvertimeList.vue'),
          meta: { requiresAuth: true, title: 'Overtime List' },
        },

        {
          path: '/applications/overtimes-add',
          name: 'MyOvertimeAdd',
          component: () => import('@/views/private-pages/MyOvertimeAdd.vue'),
          meta: { requiresAuth: true, title: 'Add Overtime' },
        },

        {
          path: '/applications/overtimes/:id',
          name: 'MyOvertimeShow',
          component: () => import('@/views/private-pages/MyOvertimeShow.vue'),
          meta: { requiresAuth: true, title: 'Overtime Show' },
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

  // 1) Auth থাকলে public page বা '/' এ গেলে dashboard এ পাঠানো হবে
  const guestOnly = to.meta.guestOnly || ['/', '/login', '/register', '/about', '/privacy-policy'].includes(to.path)
  if (isAuthenticated && guestOnly) {
    return next({ name: 'Dashboard' })
  }

  if (to.matched.some((record) => record.meta.requiresAuth) && !isAuthenticated) {
    localStorage.setItem('next', to.fullPath)

    next({ name: 'login' })
  } else {
    next()
  }
})

router.afterEach((to) => {
  if (to.meta && to.meta.title) {
    document.title = `${to.meta.title} | Digi Attendance`
  } else {
    document.title = 'Digi Attendance'
  }
})

router.afterEach((to) => {
  const routeHistory = useRouteHistory()
  console.log({ to })
  routeHistory.addToHistory(to)
})


router.onError((error, to) => {
  console.log("__ERROR__",{error,to})

  if (
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Importing a module script failed')
  ) {
    console.log('need reload');
    if (to?.fullPath) {
      window.location = to.fullPath;

    }
  }
});

export default router
