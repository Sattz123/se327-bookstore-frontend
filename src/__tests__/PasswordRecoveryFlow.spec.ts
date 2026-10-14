import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { AuthService } from '@/services/AuthService'
import { createBookstoreRouter } from '@/router'
import ForgotPasswordView from '@/views/ForgotPasswordView.vue'
import ResetPasswordView from '@/views/ResetPasswordView.vue'
import LoginView from '@/views/LoginView.vue'
import App from '@/App.vue'
import type { AuthResponse, User } from '@/types/auth'

vi.mock('@/services/AuthService', () => ({
  AuthService: {
    login: vi.fn(),
    register: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
    forgotPassword: vi.fn(),
    verifyResetToken: vi.fn(),
    resetPassword: vi.fn(),
  },
}))

vi.mock('@/services/ProductService', () => ({
  default: {
    getProducts: vi.fn().mockResolvedValue({
      data: { content: [], page: 1, size: 15, totalElements: 0, totalPages: 0 },
    }),
    getFeaturedProducts: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

vi.mock('@/services/CategoryService', () => ({
  default: { getCategories: vi.fn().mockResolvedValue({ data: [] }) },
}))

describe('Password Recovery Flow & Boundary Tests', () => {
  let pinia: ReturnType<typeof createPinia>
  let wrapper: VueWrapper | undefined

  const mockUser: User = {
    id: 1,
    username: 'Test User',
    email: 'user@example.com',
    phone: null,
    avatarUrl: null,
    role: 'CUSTOMER',
    createdAt: '2026-01-01T00:00:00Z',
  }

  const mockAuthResponse: AuthResponse = {
    token: 'jwt.token.here',
    user: mockUser,
  }

  beforeEach(() => {
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  describe('Route and Navigation Boundaries', () => {
    it('redirects authenticated users away from /forgot-password to home', async () => {
      const auth = useAuthStore()
      auth.setAuth(mockAuthResponse)

      const router = createBookstoreRouter(createMemoryHistory())
      await router.push('/forgot-password')
      await router.isReady()

      wrapper = mount(App, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/')
    })

    it('redirects authenticated users away from /reset-password to home', async () => {
      const auth = useAuthStore()
      auth.setAuth(mockAuthResponse)

      const router = createBookstoreRouter(createMemoryHistory())
      await router.push('/reset-password?token=sample-token')
      await router.isReady()

      wrapper = mount(App, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/')
    })

    it('allows guests to open /forgot-password from the login view link', async () => {
      const router = createBookstoreRouter(createMemoryHistory())
      await router.push('/login')
      await router.isReady()

      wrapper = mount(LoginView, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      const forgotLink = wrapper.find('a[href="/forgot-password"]')
      expect(forgotLink.exists()).toBe(true)
      expect(forgotLink.text()).toContain('Forgot password?')
    })
  })

  describe('Forgot Password Form Behavior', () => {
    let router: ReturnType<typeof createBookstoreRouter>

    beforeEach(async () => {
      router = createBookstoreRouter(createMemoryHistory())
      await router.push('/forgot-password')
      await router.isReady()
    })

    it('rejects submission when email field is blank', async () => {
      wrapper = mount(ForgotPasswordView, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      await wrapper.get('#forgot-password-form').trigger('submit.prevent')
      await flushPromises()

      expect(AuthService.forgotPassword).not.toHaveBeenCalled()
      expect(wrapper.get('[role="alert"]').text()).toContain('Please enter your email address.')
    })

    it('submits valid email and renders generic success message', async () => {
      vi.mocked(AuthService.forgotPassword).mockResolvedValue({
        message:
          'If an account with that email exists, password reset instructions have been sent.',
      })

      wrapper = mount(ForgotPasswordView, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      await wrapper.get('#forgot-email').setValue('customer@example.com')
      await wrapper.get('#forgot-password-form').trigger('submit.prevent')
      await flushPromises()

      expect(AuthService.forgotPassword).toHaveBeenCalledWith({
        email: 'customer@example.com',
      })
      expect(wrapper.get('[role="status"]').text()).toContain(
        'If an account with that email exists',
      )
    })

    it('displays error alert when forgotPassword request fails', async () => {
      vi.mocked(AuthService.forgotPassword).mockRejectedValue({
        response: {
          data: {
            title: 'Bad Request',
            status: 400,
            detail: 'Unable to process request.',
          },
        },
      })

      wrapper = mount(ForgotPasswordView, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      await wrapper.get('#forgot-email').setValue('bad@example.com')
      await wrapper.get('#forgot-password-form').trigger('submit.prevent')
      await flushPromises()

      expect(wrapper.get('[role="alert"]').text()).toContain('Unable to process request.')
    })
  })

  describe('Reset Password Form Behavior & Token Boundaries', () => {
    it('shows invalid link state when no token query parameter is present', async () => {
      const router = createBookstoreRouter(createMemoryHistory())
      await router.push('/reset-password')
      await router.isReady()

      wrapper = mount(ResetPasswordView, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      expect(AuthService.verifyResetToken).not.toHaveBeenCalled()
      expect(wrapper.get('[role="alert"]').text()).toContain('No password reset token was provided')
      expect(wrapper.find('a[href="/forgot-password"]').exists()).toBe(true)
    })

    it('shows invalid/expired link feedback when token is expired', async () => {
      vi.mocked(AuthService.verifyResetToken).mockResolvedValue({
        valid: false,
        message: 'Password reset token has expired.',
      })

      const router = createBookstoreRouter(createMemoryHistory())
      await router.push('/reset-password?token=expired-tok-123')
      await router.isReady()

      wrapper = mount(ResetPasswordView, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      expect(AuthService.verifyResetToken).toHaveBeenCalledWith('expired-tok-123')
      expect(wrapper.get('[role="alert"]').text()).toContain('Password reset token has expired.')
      expect(wrapper.find('#reset-password-form').exists()).toBe(false)
      expect(wrapper.find('a[href="/forgot-password"]').exists()).toBe(true)
    })

    it('shows invalid/expired link feedback when token is already used', async () => {
      vi.mocked(AuthService.verifyResetToken).mockResolvedValue({
        valid: false,
        message: 'Password reset token has already been used.',
      })

      const router = createBookstoreRouter(createMemoryHistory())
      await router.push('/reset-password?token=reused-tok-456')
      await router.isReady()

      wrapper = mount(ResetPasswordView, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      expect(AuthService.verifyResetToken).toHaveBeenCalledWith('reused-tok-456')
      expect(wrapper.get('[role="alert"]').text()).toContain(
        'Password reset token has already been used.',
      )
      expect(wrapper.find('#reset-password-form').exists()).toBe(false)
    })

    it('renders reset password form when token is valid', async () => {
      vi.mocked(AuthService.verifyResetToken).mockResolvedValue({
        valid: true,
        message: 'Token is valid.',
      })

      const router = createBookstoreRouter(createMemoryHistory())
      await router.push('/reset-password?token=valid-tok-789')
      await router.isReady()

      wrapper = mount(ResetPasswordView, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      expect(AuthService.verifyResetToken).toHaveBeenCalledWith('valid-tok-789')
      expect(wrapper.find('#reset-password-form').exists()).toBe(true)
      expect(wrapper.find('#new-password').exists()).toBe(true)
      expect(wrapper.find('#confirm-password').exists()).toBe(true)
    })

    it('rejects password submission when new password is fewer than 6 characters', async () => {
      vi.mocked(AuthService.verifyResetToken).mockResolvedValue({
        valid: true,
        message: 'Token is valid.',
      })

      const router = createBookstoreRouter(createMemoryHistory())
      await router.push('/reset-password?token=valid-tok-789')
      await router.isReady()

      wrapper = mount(ResetPasswordView, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      await wrapper.get('#new-password').setValue('12345')
      await wrapper.get('#confirm-password').setValue('12345')
      await wrapper.get('#reset-password-form').trigger('submit.prevent')
      await flushPromises()

      expect(AuthService.resetPassword).not.toHaveBeenCalled()
      expect(wrapper.get('[role="alert"]').text()).toContain(
        'Password must be at least 6 characters long.',
      )
    })

    it('rejects password submission when passwords do not match', async () => {
      vi.mocked(AuthService.verifyResetToken).mockResolvedValue({
        valid: true,
        message: 'Token is valid.',
      })

      const router = createBookstoreRouter(createMemoryHistory())
      await router.push('/reset-password?token=valid-tok-789')
      await router.isReady()

      wrapper = mount(ResetPasswordView, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      await wrapper.get('#new-password').setValue('NewPass123!')
      await wrapper.get('#confirm-password').setValue('DifferentPass123!')
      await wrapper.get('#reset-password-form').trigger('submit.prevent')
      await flushPromises()

      expect(AuthService.resetPassword).not.toHaveBeenCalled()
      expect(wrapper.get('[role="alert"]').text()).toContain('Passwords do not match.')
    })

    it('resets password successfully and renders success feedback with login link', async () => {
      vi.mocked(AuthService.verifyResetToken).mockResolvedValue({
        valid: true,
        message: 'Token is valid.',
      })
      vi.mocked(AuthService.resetPassword).mockResolvedValue({
        message: 'Password has been reset successfully.',
      })

      const router = createBookstoreRouter(createMemoryHistory())
      await router.push('/reset-password?token=valid-tok-789')
      await router.isReady()

      wrapper = mount(ResetPasswordView, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      await wrapper.get('#new-password').setValue('ValidPassword123!')
      await wrapper.get('#confirm-password').setValue('ValidPassword123!')
      await wrapper.get('#reset-password-form').trigger('submit.prevent')
      await flushPromises()

      expect(AuthService.resetPassword).toHaveBeenCalledWith({
        token: 'valid-tok-789',
        newPassword: 'ValidPassword123!',
      })

      expect(wrapper.get('[role="status"]').text()).toContain('Password Reset Complete')
      expect(wrapper.find('a[href="/login"]').exists()).toBe(true)
    })

    it('handles server rejection on submit when token expired in between', async () => {
      vi.mocked(AuthService.verifyResetToken).mockResolvedValue({
        valid: true,
        message: 'Token is valid.',
      })
      vi.mocked(AuthService.resetPassword).mockRejectedValue({
        response: {
          data: {
            title: 'Invalid Password Reset Token',
            status: 400,
            detail: 'Password reset token has expired.',
          },
        },
      })

      const router = createBookstoreRouter(createMemoryHistory())
      await router.push('/reset-password?token=late-tok-999')
      await router.isReady()

      wrapper = mount(ResetPasswordView, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      await wrapper.get('#new-password').setValue('ValidPassword123!')
      await wrapper.get('#confirm-password').setValue('ValidPassword123!')
      await wrapper.get('#reset-password-form').trigger('submit.prevent')
      await flushPromises()

      expect(wrapper.get('[role="alert"]').text()).toContain('Password reset token has expired.')
      expect(wrapper.find('a[href="/forgot-password"]').exists()).toBe(true)
    })
  })
})
