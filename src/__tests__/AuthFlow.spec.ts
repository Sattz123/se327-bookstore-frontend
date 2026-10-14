import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { AuthService } from '@/services/AuthService'
import { createBookstoreRouter } from '@/router'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import AppHeader from '@/components/AppHeader.vue'
import type { AuthResponse, User } from '@/types/auth'

vi.mock('@/services/AuthService', () => ({
  AuthService: {
    login: vi.fn(),
    register: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
  },
}))

describe('Authentication Flow and Role Boundaries', () => {
  let pinia: ReturnType<typeof createPinia>
  let wrapper: VueWrapper | undefined

  const mockCustomerUser: User = {
    id: 10,
    username: 'Customer Jane',
    email: 'jane@example.com',
    phone: '0812345678',
    avatarUrl: null,
    role: 'CUSTOMER',
    createdAt: '2026-10-14T10:00:00Z',
  }

  const mockAdminUser: User = {
    id: 1,
    username: 'Admin Bob',
    email: 'admin@example.com',
    phone: null,
    avatarUrl: null,
    role: 'ADMIN',
    createdAt: '2026-10-14T09:00:00Z',
  }

  const mockCustomerAuthResponse: AuthResponse = {
    token: 'jwt.mock.customer.token',
    user: mockCustomerUser,
  }

  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    localStorage.clear()
  })

  describe('Pinia Auth Store', () => {
    it('initializes with unauthenticated guest state when storage is empty', () => {
      const auth = useAuthStore()
      expect(auth.isAuthenticated).toBe(false)
      expect(auth.isAdmin).toBe(false)
      expect(auth.currentUser).toBeNull()
      expect(auth.token).toBeNull()
    })

    it('stores token and user in state and localStorage on login', async () => {
      vi.mocked(AuthService.login).mockResolvedValueOnce(mockCustomerAuthResponse)

      const auth = useAuthStore()
      await auth.login({ email: 'jane@example.com', password: 'Password123!' })

      expect(auth.isAuthenticated).toBe(true)
      expect(auth.isAdmin).toBe(false)
      expect(auth.currentUser?.email).toBe('jane@example.com')
      expect(localStorage.getItem('auth_token')).toBe('jwt.mock.customer.token')
      expect(JSON.parse(localStorage.getItem('auth_user')!).username).toBe('Customer Jane')
    })

    it('identifies admin role correctly', async () => {
      vi.mocked(AuthService.login).mockResolvedValueOnce({
        token: 'jwt.mock.admin.token',
        user: mockAdminUser,
      })

      const auth = useAuthStore()
      await auth.login({ email: 'admin@example.com', password: 'AdminPassword123!' })

      expect(auth.isAuthenticated).toBe(true)
      expect(auth.isAdmin).toBe(true)
      expect(auth.currentUser?.role).toBe('ADMIN')
    })

    it('clears state and storage on logout', async () => {
      const auth = useAuthStore()
      auth.setAuth(mockCustomerAuthResponse)
      expect(auth.isAuthenticated).toBe(true)

      await auth.logout()

      expect(auth.isAuthenticated).toBe(false)
      expect(auth.token).toBeNull()
      expect(auth.currentUser).toBeNull()
      expect(localStorage.getItem('auth_token')).toBeNull()
      expect(localStorage.getItem('auth_user')).toBeNull()
      expect(AuthService.logout).toHaveBeenCalled()
    })

    it('restores session via fetchCurrentUser when token exists', async () => {
      localStorage.setItem('auth_token', 'valid-token')
      vi.mocked(AuthService.getCurrentUser).mockResolvedValueOnce(mockCustomerUser)

      const auth = useAuthStore()
      const fetched = await auth.fetchCurrentUser()

      expect(fetched?.email).toBe('jane@example.com')
      expect(auth.isAuthenticated).toBe(true)
    })

    it('clears auth on fetchCurrentUser failure (e.g. expired token)', async () => {
      localStorage.setItem('auth_token', 'expired-token')
      vi.mocked(AuthService.getCurrentUser).mockRejectedValueOnce(new Error('401 Unauthorized'))

      const auth = useAuthStore()
      const fetched = await auth.fetchCurrentUser()

      expect(fetched).toBeNull()
      expect(auth.isAuthenticated).toBe(false)
      expect(localStorage.getItem('auth_token')).toBeNull()
    })
  })

  describe('Login View', () => {
    it('validates empty inputs before submitting', async () => {
      const router = createBookstoreRouter(createMemoryHistory())
      wrapper = mount(LoginView, {
        global: { plugins: [pinia, router] },
      })

      await wrapper.find('form').trigger('submit.prevent')
      await flushPromises()

      expect(wrapper.text()).toContain('Please provide both email and password.')
      expect(AuthService.login).not.toHaveBeenCalled()
    })

    it('displays server error message when credentials are wrong', async () => {
      vi.mocked(AuthService.login).mockRejectedValueOnce({
        response: { data: { detail: 'Invalid email or password.' } },
      })

      const router = createBookstoreRouter(createMemoryHistory())
      wrapper = mount(LoginView, {
        global: { plugins: [pinia, router] },
      })

      await wrapper.find('#email').setValue('jane@example.com')
      await wrapper.find('#password').setValue('WrongPass')
      await wrapper.find('form').trigger('submit.prevent')
      await flushPromises()

      expect(wrapper.text()).toContain('Invalid email or password.')
    })

    it('logs in and redirects on success', async () => {
      vi.mocked(AuthService.login).mockResolvedValueOnce(mockCustomerAuthResponse)

      const router = createBookstoreRouter(createMemoryHistory())
      const pushSpy = vi.spyOn(router, 'push')

      wrapper = mount(LoginView, {
        global: { plugins: [pinia, router] },
      })

      await wrapper.find('#email').setValue('jane@example.com')
      await wrapper.find('#password').setValue('CorrectPass123!')
      await wrapper.find('form').trigger('submit.prevent')
      await flushPromises()

      expect(pushSpy).toHaveBeenCalledWith('/')
    })
  })

  describe('Register View', () => {
    it('validates password mismatch client-side', async () => {
      const router = createBookstoreRouter(createMemoryHistory())
      wrapper = mount(RegisterView, {
        global: { plugins: [pinia, router] },
      })

      await wrapper.find('#username').setValue('New User')
      await wrapper.find('#email').setValue('new@example.com')
      await wrapper.find('#password').setValue('Password123!')
      await wrapper.find('#confirmPassword').setValue('MismatchPass!')
      await wrapper.find('form').trigger('submit.prevent')
      await flushPromises()

      expect(wrapper.text()).toContain('Passwords do not match.')
      expect(AuthService.register).not.toHaveBeenCalled()
    })

    it('validates minimum password length', async () => {
      const router = createBookstoreRouter(createMemoryHistory())
      wrapper = mount(RegisterView, {
        global: { plugins: [pinia, router] },
      })

      await wrapper.find('#username').setValue('New User')
      await wrapper.find('#email').setValue('new@example.com')
      await wrapper.find('#password').setValue('123')
      await wrapper.find('#confirmPassword').setValue('123')
      await wrapper.find('form').trigger('submit.prevent')
      await flushPromises()

      expect(wrapper.text()).toContain('Password must be at least 6 characters long.')
      expect(AuthService.register).not.toHaveBeenCalled()
    })

    it('displays error when email is already registered (409 Conflict)', async () => {
      vi.mocked(AuthService.register).mockRejectedValueOnce({
        response: {
          data: {
            status: 409,
            title: 'Email Already Registered',
            detail: 'An account with this email already exists.',
          },
        },
      })

      const router = createBookstoreRouter(createMemoryHistory())
      wrapper = mount(RegisterView, {
        global: { plugins: [pinia, router] },
      })

      await wrapper.find('#username').setValue('Existing User')
      await wrapper.find('#email').setValue('existing@example.com')
      await wrapper.find('#password').setValue('ValidPassword123!')
      await wrapper.find('#confirmPassword').setValue('ValidPassword123!')
      await wrapper.find('form').trigger('submit.prevent')
      await flushPromises()

      expect(wrapper.text()).toContain('An account with this email already exists.')
    })
  })

  describe('AppHeader with Authentication', () => {
    it('shows Sign in and Register links for unauthenticated guest', () => {
      const router = createBookstoreRouter(createMemoryHistory())
      wrapper = mount(AppHeader, {
        global: { plugins: [pinia, router] },
      })

      expect(wrapper.text()).toContain('Sign in')
      expect(wrapper.text()).toContain('Register')
      expect(wrapper.text()).not.toContain('Sign out')
    })

    it('shows user name and Sign out button when authenticated as Customer', () => {
      const auth = useAuthStore()
      auth.setAuth(mockCustomerAuthResponse)

      const router = createBookstoreRouter(createMemoryHistory())
      wrapper = mount(AppHeader, {
        global: { plugins: [pinia, router] },
      })

      expect(wrapper.text()).toContain('Hi, Customer Jane')
      expect(wrapper.text()).toContain('Sign out')
      expect(wrapper.text()).not.toContain('Admin')
      expect(wrapper.text()).not.toContain('Sign in')
    })

    it('shows Admin badge when authenticated as Admin', () => {
      const auth = useAuthStore()
      auth.setAuth({ token: 'admin-token', user: mockAdminUser })

      const router = createBookstoreRouter(createMemoryHistory())
      wrapper = mount(AppHeader, {
        global: { plugins: [pinia, router] },
      })

      expect(wrapper.text()).toContain('Hi, Admin Bob')
      expect(wrapper.text()).toContain('Admin')
      expect(wrapper.text()).toContain('Sign out')
    })

    it('logs out and redirects when Sign out button is clicked', async () => {
      const auth = useAuthStore()
      auth.setAuth(mockCustomerAuthResponse)

      const router = createBookstoreRouter(createMemoryHistory())
      const pushSpy = vi.spyOn(router, 'push')

      wrapper = mount(AppHeader, {
        global: { plugins: [pinia, router] },
      })

      const signOutBtn = wrapper.find('button')
      expect(signOutBtn.text()).toBe('Sign out')

      await signOutBtn.trigger('click')
      await flushPromises()

      expect(auth.isAuthenticated).toBe(false)
      expect(pushSpy).toHaveBeenCalledWith({ name: 'home' })
    })
  })

  describe('Navigation Guards', () => {
    it('redirects authenticated users away from guest-only pages', async () => {
      localStorage.setItem('auth_token', 'valid-token')
      localStorage.setItem('auth_user', JSON.stringify(mockCustomerUser))

      const router = createBookstoreRouter(createMemoryHistory())
      await router.push('/login')
      await router.isReady()

      expect(router.currentRoute.value.name).toBe('home')
    })

    it('allows guests to access guest-only login page', async () => {
      const router = createBookstoreRouter(createMemoryHistory())
      await router.push('/login')
      await router.isReady()

      expect(router.currentRoute.value.name).toBe('login')
    })
  })
})
