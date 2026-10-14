import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, disposePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import { createBookstoreRouter } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { OrderService } from '@/services/OrderService'
import { placedOrder } from './fixtures/checkout'
import { cartReader } from './fixtures/cart'

vi.mock('@/services/OrderService', () => ({
  OrderService: { getOrders: vi.fn(), getOrder: vi.fn() },
}))
vi.mock('@/services/CartService', () => ({
  CartService: { getCart: vi.fn().mockResolvedValue({ items: [], totalQuantity: 0, total: 0 }) },
}))
vi.mock('@/services/WishlistService', () => ({
  WishlistService: { getWishlist: vi.fn().mockResolvedValue([]) },
}))

describe('customer order pages', () => {
  let wrapper: VueWrapper | undefined
  let pinia: ReturnType<typeof createPinia>
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    pinia = createPinia()
    useAuthStore(pinia).setAuth({ token: 'test-token', user: cartReader })
    useAuthStore(pinia).isInitialized = true
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    vi.mocked(OrderService.getOrders).mockResolvedValue([
      placedOrder,
      { ...placedOrder, id: 40, status: 'CANCELLED' },
    ])
    vi.mocked(OrderService.getOrder).mockResolvedValue(placedOrder)
  })
  afterEach(() => {
    wrapper?.unmount()
    disposePinia(pinia)
    localStorage.clear()
  })

  async function render(path = '/orders') {
    const router = createBookstoreRouter(createMemoryHistory())
    await router.push(path)
    await router.isReady()
    wrapper = mount(App, { global: { plugins: [pinia, router] } })
    await flushPromises()
    return { view: wrapper, router }
  }
  it('keeps order IDs and statuses distinct and opens the selected order', async () => {
    const { view, router } = await render()
    const cards = view.get('[aria-label="Your orders"]').findAll('li')
    expect(cards).toHaveLength(2)
    expect(cards[0]!.text()).toContain('Pending')
    expect(cards[1]!.text()).toContain('Cancelled')
    await view.get('a[aria-label="View order #41"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/orders/41'))
    await flushPromises()
    expect(OrderService.getOrder).toHaveBeenCalledWith('41', expect.any(AbortSignal))
    expect(view.get('main h1').text()).toBe('Order details')
  })
  it('shows purchased snapshots, quantities, delivery and cash payment without a card notice', async () => {
    const { view } = await render('/orders/41')
    expect(view.get('[aria-label="Purchased items"]').text()).toContain('The Great Gatsby')
    expect(view.get('[aria-label="Purchased items"]').text()).toContain('2 × $19.95')
    expect(view.get('address').text()).toContain('123 Test Street')
    expect(view.get('aside').text()).toContain('$39.90')
    expect(view.get('aside').text()).toContain('Cash on delivery')
    expect(view.get('aside').text()).not.toContain('No real card payment')
  })
  it('keeps masked card details and the simulation notice for card orders', async () => {
    vi.mocked(OrderService.getOrder).mockResolvedValueOnce({
      ...placedOrder,
      status: 'COMPLETED',
      paymentType: 'SIMULATED_CARD',
      paymentDisplay: 'Visa **** 1234',
    })
    const { view } = await render('/orders/41')
    expect(view.get('aside').text()).toContain('Visa **** 1234')
    expect(view.get('aside').text()).toContain('No real card payment was processed.')
    expect(view.get('.order-status').text()).toBe('Completed')
  })
  it('offers browsing when no orders exist', async () => {
    vi.mocked(OrderService.getOrders).mockResolvedValueOnce([])
    const { view } = await render()
    expect(view.get('main').text()).toContain('No orders yet.')
    expect(view.find('[aria-label="Your orders"]').exists()).toBe(false)
    expect(view.get('.orders-empty a').attributes('href')).toBe('/products')
  })
})
