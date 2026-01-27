export const disciplineReportRoutes = [
  {
    path: '/discipline-report',
    name: 'DisciplineReport',
    component: () => import('@/views/admin-pages/DisciplineReportPage.vue'),
    meta: {
      requiresAuth: true,
      roles: ['admin', 'super_admin', 'developer', 'hr'],
      title: 'Discipline Report',
    },
  },
  {
    path: '/discipline-report/attachments',
    name: 'DisciplineAttachments',
    component: () => import('@/views/admin-pages/AttachmentsPage.vue'),
    meta: {
      requiresAuth: true,
      roles: ['admin', 'super_admin', 'developer', 'hr'],
      title: 'Discipline Attachments',
    },
  },
]
