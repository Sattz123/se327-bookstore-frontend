import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import { createBookstoreRouter } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { CheckoutService } from '@/services/CheckoutService'
import { AddressService } from '@/services/AddressService'
import { PaymentMethodService } from '@/services/PaymentMethodService'
import { CartService } from '@/services/CartService'
import type { CheckoutReview, Order } from '@/types/checkout'
import { cartReader, cartLine, savedCart } from './fixtures/cart'
import { checkoutReview, delivery, simulatedCard, placedOrder } from './fixtures/checkout'
import { deferred } from './fixtures/catalog'

vi.mock('@/services/CheckoutService', () => ({
  CheckoutService: { review: vi.fn(), placeOrder: vi.fn(), confirmation: vi.fn() },
}))
vi.mock('@/services/AddressService', () => ({ AddressService: { getAddresses: vi.fn() } }))
vi.mock('@/services/PaymentMethodService', () => ({
  PaymentMethodService: { getPaymentMethods: vi.fn() },
}))
vi.mock('@/services/CartService', () => ({
  CartService: { getCart: vi.fn(), addItem: vi.fn(), updateQuantity: vi.fn(), removeItem: vi.fn() },
}))
vi.mock('@/services/WishlistService', () => ({
  WishlistService: { getWishlist: vi.fn().mockResolvedValue([]) },
}))
vi.mock('@/services/AuthService', () => ({
  AuthService: { logout: vi.fn(), getCurrentUser: vi.fn() },
}))
vi.mock('@/services/ProductService', () => ({
  default: {
    getFeaturedProducts: vi.fn().mockResolvedValue([]),
    getProduct: vi.fn().mockResolvedValue({ data: { images: [] } }),
  },
}))
vi.mock('@/services/CategoryService', () => ({
  default: { getCategories: vi.fn().mockResolvedValue([]) },
}))

