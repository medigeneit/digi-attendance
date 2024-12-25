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
          component: HomeView
        },

        {
          path: '/about',
          name: 'About',
          component: () => import('@/views/public-pages/AboutView.vue')
        },

        {
          path: '/login',
          name: 'login',
          component: () => import('../views/public-pages/LoginView.vue')
        },
        {
          path: '/register',
          name: 'register',
          component: () => import('@/views/public-pages/RegisterView.vue')
        },

        {
          path: '/profile',
          name: 'ProfileView',
          component: () => import('../views/public-pages/ProfileView.vue'),
        },
      ]
    },
    {
      path: '/',
      component: AppLayout,
      children: [
        {
          path: '/dashboard',
          name: 'Dashboard',
          component: () => import('@/views/private-pages/DashBoard.vue'),
          meta: { requiresAuth: true }
        },

        {
          path: '/attendance',
          name: 'AttendanceView',
          component: () => import('@/views/private-pages/AttendanceView.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] }
        },
        {
          path: '/settings',
          name: 'SettingsView',
          component: () => import('@/views/admin-pages/SettingsView.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] }
        },
        {
          path: '/settings/user-list',
          name: 'UserList',
          component: () => import('@/views/admin-pages/UserList.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] }
        },
        {
          path: '/settings/device-list',
          name: 'DeviceList',
          component: () => import('@/views/admin-pages/DeviceList.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] }
        },
        {
          path: '/settings/company-list',
          name: 'CompanyList',
          component: () => import('@/views/admin-pages/CompanyList.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] }
        },
        {
          path: '/settings/department-list',
          name: 'DepartmentList',
          component: () => import('@/views/admin-pages/DepartmentList.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] }
        },
        {
          path: '/settings/designation-list',
          name: 'DesignationList',
          component: () => import('@/views/admin-pages/DesignationList.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] }
        },
        {
          path: '/settings/shift-list',
          name: 'ShiftList',
          component: () => import('@/views/admin-pages/ShiftList.vue'),
          meta: { requiresAuth: true, roles: ['admin', 'super_admin', 'developer'] }
        },

      ]
    }
  ],
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach((to, from, next) => {
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
