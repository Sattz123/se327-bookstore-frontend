import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { getActivePinia } from 'pinia'
import { isAxiosError } from 'axios'
import { AdminService } from '@/services/AdminService'
import { useAuthStore } from '@/stores/auth'

export function createBookstoreRouter(
  history: RouterHistory = createWebHistory(import.meta.env.BASE_URL),
) {
  const router = createRouter({
    history,
    routes: [
      {
        path: '/admin/login',
        name: 'admin-login',
        component: () => import('@/views/LoginView.vue'),
        props: { administrator: true },
        meta: { title: 'Administrator sign in', adminArea: true },
      },
      {
        path: '/admin',
        component: () => import('@/layouts/AdminLayout.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, adminArea: true },
        children: [
          {
            path: '',
            name: 'admin-home',
            component: () => import('@/views/AdminOverviewView.vue'),
            meta: { title: 'Administrator overview' },
          },
          {
            path: 'products',
            name: 'admin-products',
            component: () => import('@/views/AdminProductsView.vue'),
            meta: { title: 'Products and inventory' },
          },
          {
            path: 'categories',
            name: 'admin-categories',
            component: () => import('@/views/AdminCategoriesView.vue'),
            meta: { title: 'Manage categories' },
          },
          {
            path: 'customers',
            name: 'admin-customers',
            component: () => import('@/views/AdminCustomersView.vue'),
            meta: { title: 'Customers' },
          },
          {
            path: 'orders',
            name: 'admin-orders',
            component: () => import('@/views/AdminOrdersView.vue'),
            meta: { title: 'Manage orders' },
          },
          {
            path: 'orders/:id',
            name: 'admin-order-detail',
            component: () => import('@/views/AdminOrdersView.vue'),
            meta: { title: 'Order management' },
          },
          { path: ':pathMatch(.*)*', redirect: { name: 'admin-home' } },
        ],
      },
      {
        path: '/forbidden',
        name: 'forbidden',
        component: () => import('@/views/ForbiddenView.vue'),
        meta: { title: 'Access denied' },
      },
      {
        path: '/',
        name: 'home',
        component: HomeView,
        meta: { title: 'Home' },
      },
      {
        path: '/products',
        name: 'products',
        component: () => import('@/views/ProductListView.vue'),
        meta: { title: 'Books' },
      },
      {
        path: '/products/:id',
        name: 'product-detail',
        component: () => import('@/views/ProductDetailView.vue'),
        meta: { title: 'Book details' },
      },
      {
        path: '/categories',
        name: 'categories',
        component: () => import('@/views/CategoryListView.vue'),
        meta: { title: 'Categories' },
      },
      {
        path: '/categories/:id',
        name: 'category-products',
        component: () => import('@/views/ProductListView.vue'),
        meta: { title: 'Category books' },
      },
      {
        path: '/contact',
        name: 'contact',
        component: () => import('@/views/ComingSoonView.vue'),
        props: { title: 'Contact', description: 'Get in touch with InwZa Bookstore.' },
        meta: { title: 'Contact' },
      },
      {
        path: '/login',
        name: 'login',
        component: () => import('@/views/LoginView.vue'),
        meta: { title: 'Sign In', guestOnly: true },
      },
      {
        path: '/register',
        name: 'register',
        component: () => import('@/views/RegisterView.vue'),
        meta: { title: 'Register', guestOnly: true },
      },
      {
        path: '/forgot-password',
        name: 'forgot-password',
        component: () => import('@/views/ForgotPasswordView.vue'),
        meta: { title: 'Forgot Password', guestOnly: true },
      },
      {
        path: '/reset-password',
        name: 'reset-password',
        component: () => import('@/views/ResetPasswordView.vue'),
        meta: { title: 'Reset Password', guestOnly: true },
      },
      {
        path: '/profile',
        name: 'profile',
        component: () => import('@/views/ProfileView.vue'),
        meta: { title: 'My Profile', requiresAuth: true },
      },
      {
        path: '/wishlist',
        name: 'wishlist',
        component: () => import('@/views/WishlistView.vue'),
        meta: { title: 'My Wishlist', requiresAuth: true },
      },
      {
        path: '/addresses',
        name: 'addresses',
        component: () => import('@/views/AddressBookView.vue'),
        meta: { title: 'Address book', requiresAuth: true },
      },
      {
        path: '/orders',
        name: 'orders',
        component: () => import('@/views/OrderHistoryView.vue'),
        meta: { title: 'Order history', requiresAuth: true },
      },
      {
        path: '/orders/:id',
        name: 'order-detail',
        component: () => import('@/views/OrderConfirmationView.vue'),
        meta: { title: 'Order details', requiresAuth: true },
      },
      {
        path: '/checkout',
        name: 'checkout',
        component: () => import('@/views/CheckoutView.vue'),
        meta: { title: 'Checkout', requiresAuth: true },
      },
      {
        path: '/checkout/confirmation/:id',
        name: 'order-confirmation',
        component: () => import('@/views/OrderConfirmationView.vue'),
        meta: { title: 'Order confirmation', requiresAuth: true },
      },
      {
        path: '/cart',
        name: 'cart',
        component: () => import('@/views/CartView.vue'),
        meta: { title: 'Shopping cart', requiresAuth: true },
      },
      {
        path: '/payment-methods',
        name: 'payment-methods',
        component: () => import('@/views/PaymentMethodsView.vue'),
        meta: { title: 'Payment methods', requiresAuth: true },
      },
      {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/views/NotFoundView.vue'),
        meta: { title: 'Page not found' },
      },
    ],
    scrollBehavior(_to, _from, savedPosition) {
      return savedPosition ?? { top: 0 }
    },
  })

  router.beforeEach(async (to) => {
    const token = localStorage.getItem('auth_token')
    const userStr = localStorage.getItem('auth_user')
    const isAuthenticated = !!token && !!userStr
    let role: string | null = null
    if (userStr) {
      try {
        role = JSON.parse(userStr).role
      } catch {
        role = null
      }
    }

    if (
      to.name === 'admin-login' &&
      isAuthenticated &&
      role === 'ADMIN' &&
      to.query.reason !== 'unavailable'
    )
      return { name: 'admin-home' }

    if (to.meta.requiresAdmin) {
      if (!isAuthenticated || !token)
        return { name: 'admin-login', query: { redirect: to.fullPath } }
      try {
        const user = await AdminService.getSession()
        if (localStorage.getItem('auth_token') !== token) return false
        if (user.role !== 'ADMIN') return { name: 'forbidden' }
        if (getActivePinia()) useAuthStore().setAuth({ token, user })
        else localStorage.setItem('auth_user', JSON.stringify(user))
      } catch (cause) {
        if (localStorage.getItem('auth_token') !== token) return false
        if (isAxiosError(cause) && cause.response?.status === 403) return { name: 'forbidden' }
        if (isAxiosError(cause) && cause.response?.status === 401) {
          if (getActivePinia()) useAuthStore().clearAuth()
          else {
            localStorage.removeItem('auth_token')
            localStorage.removeItem('auth_user')
          }
          return { name: 'admin-login', query: { redirect: to.fullPath } }
        }
        return { name: 'admin-login', query: { redirect: to.fullPath, reason: 'unavailable' } }
      }
    }

    if (to.meta.guestOnly && isAuthenticated) {
      return { name: 'home' }
    }

    if (to.meta.requiresAuth && !isAuthenticated) {
      return {
        name: 'login',
        query: { redirect: to.fullPath },
      }
    }
  })

  router.afterEach((to) => {
    document.title = `${to.meta.title ?? 'Home'} | InwZa Bookstore`
  })

  return router
}

export default createBookstoreRouter()