describe('checkout and confirmation', () => {
  let wrapper: VueWrapper | undefined
  let pinia: ReturnType<typeof createPinia>
  let router: ReturnType<typeof createBookstoreRouter>
  const service = vi.mocked(CheckoutService)
  beforeEach(() => {
    vi.clearAllMocks()
    for (const method of Object.values(service)) method.mockReset()
    localStorage.clear()
    window.sessionStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    useAuthStore().setAuth({ token: 'test-token', user: cartReader })
    service.review.mockResolvedValue(checkoutReview)
    service.placeOrder.mockResolvedValue(placedOrder)
    service.confirmation.mockResolvedValue(placedOrder)
    vi.mocked(AddressService.getAddresses).mockResolvedValue([delivery])
    vi.mocked(PaymentMethodService.getPaymentMethods).mockResolvedValue([simulatedCard])
    vi.mocked(CartService.getCart).mockResolvedValue(savedCart())
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })
  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    disposePinia(pinia)
    localStorage.clear()
    window.sessionStorage.clear()
  })
  async function render(path = '/checkout') {
    router = createBookstoreRouter(createMemoryHistory())
    await router.push(path)
    await router.isReady()
    wrapper = mount(App, { global: { plugins: [pinia, router] } })
    await flushPromises()
    return wrapper
  }
  async function click(text: string) {
    const button = wrapper!.findAll('button').find((item) => item.text() === text)
    if (!button) throw new Error(`Button not found: ${text}`)
    await button.trigger('click')
    await flushPromises()
  }
  async function submit() {
    await wrapper!.get('form[aria-label="Place order"]').trigger('submit')
    await flushPromises()
  }

  it('protects checkout and confirmation routes for guests', async () => {
    useAuthStore().clearAuth()
    await render()
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/checkout')
    await router.push('/checkout/confirmation/41')
    await flushPromises()
    expect(router.currentRoute.value.query.redirect).toBe('/checkout/confirmation/41')
    expect(service.review).not.toHaveBeenCalled()
    expect(service.confirmation).not.toHaveBeenCalled()
  })
  it('reviews the default address, quantities, formats, and server total', async () => {
    const app = await render()
    expect((app.get('#checkout-address').element as HTMLSelectElement).value).toBe('10')
    expect(app.get('main').text()).toContain('123 Test Street')
    expect(app.get('main').text()).toContain('Paperback · 2 × $19.95 = $39.90')
    expect(app.get('main').text()).toContain('Total: $39.90')
    expect(app.get('main').text()).toContain('no real charge')
  })
  it('creates a cash order, refreshes the header and loads its saved confirmation', async () => {
    const app = await render()
    vi.mocked(CartService.getCart).mockResolvedValueOnce(savedCart([]))
    await submit()
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/checkout/confirmation/41'))
    await flushPromises()
    expect(service.placeOrder).toHaveBeenCalledWith({
      addressId: 10,
      paymentType: 'CASH_ON_DELIVERY',
      paymentMethodId: null,
      checkoutKey: expect.any(String),
      cartFingerprint: 'a'.repeat(64),
    })
    expect(router.currentRoute.value.path).toBe('/checkout/confirmation/41')
    expect(service.confirmation).toHaveBeenCalledWith('41', expect.any(AbortSignal))
    expect(app.get('main').text()).toContain('Pending — pay on delivery.')
    expect(app.get('main').text()).toContain('Order #41')
    expect(app.get('header a[href="/cart"]').attributes('aria-label')).toBe(
      'Shopping cart, 0 items',
    )
    expect(window.sessionStorage.getItem('bookstore_checkout_pending_1')).toBeNull()
  })
  it('uses a selected address and masked simulated card', async () => {
    vi.mocked(AddressService.getAddresses).mockResolvedValueOnce([
      delivery,
      { ...delivery, id: 11, label: 'Work', addressLine: '456 Work Street', isDefault: false },
    ])
    service.confirmation.mockResolvedValueOnce({
      ...placedOrder,
      status: 'COMPLETED',
      paymentType: 'SIMULATED_CARD',
      paymentDisplay: 'Visa **** **** **** 1234',
    })
    const app = await render()
    await app.get('#checkout-address').setValue('11')
    await app.get('#checkout-payment').setValue('SIMULATED_CARD')
    expect(app.get('#checkout-card').text()).toContain('**** **** **** 1234')
    await submit()
    await vi.waitFor(() =>
      expect(app.get('main').text()).toContain('Completed — simulated card payment.'),
    )
    expect(service.placeOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        addressId: 11,
        paymentType: 'SIMULATED_CARD',
        paymentMethodId: 20,
      }),
    )
    expect(app.get('main').text()).toContain('Completed — simulated card payment.')
  })
  it('shows loading then prevents checkout for an empty cart', async () => {
    const pending = deferred<CheckoutReview>()
    service.review.mockReturnValueOnce(pending.promise)
    const app = await render()
    expect(app.get('main').text()).toContain('Loading checkout')
    pending.resolve({ ...checkoutReview, cart: savedCart([]) })
    await flushPromises()
    expect(app.get('main').text()).toContain('Your cart is empty')
    expect(app.find('main form').exists()).toBe(false)
  })
  it('requires an address and provides a link to add one', async () => {
    vi.mocked(AddressService.getAddresses).mockResolvedValueOnce([])
    const app = await render()
    expect(app.get('main button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(app.get('main a[href="/addresses"]').text()).toBe('Manage addresses')
    await submit()
    expect(service.placeOrder).not.toHaveBeenCalled()
  })
  it('allows cash without a saved card and disables card checkout until one exists', async () => {
    vi.mocked(PaymentMethodService.getPaymentMethods).mockResolvedValueOnce([])
    const app = await render()
    expect(app.get('main button[type="submit"]').attributes('disabled')).toBeUndefined()
    await app.get('#checkout-payment').setValue('SIMULATED_CARD')
    expect(app.get('main button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(app.get('main a[href="/payment-methods"]').text()).toBe('Manage payment methods')
  })
  it('prevents checkout of unavailable selections', async () => {
    service.review.mockResolvedValueOnce({
      ...checkoutReview,
      cart: savedCart([{ ...cartLine, available: false }]),
    })
    const app = await render()
    expect(app.get('main').text()).toContain('Unavailable or insufficient stock')
    expect(app.get('main button[type="submit"]').attributes('disabled')).toBeDefined()
  })
  it('requires a refreshed review and a new key after a price conflict', async () => {
    service.placeOrder.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409, data: { detail: 'Your cart or its prices changed.' } },
    })
    const app = await render()
    await submit()
    expect(app.get('[role="alert"]').text()).toContain('prices changed')
    expect(useCartStore().count).toBe(2)
    expect(window.sessionStorage.getItem('bookstore_checkout_pending_1')).toBeNull()
    service.review.mockResolvedValueOnce({ ...checkoutReview, cartFingerprint: 'b'.repeat(64) })
    await click('Refresh review')
    await submit()
    const first = service.placeOrder.mock.calls[0]![0]
    const second = service.placeOrder.mock.calls[1]![0]
    expect(second.checkoutKey).not.toBe(first.checkoutKey)
    expect(second.cartFingerprint).toBe('b'.repeat(64))
  })
  it('keeps the same request across a lost response and page reload', async () => {
    service.placeOrder.mockRejectedValueOnce(new Error('Connection lost'))
    let app = await render()
    await submit()
    const first = service.placeOrder.mock.calls[0]![0]
    expect(app.get('main').text()).toContain('awaiting confirmation')
    expect(app.find('main form').exists()).toBe(false)
    wrapper!.unmount()
    wrapper = undefined
    service.review.mockResolvedValueOnce({ ...checkoutReview, cart: savedCart([]) })
    app = await render()
    await click('Retry order')
    expect(service.placeOrder.mock.calls[1]![0]).toEqual(first)
    expect(router.currentRoute.value.path).toBe('/checkout/confirmation/41')
    expect(app.get('main').text()).toContain('Order #41')
  })
  it('does not send another request while a checkout is pending', async () => {
    const pending = deferred<Order>()
    service.placeOrder.mockReturnValueOnce(pending.promise)
    const app = await render()
    await app.get('main form').trigger('submit')
    await app
      .findAll('button')
      .find((button) => button.text() === 'Checking order…')!
      .trigger('click')
    expect(service.placeOrder).toHaveBeenCalledTimes(1)
    pending.resolve(placedOrder)
    await flushPromises()
  })
  it('can retry loading checkout after a network error', async () => {
    service.review.mockRejectedValueOnce(new Error('Offline'))
    const app = await render()
    expect(app.get('[role="alert"]').text()).toContain('could not reach')
    await click('Refresh review')
    expect(app.find('main form').exists()).toBe(true)
  })
  it('reloads confirmations and hides missing or foreign orders', async () => {
    service.confirmation.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
    const app = await render('/checkout/confirmation/41')
    expect(app.get('[role="alert"]').text()).toBe('Order not found.')
    expect(app.get('main').text()).not.toContain('Demo Reader')
    await click('Try again')
    expect(app.get('main').text()).toContain('123 Test Street')
  })
  it('clears private checkout data and ignores late reads after an account change', async () => {
    const pending = deferred<CheckoutReview>()
    service.review.mockReturnValueOnce(pending.promise)
    const app = await render()
    service.review.mockResolvedValueOnce({ ...checkoutReview, cart: savedCart([]) })
    vi.mocked(AddressService.getAddresses).mockResolvedValueOnce([])
    vi.mocked(PaymentMethodService.getPaymentMethods).mockResolvedValueOnce([])
    useAuthStore().setAuth({ token: 'other-token', user: { ...cartReader, id: 2 } })
    await flushPromises()
    pending.resolve(checkoutReview)
    await flushPromises()
    expect(app.get('main').text()).not.toContain('Demo Reader')
    expect(app.get('main').text()).toContain('Your cart is empty')
    expect(service.placeOrder).not.toHaveBeenCalled()
  })
  it('redirects expired sessions and ignores a late purchase response after logout', async () => {
    const pending = deferred<Order>()
    service.placeOrder.mockReturnValueOnce(pending.promise)
    const app = await render()
    await app.get('main form').trigger('submit')
    useAuthStore().clearAuth()
    await flushPromises()
    pending.resolve(placedOrder)
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/login')
    expect(service.confirmation).not.toHaveBeenCalled()
    expect(app.get('main').text()).not.toContain('Demo Reader')
  })
})
