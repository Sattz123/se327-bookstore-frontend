import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWishlistStore } from '@/stores/wishlist'
import { WishlistService } from '@/services/WishlistService'
import { createBookstoreRouter } from '@/router'
import App from '@/App.vue'
import WishlistView from '@/views/WishlistView.vue'
import BookCard from '@/components/BookCard.vue'
import ProductDetailView from '@/views/ProductDetailView.vue'
import ProductService from '@/services/ProductService'
import { book, response } from './fixtures/catalog'
import type { User } from '@/types/auth'
import type { WishlistItem } from '@/types/wishlist'

vi.mock('@/services/AuthService', () => ({
  AuthService: {
    login: vi.fn(),
    register: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn().mockResolvedValue({ message: 'Logged out' }),
  },
}))

vi.mock('@/services/WishlistService', () => ({
  WishlistService: {
    getWishlist: vi.fn(),
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
  },
}))

vi.mock('@/services/ProductService', () => ({
  default: {
    getProducts: vi.fn().mockResolvedValue({
      data: { content: [], page: 1, size: 15, totalElements: 0, totalPages: 0 },
    }),
    getProduct: vi.fn(),
    getFeaturedProducts: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

vi.mock('@/services/CategoryService', () => ({
  default: { getCategories: vi.fn().mockResolvedValue({ data: [] }) },
}))

describe('Wishlist Flow and Behavior Tests', () => {
  let pinia: ReturnType<typeof createPinia>
  let wrapper: VueWrapper | undefined

  const mockUser: User = {
    id: 1,
    username: 'reader_jane',
    email: 'jane@example.com',
    phone: null,
    avatarUrl: null,
    role: 'CUSTOMER',
    createdAt: '2026-02-01T10:00:00Z',
  }

  const sampleBook1 = book({ id: 101, name: 'The Pragmatic Programmer', price: 45 })
  const sampleBook2 = book({ id: 102, name: 'Design Patterns', price: 55 })

  const sampleWishlistItem1: WishlistItem = {
    id: 1,
    product: sampleBook1,
    createdAt: '2026-03-01T12:00:00Z',
  }

  const sampleWishlistItem2: WishlistItem = {
    id: 2,
    product: sampleBook2,
    createdAt: '2026-03-02T12:00:00Z',
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

  describe('Route Protection & Navigation', () => {
    it('redirects unauthenticated users from /wishlist to /login with redirect query', async () => {
      const router = createBookstoreRouter(createMemoryHistory())
      await router.push('/wishlist')
      await router.isReady()

      wrapper = mount(App, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/login')
      expect(router.currentRoute.value.query.redirect).toBe('/wishlist')
    })

    it('allows authenticated users to access /wishlist', async () => {
      const authStore = useAuthStore()
      authStore.setAuth({ token: 'jwt.token', user: mockUser })

      vi.mocked(WishlistService.getWishlist).mockResolvedValue([sampleWishlistItem1])

      const router = createBookstoreRouter(createMemoryHistory())
      await router.push('/wishlist')
      await router.isReady()

      wrapper = mount(App, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/wishlist')
      expect(wrapper.text()).toContain('My Wishlist')
      expect(wrapper.text()).toContain('The Pragmatic Programmer')
    })
  })

  describe('WishlistView Component States', () => {
    it('renders empty state when user has no items saved', async () => {
      vi.mocked(WishlistService.getWishlist).mockResolvedValueOnce([])

      const router = createBookstoreRouter(createMemoryHistory())
      const wishlistStore = useWishlistStore()

      wrapper = mount(WishlistView, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      expect(wrapper.find('[data-testid="wishlist-empty"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Your wishlist is empty')
      expect(wrapper.text()).toContain('Explore books')
      expect(wishlistStore.count).toBe(0)
    })

    it('renders list of saved books with title, author, price, and category', async () => {
      vi.mocked(WishlistService.getWishlist).mockResolvedValueOnce([
        sampleWishlistItem1,
        sampleWishlistItem2,
      ])

      const router = createBookstoreRouter(createMemoryHistory())
      wrapper = mount(WishlistView, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      const items = wrapper.findAll('[data-testid="wishlist-item"]')
      expect(items).toHaveLength(2)
      expect(wrapper.text()).toContain('The Pragmatic Programmer')
      expect(wrapper.text()).toContain('Design Patterns')
      expect(wrapper.text()).toContain('$45.00')
      expect(wrapper.text()).toContain('$55.00')
    })

    it('removes item from wishlist when clicking remove button', async () => {
      vi.mocked(WishlistService.getWishlist).mockResolvedValueOnce([
        sampleWishlistItem1,
        sampleWishlistItem2,
      ])
      vi.mocked(WishlistService.removeFromWishlist).mockResolvedValueOnce()

      const router = createBookstoreRouter(createMemoryHistory())
      const wishlistStore = useWishlistStore()

      wrapper = mount(WishlistView, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      expect(wishlistStore.count).toBe(2)

      const removeButtons = wrapper.findAll('button[aria-label^="Remove"]')
      expect(removeButtons).toHaveLength(2)

      await removeButtons[0]!.trigger('click')
      await flushPromises()

      expect(WishlistService.removeFromWishlist).toHaveBeenCalledWith(sampleBook1.id)
      expect(wishlistStore.count).toBe(1)
      expect(wrapper.text()).not.toContain('The Pragmatic Programmer')
      expect(wrapper.text()).toContain('Design Patterns')
    })

    it('transitions to empty state when the last item is removed', async () => {
      vi.mocked(WishlistService.getWishlist).mockResolvedValueOnce([sampleWishlistItem1])
      vi.mocked(WishlistService.removeFromWishlist).mockResolvedValueOnce()

      const router = createBookstoreRouter(createMemoryHistory())
      wrapper = mount(WishlistView, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      expect(wrapper.findAll('[data-testid="wishlist-item"]')).toHaveLength(1)

      const removeBtn = wrapper.find('button[aria-label^="Remove"]')
      await removeBtn.trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-testid="wishlist-empty"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Your wishlist is empty')
    })
  })

  describe('BookCard & ProductDetail Wishlist Controls', () => {
    it('redirects unauthenticated user to login when clicking wishlist button on BookCard', async () => {
      const router = createBookstoreRouter(createMemoryHistory())
      const pushSpy = vi.spyOn(router, 'push')

      wrapper = mount(BookCard, {
        props: { product: sampleBook1 },
        global: { plugins: [pinia, router] },
      })

      const wishlistBtn = wrapper.find('button[title="Save to wishlist"]')
      expect(wishlistBtn.exists()).toBe(true)

      await wishlistBtn.trigger('click')
      await flushPromises()

      expect(pushSpy).toHaveBeenCalledWith({ name: 'login' })
    })

    it('adds book to wishlist on BookCard click when authenticated', async () => {
      const authStore = useAuthStore()
      authStore.setAuth({ token: 'jwt.token', user: mockUser })

      vi.mocked(WishlistService.addToWishlist).mockResolvedValueOnce(sampleWishlistItem1)

      const router = createBookstoreRouter(createMemoryHistory())
      const wishlistStore = useWishlistStore()

      wrapper = mount(BookCard, {
        props: { product: sampleBook1 },
        global: { plugins: [pinia, router] },
      })

      const wishlistBtn = wrapper.find('button[title="Save to wishlist"]')
      await wishlistBtn.trigger('click')
      await flushPromises()

      expect(WishlistService.addToWishlist).toHaveBeenCalledWith({ productId: sampleBook1.id })
      expect(wishlistStore.hasItem(sampleBook1.id)).toBe(true)
      expect(wrapper.find('button[title="Remove from wishlist"]').exists()).toBe(true)
    })

    it('removes book on BookCard click when already in wishlist', async () => {
      const authStore = useAuthStore()
      authStore.setAuth({ token: 'jwt.token', user: mockUser })

      const wishlistStore = useWishlistStore()
      wishlistStore.items = [sampleWishlistItem1]

      vi.mocked(WishlistService.removeFromWishlist).mockResolvedValueOnce()

      const router = createBookstoreRouter(createMemoryHistory())

      wrapper = mount(BookCard, {
        props: { product: sampleBook1 },
        global: { plugins: [pinia, router] },
      })

      const removeBtn = wrapper.find('button[title="Remove from wishlist"]')
      expect(removeBtn.exists()).toBe(true)

      await removeBtn.trigger('click')
      await flushPromises()

      expect(WishlistService.removeFromWishlist).toHaveBeenCalledWith(sampleBook1.id)
      expect(wishlistStore.hasItem(sampleBook1.id)).toBe(false)
      expect(wrapper.find('button[title="Save to wishlist"]').exists()).toBe(true)
    })

    it('toggles wishlist on ProductDetailView', async () => {
      const authStore = useAuthStore()
      authStore.setAuth({ token: 'jwt.token', user: mockUser })

      vi.mocked(ProductService.getProduct).mockResolvedValueOnce(response(sampleBook1))
      vi.mocked(WishlistService.addToWishlist).mockResolvedValueOnce(sampleWishlistItem1)

      const router = createBookstoreRouter(createMemoryHistory())
      await router.push(`/products/${sampleBook1.id}`)
      await router.isReady()

      wrapper = mount(ProductDetailView, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      const saveBtn = wrapper.find('button[aria-label="Save to wishlist"]')
      expect(saveBtn.exists()).toBe(true)
      expect(saveBtn.text()).toContain('Save to wishlist')

      await saveBtn.trigger('click')
      await flushPromises()

      expect(WishlistService.addToWishlist).toHaveBeenCalledWith({ productId: sampleBook1.id })
      expect(wrapper.find('button[aria-label="Remove from wishlist"]').text()).toContain(
        'Saved in wishlist',
      )
    })
  })

  describe('Duplicate Prevention and Header Synchronization', () => {
    it('prevents duplicate additions in store logic', async () => {
      const wishlistStore = useWishlistStore()
      wishlistStore.items = [sampleWishlistItem1]

      await wishlistStore.addToWishlist(sampleBook1)

      expect(WishlistService.addToWishlist).not.toHaveBeenCalled()
      expect(wishlistStore.count).toBe(1)
    })

    it('updates header wishlist count and clears on logout', async () => {
      const authStore = useAuthStore()
      authStore.setAuth({ token: 'jwt.token', user: mockUser })

      vi.mocked(WishlistService.getWishlist).mockResolvedValueOnce([
        sampleWishlistItem1,
        sampleWishlistItem2,
      ])

      const router = createBookstoreRouter(createMemoryHistory())
      await router.push('/')
      await router.isReady()

      wrapper = mount(App, {
        global: { plugins: [pinia, router] },
      })
      await flushPromises()

      const wishlistLink = wrapper.find('a[href="/wishlist"]')
      expect(wishlistLink.exists()).toBe(true)
      expect(wishlistLink.text()).toContain('Wishlist')
      expect(wishlistLink.text()).toContain('2')

      // Sign out
      const signoutBtn = wrapper.findAll('button').find((b) => b.text().includes('Sign out'))
      expect(signoutBtn).toBeDefined()
      await signoutBtn!.trigger('click')
      await flushPromises()

      expect(wrapper.find('a[href="/wishlist"]').exists()).toBe(false)
      const wishlistStore = useWishlistStore()
      expect(wishlistStore.count).toBe(0)
    })
  })
})
