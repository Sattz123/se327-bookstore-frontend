import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import { createBookstoreRouter } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { CartService } from '@/services/CartService'
import ProductService from '@/services/ProductService'
import type { Cart } from '@/types/cart'
import { book, deferred, response } from './fixtures/catalog'
import { cartReader, cartLine, savedCart } from './fixtures/cart'

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
  default: { getProduct: vi.fn(), getFeaturedProducts: vi.fn().mockResolvedValue([]) },
}))
vi.mock('@/services/CategoryService', () => ({
  default: { getCategories: vi.fn().mockResolvedValue([]) },
}))

describe('shopping cart flow', () => {
  let wrapper: VueWrapper | undefined
  let pinia: ReturnType<typeof createPinia>
  let router: ReturnType<typeof createBookstoreRouter>
  const service = vi.mocked(CartService)
  beforeEach(() => {
    vi.clearAllMocks()
    for (const method of Object.values(service)) method.mockReset()
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    useAuthStore().setAuth({ token: 'test-token', user: cartReader })
    service.getCart.mockResolvedValue(savedCart())
    service.addItem.mockResolvedValue(savedCart())
    service.updateQuantity.mockResolvedValue(savedCart())
    service.removeItem.mockResolvedValue(savedCart([]))
    vi.mocked(ProductService.getProduct).mockResolvedValue(response(book()))
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })
  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    disposePinia(pinia)
    localStorage.clear()
  })
  async function render(path = '/cart') {
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

  it('protects the cart and keeps the login return URL', async () => {
    useAuthStore().clearAuth()
    await render()
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/cart')
    expect(service.getCart).not.toHaveBeenCalled()
  })
  it('sends guests adding a book to login without creating an item', async () => {
    useAuthStore().clearAuth()
    const app = await render('/products/1')
    await app.get('form[aria-label="Add book to cart"]').trigger('submit')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/products/1')
    expect(service.addItem).not.toHaveBeenCalled()
  })
  it('adds the selected format and quantity and updates the header count', async () => {
    const app = await render('/products/1')
    await app.get('#cart-format').setValue('EBOOK')
    await app.get('#cart-quantity').setValue(3)
    service.addItem.mockResolvedValueOnce(
      savedCart([{ ...cartLine, format: 'EBOOK', quantity: 3, lineTotal: 59.85 }]),
    )
    await app.get('form[aria-label="Add book to cart"]').trigger('submit')
    await flushPromises()
    expect(service.addItem).toHaveBeenCalledWith({ productId: 1, format: 'EBOOK', quantity: 3 })
    expect(app.get('header a[href="/cart"]').text()).toBe('Cart 3')
    expect(app.get('main').text()).toContain('Added to cart.')
    await app.get('main a[href="/cart"]').trigger('click')
    await flushPromises()
    expect(app.get('main').text()).toContain('E-book')
  })
  it.each([0, -1, 1.5, 8])('rejects invalid requested quantity %s', async (quantity) => {
    const app = await render('/products/1')
    await app.get('#cart-quantity').setValue(quantity)
    await app.get('form[aria-label="Add book to cart"]').trigger('submit')
    await flushPromises()
    expect(service.addItem).not.toHaveBeenCalled()
    expect(app.get('[role="alert"]').text()).toContain('whole quantity')
  })
  it('disables adding out-of-stock books', async () => {
    vi.mocked(ProductService.getProduct).mockResolvedValueOnce(response(book({ stockQuantity: 0 })))
    const app = await render('/products/1')
    expect(
      app.get('form[aria-label="Add book to cart"] fieldset').attributes('disabled'),
    ).toBeDefined()
    expect(app.get('main').text()).toContain('currently unavailable to add')
    expect(service.addItem).not.toHaveBeenCalled()
  })
  it('shows loading, an empty cart and a browse link', async () => {
    const pending = deferred<Cart>()
    service.getCart.mockReturnValueOnce(pending.promise)
    const app = await render()
    expect(app.get('main').text()).toContain('Loading cart')
    pending.resolve(savedCart([]))
    await flushPromises()
    expect(app.get('main').text()).toContain('Your cart is empty')
    expect(app.get('main a[href="/products"]').text()).toBe('Browse books')
  })
  it('shows saved formats and uses totals returned by the server', async () => {
    service.getCart.mockResolvedValue(
      savedCart([
        cartLine,
        { ...cartLine, id: 20, format: 'HARDCOVER', quantity: 1, lineTotal: 19.95 },
      ]),
    )
    const app = await render()
    expect(app.findAll('article')).toHaveLength(2)
    expect(app.get('main').text()).toContain('Paperback')
    expect(app.get('main').text()).toContain('Hardcover')
    expect(app.get('main').text()).toContain('Total: $59.85')
    expect(app.get('header a[href="/cart"]').text()).toBe('Cart 3')
  })
  it('retries a failed cart load', async () => {
    service.getCart.mockRejectedValue(new Error('Offline'))
    const app = await render()
    expect(app.get('[role="alert"]').text()).toContain('Please try again')
    service.getCart.mockResolvedValueOnce(savedCart())
    await click('Try again')
    expect(app.findAll('article')).toHaveLength(1)
  })
  it('updates quantities and displays server totals', async () => {
    const app = await render()
    await app.get('#quantity-10').setValue(3)
    service.updateQuantity.mockResolvedValueOnce(
      savedCart([{ ...cartLine, quantity: 3, lineTotal: 59.85 }]),
    )
    await app.get('article form').trigger('submit')
    await flushPromises()
    expect(service.updateQuantity).toHaveBeenCalledWith(10, 3)
    expect(app.get('main').text()).toContain('Total: $59.85')
    expect(app.get('main').text()).toContain('Cart updated.')
  })
  it('keeps the draft and saved totals after a stock conflict', async () => {
    service.updateQuantity.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 409,
        data: { detail: 'Requested quantity exceeds available stock across all formats.' },
      },
    })
    const app = await render()
    await app.get('#quantity-10').setValue(8)
    await app.get('article form').trigger('submit')
    await flushPromises()
    expect(app.get('[role="alert"]').text()).toContain('exceeds available stock')
    expect((app.get('#quantity-10').element as HTMLInputElement).value).toBe('8')
    expect(app.get('main').text()).toContain('Total: $39.90')
  })
  it('rejects nonpositive cart edits before calling the server', async () => {
    const app = await render()
    await app.get('#quantity-10').setValue(0)
    await app.get('article form').trigger('submit')
    await flushPromises()
    expect(service.updateQuantity).not.toHaveBeenCalled()
    expect(app.get('[role="alert"]').text()).toContain('positive whole number')
  })
  it('shows stale availability and permits removing the item', async () => {
    service.getCart.mockResolvedValue(
      savedCart([{ ...cartLine, available: false, stockQuantity: 0 }]),
    )
    const app = await render()
    expect(app.get('main').text()).toContain('unavailable or exceeds current stock')
    await click('Remove')
    expect(service.removeItem).toHaveBeenCalledWith(10)
    expect(app.get('main').text()).toContain('Your cart is empty')
    expect(app.get('header a[href="/cart"]').text()).toBe('Cart 0')
  })
  it('redirects after logout and clears private cart rows', async () => {
    const app = await render()
    useAuthStore().clearAuth()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/login')
    expect(app.findAll('article')).toHaveLength(0)
  })
})
