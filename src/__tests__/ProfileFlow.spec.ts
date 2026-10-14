import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ProfileService } from '@/services/ProfileService'
import { createBookstoreRouter } from '@/router'
import ProfileView from '@/views/ProfileView.vue'
import App from '@/App.vue'
import type { AuthResponse, User } from '@/types/auth'

vi.mock('@/services/ProfileService', () => ({
  ProfileService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
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

describe('Profile Flow and Boundary Tests', () => {
  let pinia: ReturnType<typeof createPinia>
  let wrapper: VueWrapper | undefined

  const mockUser: User = {
    id: 5,
    username: 'Alice Smith',
    email: 'alice@example.com',
    phone: '0812345678',
    avatarUrl: 'https://example.com/alice.jpg',
    role: 'CUSTOMER',
    createdAt: '2026-01-15T08:00:00Z',
  }

  const mockAuthResponse: AuthResponse = {
    token: 'mock.jwt.token.alice',
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

  describe('Route Navigation Boundaries', () => {
    it('redirects unauthenticated users from /profile to /login?redirect=%2Fprofile', async () => {
      const router = createBookstoreRouter(createMemoryHistory())
      await router.push('/profile')
      await router.isReady()

      wrapper = mount(App, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/login')
      expect(router.currentRoute.value.query.redirect).toBe('/profile')
    })

    it('allows authenticated users to navigate to /profile', async () => {
      const auth = useAuthStore()
      auth.setAuth(mockAuthResponse)

      vi.mocked(ProfileService.getProfile).mockResolvedValue(mockUser)

      const router = createBookstoreRouter(createMemoryHistory())
      await router.push('/profile')
      await router.isReady()

      wrapper = mount(App, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/profile')
      expect(wrapper.text()).toContain('My Account')
      expect(wrapper.text()).toContain('Alice Smith')
    })
  })

  describe('Profile Information Display & Updates', () => {
    beforeEach(() => {
      const auth = useAuthStore()
      auth.setAuth(mockAuthResponse)
    })

    it('loads and populates user profile data on mount', async () => {
      vi.mocked(ProfileService.getProfile).mockResolvedValue(mockUser)

      wrapper = mount(ProfileView, {
        global: { plugins: [pinia] },
      })
      await flushPromises()

      const nameInput = wrapper.find<HTMLInputElement>('#profile-name')
      const emailInput = wrapper.find<HTMLInputElement>('#profile-email')
      const phoneInput = wrapper.find<HTMLInputElement>('#profile-phone')
      const avatarInput = wrapper.find<HTMLInputElement>('#profile-avatar')

      expect(nameInput.element.value).toBe('Alice Smith')
      expect(emailInput.element.value).toBe('alice@example.com')
      expect(phoneInput.element.value).toBe('0812345678')
      expect(avatarInput.element.value).toBe('https://example.com/alice.jpg')
      expect(wrapper.text()).toContain('Alice Smith')
      expect(wrapper.text()).toContain('alice@example.com')
      expect(wrapper.text()).toContain('Customer')
    })

    it('shows a failed profile read and allows retry without exposing a stale form', async () => {
      vi.mocked(ProfileService.getProfile)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue(mockUser)
      const router = createBookstoreRouter(createMemoryHistory())

      wrapper = mount(ProfileView, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      expect(wrapper.get('[role="alert"]').text()).toContain('Unable to load your profile')
      expect(wrapper.find('#profile-name').exists()).toBe(false)
      await wrapper.get('button').trigger('click')
      await flushPromises()
      expect(wrapper.get<HTMLInputElement>('#profile-name').element.value).toBe('Alice Smith')
    })

    it('prevents update submission when username or email is blank', async () => {
      vi.mocked(ProfileService.getProfile).mockResolvedValue(mockUser)

      wrapper = mount(ProfileView, {
        global: { plugins: [pinia] },
      })
      await flushPromises()

      const nameInput = wrapper.find('#profile-name')
      await nameInput.setValue('   ')

      await wrapper.get('#profile-form').trigger('submit.prevent')
      await flushPromises()

      expect(ProfileService.updateProfile).not.toHaveBeenCalled()
      expect(wrapper.find('[role="alert"]').text()).toContain('Name and email are required.')
    })

    it('successfully updates profile and displays confirmation message', async () => {
      vi.mocked(ProfileService.getProfile).mockResolvedValue(mockUser)

      const updatedUser: User = {
        ...mockUser,
        username: 'Alice Wonderland',
        phone: '0899998888',
      }
      const updatedResponse: AuthResponse = {
        token: 'new.mock.token.alice',
        user: updatedUser,
      }
      vi.mocked(ProfileService.updateProfile).mockResolvedValue(updatedResponse)

      wrapper = mount(ProfileView, {
        global: { plugins: [pinia] },
      })
      await flushPromises()

      await wrapper.find('#profile-name').setValue('Alice Wonderland')
      await wrapper.find('#profile-phone').setValue('0899998888')

      await wrapper.get('#profile-form').trigger('submit.prevent')
      await flushPromises()

      expect(ProfileService.updateProfile).toHaveBeenCalledWith({
        username: 'Alice Wonderland',
        email: 'alice@example.com',
        phone: '0899998888',
        avatarUrl: 'https://example.com/alice.jpg',
      })

      const auth = useAuthStore()
      expect(auth.currentUser?.username).toBe('Alice Wonderland')
      expect(auth.token).toBe('new.mock.token.alice')
      expect(wrapper.find('[role="status"]').text()).toContain('Profile updated successfully!')
    })

    it('displays error alert when updateProfile returns duplicate email 409 conflict', async () => {
      vi.mocked(ProfileService.getProfile).mockResolvedValue(mockUser)
      vi.mocked(ProfileService.updateProfile).mockRejectedValue({
        response: {
          data: {
            title: 'Email Already Registered',
            status: 409,
            detail: 'A user with email taken@example.com already exists.',
          },
        },
      })

      wrapper = mount(ProfileView, {
        global: { plugins: [pinia] },
      })
      await flushPromises()

      await wrapper.find('#profile-email').setValue('taken@example.com')

      await wrapper.get('#profile-form').trigger('submit.prevent')
      await flushPromises()

      expect(wrapper.find('[role="alert"]').text()).toContain('already exists')
    })
  })

  describe('Password Changes & Boundaries', () => {
    beforeEach(async () => {
      const auth = useAuthStore()
      auth.setAuth(mockAuthResponse)
      vi.mocked(ProfileService.getProfile).mockResolvedValue(mockUser)

      wrapper = mount(ProfileView, {
        global: { plugins: [pinia] },
      })
      await flushPromises()
    })

    it('rejects submission when current or new password is empty', async () => {
      await wrapper!.get('#password-form').trigger('submit.prevent')
      await flushPromises()

      expect(ProfileService.changePassword).not.toHaveBeenCalled()
      expect(wrapper!.text()).toContain('Please provide both current and new password.')
    })

    it('rejects submission when new password is fewer than 6 characters', async () => {
      await wrapper!.find('#current-password').setValue('OldPassword123!')
      await wrapper!.find('#new-password').setValue('12345')
      await wrapper!.find('#confirm-new-password').setValue('12345')

      await wrapper!.get('#password-form').trigger('submit.prevent')
      await flushPromises()

      expect(ProfileService.changePassword).not.toHaveBeenCalled()
      expect(wrapper!.text()).toContain('New password must be at least 6 characters long.')
    })

    it('rejects submission when new password and confirm password do not match', async () => {
      await wrapper!.find('#current-password').setValue('OldPassword123!')
      await wrapper!.find('#new-password').setValue('NewPassword123!')
      await wrapper!.find('#confirm-new-password').setValue('MismatchPassword123!')

      await wrapper!.get('#password-form').trigger('submit.prevent')
      await flushPromises()

      expect(ProfileService.changePassword).not.toHaveBeenCalled()
      expect(wrapper!.text()).toContain('New passwords do not match.')
    })

    it('displays error alert when current password is wrong (400 Bad Request)', async () => {
      vi.mocked(ProfileService.changePassword).mockRejectedValue({
        response: {
          data: {
            title: 'Bad Request',
            status: 400,
            detail: 'Incorrect current password.',
          },
        },
      })

      await wrapper!.find('#current-password').setValue('WrongCurrentPass1!')
      await wrapper!.find('#new-password').setValue('NewValidPass123!')
      await wrapper!.find('#confirm-new-password').setValue('NewValidPass123!')

      await wrapper!.get('#password-form').trigger('submit.prevent')
      await flushPromises()

      expect(ProfileService.changePassword).toHaveBeenCalledWith({
        currentPassword: 'WrongCurrentPass1!',
        newPassword: 'NewValidPass123!',
      })
      expect(wrapper!.text()).toContain('Incorrect current password.')
    })

    it('displays error alert when new password is same as current password (400 Bad Request)', async () => {
      vi.mocked(ProfileService.changePassword).mockRejectedValue({
        response: {
          data: {
            title: 'Bad Request',
            status: 400,
            detail: 'New password must not be the same as the current password.',
          },
        },
      })

      await wrapper!.find('#current-password').setValue('SamePassword123!')
      await wrapper!.find('#new-password').setValue('SamePassword123!')
      await wrapper!.find('#confirm-new-password').setValue('SamePassword123!')

      await wrapper!.get('#password-form').trigger('submit.prevent')
      await flushPromises()

      expect(wrapper!.text()).toContain('same as the current password')
    })

    it('successfully changes password and clears form inputs', async () => {
      vi.mocked(ProfileService.changePassword).mockResolvedValue({
        message: 'Password changed successfully.',
      })

      await wrapper!.find('#current-password').setValue('OldPassword123!')
      await wrapper!.find('#new-password').setValue('BrandNewPassword123!')
      await wrapper!.find('#confirm-new-password').setValue('BrandNewPassword123!')

      await wrapper!.get('#password-form').trigger('submit.prevent')
      await flushPromises()

      expect(ProfileService.changePassword).toHaveBeenCalledWith({
        currentPassword: 'OldPassword123!',
        newPassword: 'BrandNewPassword123!',
      })

      expect(wrapper!.text()).toContain('Password changed successfully.')

      const currentInput = wrapper!.find<HTMLInputElement>('#current-password')
      const newInput = wrapper!.find<HTMLInputElement>('#new-password')
      const confirmInput = wrapper!.find<HTMLInputElement>('#confirm-new-password')

      expect(currentInput.element.value).toBe('')
      expect(newInput.element.value).toBe('')
      expect(confirmInput.element.value).toBe('')
    })
  })
})
