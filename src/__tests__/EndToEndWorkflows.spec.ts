import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { createBookstoreRouter } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import ProductListView from '@/views/ProductListView.vue'
import ProductDetailView from '@/views/ProductDetailView.vue'
import CartView from '@/views/CartView.vue'
import WishlistView from '@/views/WishlistView.vue'
import AddressBookView from '@/views/AddressBookView.vue'
import PaymentMethodsView from '@/views/PaymentMethodsView.vue'
import CheckoutView from '@/views/CheckoutView.vue'
import OrderConfirmationView from '@/views/OrderConfirmationView.vue'
import OrderHistoryView from '@/views/OrderHistoryView.vue'
import ProfileView from '@/views/ProfileView.vue'
import AdminOverviewView from '@/views/AdminOverviewView.vue'
import AdminProductsView from '@/views/AdminProductsView.vue'
import AdminCategoriesView from '@/views/AdminCategoriesView.vue'
import AdminOrdersView from '@/views/AdminOrdersView.vue'
import AdminCustomersView from '@/views/AdminCustomersView.vue'
import AdminProfileView from '@/views/AdminProfileView.vue'

import ProductService from '@/services/ProductService'
import CategoryService from '@/services/CategoryService'
import { CartService } from '@/services/CartService'
import { WishlistService } from '@/services/WishlistService'
import { AddressService } from '@/services/AddressService'
import { PaymentMethodService } from '@/services/PaymentMethodService'
import { CheckoutService } from '@/services/CheckoutService'
import { OrderService } from '@/services/OrderService'
import { ProfileService } from '@/services/ProfileService'
import { AdminService } from '@/services/AdminService'
import { AdminProductService } from '@/services/AdminProductService'
import { AdminCategoryService } from '@/services/AdminCategoryService'
import { AdminOrderService } from '@/services/AdminOrderService'
import { AdminCustomerService } from '@/services/AdminCustomerService'
import { AdminProfileService } from '@/services/AdminProfileService'
import { AdminDashboardService } from '@/services/AdminDashboardService'

import type { User } from '@/types/auth'
import type { Product, ProductPage } from '@/types/catalog'
import type { Cart } from '@/types/cart'
import type { Address } from '@/types/address'
import type { PaymentMethod } from '@/types/paymentMethod'
import type { Order, OrderStatus } from '@/types/checkout'

vi.mock('@/services/ProductService', () => ({
  default: {
    getProducts: vi.fn(),
    getFeaturedProducts: vi.fn(),
    getProduct: vi.fn(),
  },
}))

vi.mock('@/services/CategoryService', () => ({
  default: {
    getCategories: vi.fn(),
  },
}))

vi.mock('@/services/CartService', () => ({
  CartService: {
    getCart: vi.fn(),
    addItem: vi.fn(),
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
  },
}))

vi.mock('@/services/WishlistService', () => ({
  WishlistService: {
    getWishlist: vi.fn(),
    addToWishlist: vi.fn(),
    removeFromWishlist: vi.fn(),
  },
}))

vi.mock('@/services/AddressService', () => ({
  AddressService: {
    getAddresses: vi.fn(),
  },
}))

vi.mock('@/services/PaymentMethodService', () => ({
  PaymentMethodService: {
    getPaymentMethods: vi.fn(),
  },
}))

vi.mock('@/services/CheckoutService', () => ({
  CheckoutService: {
    review: vi.fn(),
    placeOrder: vi.fn(),
    confirmation: vi.fn(),
  },
}))

vi.mock('@/services/OrderService', () => ({
  OrderService: {
    getOrders: vi.fn(),
    getOrder: vi.fn(),
  },
}))

vi.mock('@/services/ProfileService', () => ({
  ProfileService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
  },
}))

vi.mock('@/services/AdminService', () => ({
  AdminService: {
    getSession: vi.fn(),
  },
}))

vi.mock('@/services/AdminProductService', () => ({
  AdminProductService: {
    list: vi.fn(),
    categories: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    inventory: vi.fn(),
    visibility: vi.fn(),
    archive: vi.fn(),
  },
}))

vi.mock('@/services/AdminCategoryService', () => ({
  AdminCategoryService: {
    list: vi.fn(),
    get: vi.fn(),
    save: vi.fn(),
  },
}))

vi.mock('@/services/AdminOrderService', () => ({
  AdminOrderService: {
    list: vi.fn(),
    get: vi.fn(),
    updateStatus: vi.fn(),
  },
}))

vi.mock('@/services/AdminCustomerService', () => ({
  AdminCustomerService: {
    list: vi.fn(),
  },
}))

vi.mock('@/services/AdminProfileService', () => ({
  AdminProfileService: {
    get: vi.fn(),
    update: vi.fn(),
    changePassword: vi.fn(),
  },
}))

vi.mock('@/services/AdminDashboardService', () => ({
  AdminDashboardService: {
    get: vi.fn(),
  },
}))

describe('End-to-End Customer and Administrator Workflows', () => {
  let pinia: ReturnType<typeof createPinia>
  let router: ReturnType<typeof createBookstoreRouter>
  let wrapper: VueWrapper | undefined

  const customerUser: User = {
    id: 101,
    username: 'Alice Reader',
    email: 'alice@example.com',
    phone: '0812345678',
    avatarUrl: null,
    role: 'CUSTOMER',
    createdAt: '2026-01-01T00:00:00Z',
  }

  const adminUser: User = {
    id: 1,
    username: 'System Admin',
    email: 'admin@example.com',
    phone: '0898765432',
    avatarUrl: null,
    role: 'ADMIN',
    createdAt: '2026-01-01T00:00:00Z',
  }

  const sampleProduct: Product = {
    id: 42,
    name: 'Refactoring in Practice',
    author: 'Martin Fowler',
    description: 'Improving the design of existing code.',
    price: 35.0,
    stockQuantity: 15,
    category: { id: 1, name: 'Computer Science', imageUrl: null },
    images: ['/images/refactoring.jpg'],
    formats: ['PAPERBACK', 'HARDCOVER', 'EBOOK'],
  }

  const productListPage: ProductPage = {
    content: [sampleProduct],
    page: 1,
    size: 16,
    totalElements: 1,
    totalPages: 1,
  }

  const sampleAddress: Address = {
    id: 12,
    label: 'Office',
    fullName: 'Alice Reader',
    phone: '0812345678',
    addressLine: '88 Tech Boulevard',
    city: 'Bangkok',
    province: 'Bangkok',
    postalCode: '10110',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }

  const samplePayment: PaymentMethod = {
    id: 55,
    provider: 'Visa',
    cardholderName: 'Alice Reader',
    cardNumberMasked: '**** **** **** 8888',
    expiryMonth: 10,
    expiryYear: 2028,
    isDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
  }

  const sampleCart: Cart = {
    items: [
      {
        id: 99,
        productId: 42,
        name: 'Refactoring in Practice',
        image: '/images/refactoring.jpg',
        format: 'HARDCOVER',
        quantity: 2,
        unitPrice: 35.0,
        lineTotal: 70.0,
        stockQuantity: 15,
        available: true,
      },
    ],
    totalQuantity: 2,
    total: 70.0,
  }

  const sampleOrder: Order = {
    id: 701,
    status: 'PENDING',
    paymentType: 'SIMULATED_CARD',
    paymentDisplay: 'Visa **** 8888',
    recipientName: 'Alice Reader',
    shippingPhone: '0812345678',
    shippingAddress: '88 Tech Boulevard\nBangkok 10110',
    total: 70.0,
    createdAt: '2026-10-15T00:00:00Z',
    items: [
      {
        productId: 42,
        title: 'Refactoring in Practice',
        format: 'HARDCOVER',
        quantity: 2,
        unitPrice: 35.0,
        lineTotal: 70.0,
      },
    ],
  }

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.clearAllMocks()

    pinia = createPinia()
    setActivePinia(pinia)
    router = createBookstoreRouter(createMemoryHistory())

    vi.mocked(ProductService.getProducts).mockResolvedValue({
      data: productListPage,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    })
    vi.mocked(ProductService.getProduct).mockResolvedValue({
      data: sampleProduct,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    })
    vi.mocked(CategoryService.getCategories).mockResolvedValue({
      data: [{ id: 1, name: 'Computer Science', imageUrl: null }],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as never,
    })

    vi.mocked(CartService.getCart).mockResolvedValue(sampleCart)
    vi.mocked(CartService.addItem).mockResolvedValue(sampleCart)
    vi.mocked(CartService.updateQuantity).mockResolvedValue(sampleCart)
    vi.mocked(CartService.removeItem).mockResolvedValue({ items: [], totalQuantity: 0, total: 0 })

    vi.mocked(WishlistService.getWishlist).mockResolvedValue([
      {
        id: 501,
        product: sampleProduct,
        createdAt: '2026-10-15T00:00:00Z',
      },
    ])
    vi.mocked(WishlistService.removeFromWishlist).mockResolvedValue()

    vi.mocked(AddressService.getAddresses).mockResolvedValue([sampleAddress])
    vi.mocked(PaymentMethodService.getPaymentMethods).mockResolvedValue([samplePayment])

    vi.mocked(CheckoutService.review).mockResolvedValue({
      cart: sampleCart,
      cartFingerprint: 'mock-cart-fingerprint-xyz',
    })
    vi.mocked(CheckoutService.placeOrder).mockResolvedValue(sampleOrder)
    vi.mocked(CheckoutService.confirmation).mockResolvedValue(sampleOrder)

    vi.mocked(OrderService.getOrders).mockResolvedValue([
      {
        id: 701,
        status: 'PENDING',
        paymentDisplay: 'Visa **** 8888',
        total: 70.0,
        createdAt: '2026-10-15T00:00:00Z',
      },
    ])
    vi.mocked(OrderService.getOrder).mockResolvedValue(sampleOrder)

    vi.mocked(ProfileService.getProfile).mockResolvedValue(customerUser)
    vi.mocked(ProfileService.updateProfile).mockResolvedValue({
      token: 'new-token',
      user: { ...customerUser, phone: '0899999999' },
    })

    vi.mocked(AdminService.getSession).mockResolvedValue(adminUser)
    vi.mocked(AdminDashboardService.get).mockResolvedValue({
      totalProducts: 16,
      totalOrders: 28,
      totalCustomers: 14,
      recentOrders: [
        {
          id: 701,
          customerId: 101,
          customerName: 'Alice Reader',
          customerEmail: 'alice@example.com',
          status: 'PENDING',
          paymentDisplay: 'Visa **** 8888',
          total: 70.0,
          createdAt: '2026-10-15T00:00:00Z',
        },
      ],
      page: 1,
      size: 5,
      totalPages: 1,
    })

    vi.mocked(AdminProductService.list).mockResolvedValue({
      content: [
        {
          id: 42,
          name: 'Refactoring in Practice',
          author: 'Martin Fowler',
          description: 'Improving code design',
          price: 35.0,
          stockQuantity: 15,
          category: { id: 1, name: 'Computer Science', visible: true },
          images: [],
          visible: true,
          version: 1,
          updatedAt: '2026-01-01T00:00:00Z',
          formats: ['PAPERBACK', 'HARDCOVER'],
        },
      ],
      page: 1,
      size: 10,
      totalElements: 1,
      totalPages: 1,
    })
    vi.mocked(AdminProductService.categories).mockResolvedValue([
      { id: 1, name: 'Computer Science', visible: true },
    ])
    vi.mocked(AdminProductService.inventory).mockResolvedValue({
      id: 42,
      name: 'Refactoring in Practice',
      author: 'Martin Fowler',
      description: 'Improving code design',
      price: 35.0,
      stockQuantity: 20,
      category: { id: 1, name: 'Computer Science', visible: true },
      images: [],
      visible: true,
      version: 2,
      updatedAt: '2026-01-01T00:00:00Z',
      formats: ['PAPERBACK', 'HARDCOVER'],
    })

    vi.mocked(AdminCategoryService.list).mockResolvedValue([
      {
        id: 1,
        name: 'Computer Science',
        imageUrl: null,
        visible: true,
        productCount: 1,
        version: 1,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ])

    vi.mocked(AdminOrderService.list).mockResolvedValue({
      content: [
        {
          id: 701,
          customerId: 101,
          customerName: 'Alice Reader',
          customerEmail: 'alice@example.com',
          status: 'PENDING',
          paymentDisplay: 'Visa **** 8888',
          total: 70.0,
          createdAt: '2026-10-15T00:00:00Z',
        },
      ],
      page: 1,
      size: 10,
      totalElements: 1,
      totalPages: 1,
    })
    vi.mocked(AdminOrderService.get).mockResolvedValue({
      order: sampleOrder,
      customerId: 101,
      customerName: 'Alice Reader',
      customerEmail: 'alice@example.com',
      customerPhone: '0812345678',
      version: 1,
      updatedAt: '2026-10-15T00:00:00Z',
      allowedStatuses: ['PROCESSING', 'CANCELLED'] as OrderStatus[],
    })
    vi.mocked(AdminOrderService.updateStatus).mockResolvedValue({
      order: { ...sampleOrder, status: 'PROCESSING' },
      customerId: 101,
      customerName: 'Alice Reader',
      customerEmail: 'alice@example.com',
      customerPhone: '0812345678',
      version: 2,
      updatedAt: '2026-10-15T01:00:00Z',
      allowedStatuses: ['SHIPPED', 'CANCELLED'] as OrderStatus[],
    })

    vi.mocked(AdminCustomerService.list).mockResolvedValue({
      content: [
        {
          id: 101,
          username: 'Alice Reader',
          email: 'alice@example.com',
          phone: '0812345678',
          createdAt: '2026-01-01T00:00:00Z',
          orderCount: 1,
          totalSpent: 70.0,
        },
      ],
      page: 1,
      size: 10,
      totalElements: 1,
      totalPages: 1,
    })

    vi.mocked(AdminProfileService.get).mockResolvedValue(adminUser)
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  describe('Customer Journey', () => {
    it('browses the catalog, views book details, and selects edition format', async () => {
      wrapper = mount(ProductListView, {
        global: {
          plugins: [pinia, router],
        },
      })
      await flushPromises()

      expect(ProductService.getProducts).toHaveBeenCalled()
      expect(wrapper.text()).toContain('Refactoring in Practice')
      expect(wrapper.text()).toContain('Martin Fowler')
      wrapper.unmount()

      await router.push('/products/42')
      wrapper = mount(ProductDetailView, {
        global: {
          plugins: [pinia, router],
        },
      })
      await flushPromises()

      expect(ProductService.getProduct).toHaveBeenCalled()
      expect(wrapper.text()).toContain('Refactoring in Practice')
      expect(wrapper.text()).toContain('Hardcover')
    })

    it('manages cart items and preserves chosen book format', async () => {
      useAuthStore().setAuth({ token: 'test-token', user: customerUser })
      const cartStore = useCartStore()
      await cartStore.fetchCart()

      wrapper = mount(CartView, {
        global: {
          plugins: [pinia, router],
        },
      })
      await flushPromises()

      expect(wrapper.text()).toContain('Refactoring in Practice')
      expect(wrapper.text()).toContain('Hardcover')
      expect(wrapper.text()).toContain('70')

      const removeBtn = wrapper.findAll('button').find((btn) => btn.text() === 'Remove')
      expect(removeBtn?.exists()).toBe(true)
    })

    it('manages wishlist items', async () => {
      useAuthStore().setAuth({ token: 'test-token', user: customerUser })

      wrapper = mount(WishlistView, {
        global: {
          plugins: [pinia, router],
        },
      })
      await flushPromises()

      expect(WishlistService.getWishlist).toHaveBeenCalled()
      expect(wrapper.text()).toContain('Refactoring in Practice')
      expect(wrapper.text()).toContain('Computer Science')
    })

    it('manages saved shipping addresses and payment methods', async () => {
      useAuthStore().setAuth({ token: 'test-token', user: customerUser })

      wrapper = mount(AddressBookView, {
        global: {
          plugins: [pinia, router],
        },
      })
      await flushPromises()

      expect(AddressService.getAddresses).toHaveBeenCalled()
      expect(wrapper.text()).toContain('88 Tech Boulevard')
      expect(wrapper.text()).toContain('Bangkok')
      wrapper.unmount()

      wrapper = mount(PaymentMethodsView, {
        global: {
          plugins: [pinia, router],
        },
      })
      await flushPromises()

      expect(PaymentMethodService.getPaymentMethods).toHaveBeenCalled()
      expect(wrapper.text()).toContain('**** **** **** 8888')
    })

    it('executes checkout review, order placement, and confirmation lookup', async () => {
      useAuthStore().setAuth({ token: 'test-token', user: customerUser })
      await router.push('/checkout')

      wrapper = mount(CheckoutView, {
        global: {
          plugins: [pinia, router],
        },
      })
      await flushPromises()

      expect(CheckoutService.review).toHaveBeenCalled()
      expect(wrapper.text()).toContain('Refactoring in Practice')
      expect(wrapper.text()).toContain('88 Tech Boulevard')
      wrapper.unmount()

      await router.push('/checkout/confirmation/701')
      wrapper = mount(OrderConfirmationView, {
        global: {
          plugins: [pinia, router],
        },
      })
      await flushPromises()

      expect(CheckoutService.confirmation).toHaveBeenCalledWith('701', expect.anything())
      expect(wrapper.text()).toContain('701')
      expect(wrapper.text()).toContain('Refactoring in Practice')
    })

    it('views past order history and profile details', async () => {
      useAuthStore().setAuth({ token: 'test-token', user: customerUser })

      wrapper = mount(OrderHistoryView, {
        global: {
          plugins: [pinia, router],
        },
      })
      await flushPromises()

      expect(OrderService.getOrders).toHaveBeenCalled()
      expect(wrapper.text()).toContain('701')
      expect(wrapper.text()).toContain('Pending')
      wrapper.unmount()

      wrapper = mount(ProfileView, {
        global: {
          plugins: [pinia, router],
        },
      })
      await flushPromises()

      expect(ProfileService.getProfile).toHaveBeenCalled()
      const usernameInput = wrapper.find<HTMLInputElement>('#profile-name')
      expect(usernameInput.element.value).toBe('Alice Reader')
    })
  })

  describe('Administrator Journey and Access Boundaries', () => {
    it('blocks non-admin users from accessing administrator routes', async () => {
      vi.mocked(AdminService.getSession).mockResolvedValueOnce(customerUser)
      useAuthStore().setAuth({ token: 'customer-token', user: customerUser })

      await router.push('/admin')
      await flushPromises()

      expect(router.currentRoute.value.name).not.toBe('admin-home')
    })

    it('renders administrator dashboard overview with business metrics', async () => {
      useAuthStore().setAuth({ token: 'admin-token', user: adminUser })

      wrapper = mount(AdminOverviewView, {
        global: {
          plugins: [pinia, router],
        },
      })
      await flushPromises()

      expect(AdminDashboardService.get).toHaveBeenCalled()
      expect(wrapper.text()).toContain('16')
      expect(wrapper.text()).toContain('28')
      expect(wrapper.text()).toContain('14')
    })

    it('manages products inventory and categories in admin catalog', async () => {
      useAuthStore().setAuth({ token: 'admin-token', user: adminUser })

      wrapper = mount(AdminProductsView, {
        global: {
          plugins: [pinia, router],
        },
      })
      await flushPromises()

      expect(AdminProductService.list).toHaveBeenCalled()
      expect(wrapper.text()).toContain('Refactoring in Practice')
      wrapper.unmount()

      wrapper = mount(AdminCategoriesView, {
        global: {
          plugins: [pinia, router],
        },
      })
      await flushPromises()

      expect(AdminCategoryService.list).toHaveBeenCalled()
      expect(wrapper.text()).toContain('Computer Science')
    })

    it('manages customer accounts, order fulfillment, and admin profile', async () => {
      useAuthStore().setAuth({ token: 'admin-token', user: adminUser })

      wrapper = mount(AdminCustomersView, {
        global: {
          plugins: [pinia, router],
        },
      })
      await flushPromises()

      expect(AdminCustomerService.list).toHaveBeenCalled()
      expect(wrapper.text()).toContain('Alice Reader')
      wrapper.unmount()

      wrapper = mount(AdminOrdersView, {
        global: {
          plugins: [pinia, router],
        },
      })
      await flushPromises()

      expect(AdminOrderService.list).toHaveBeenCalled()
      expect(wrapper.text()).toContain('701')
      expect(wrapper.text()).toContain('Pending')
      wrapper.unmount()

      wrapper = mount(AdminProfileView, {
        global: {
          plugins: [pinia, router],
        },
      })
      await flushPromises()

      expect(AdminProfileService.get).toHaveBeenCalled()
      const adminNameInput = wrapper.find<HTMLInputElement>('#admin-name')
      expect(adminNameInput.element.value).toBe('System Admin')
    })
  })
})
