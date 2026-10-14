import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import type { AxiosResponse } from 'axios'
import App from '@/App.vue'
import { createBookstoreRouter } from '@/router'
import ProductService from '@/services/ProductService'
import CategoryService from '@/services/CategoryService'
import type { Product, ProductPage } from '@/types/catalog'
import { book, deferred, response, page } from './fixtures/catalog'

vi.mock('@/services/ProductService', () => ({
  default: { getProducts: vi.fn(), getProduct: vi.fn() },
}))

vi.mock('@/services/CategoryService', () => ({
  default: {
    getCategories: vi
      .fn()
      .mockResolvedValue({ data: [{ id: 1, name: 'Fiction', imageUrl: null }] }),
  },
}))

describe('product catalog pages', () => {
  let wrapper: VueWrapper | undefined
  let router: ReturnType<typeof createBookstoreRouter>
  const getProducts = vi.mocked(ProductService.getProducts)
  const getProduct = vi.mocked(ProductService.getProduct)

  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    getProducts.mockResolvedValue(response(page([book()])))
    getProduct.mockResolvedValue(response(book()))
    vi.mocked(CategoryService.getCategories).mockResolvedValue(response([book().category]))
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  async function renderAt(path: string) {
    router = createBookstoreRouter(createMemoryHistory())
    await router.push(path)
    await router.isReady()
    wrapper = mount(App, { global: { plugins: [router] } })
    await flushPromises()
    return wrapper
  }

  it('shows loading before rendering cards from the API', async () => {
    const pending = deferred<AxiosResponse<ProductPage>>()
    getProducts.mockReturnValueOnce(pending.promise)
    const app = await renderAt('/products')
    expect(app.get('[role="status"]').text()).toBe('Loading books…')
    expect(app.get('section').attributes('aria-busy')).toBe('true')

    pending.resolve(
      response(page([book(), book({ id: 2, name: 'Second book', stockQuantity: 0 })])),
    )
    await flushPromises()
    expect(app.findAll('article')).toHaveLength(2)
    expect(app.get('main').text()).toContain('2 books found')
    expect(app.get('main').text()).toContain('$18.00')
    expect(app.get('main').text()).toContain('F. Scott Fitzgerald')
    expect(app.get('main').text()).toContain('Out of stock')
    expect(app.get('section').attributes('aria-busy')).toBe('false')
  })

  it('shows an empty catalog without rendering book cards', async () => {
    getProducts.mockResolvedValueOnce(response(page()))
    const app = await renderAt('/products')
    expect(app.get('[role="status"]').text()).toContain('No books match these filters')
    expect(app.findAll('article')).toHaveLength(0)
  })

  it('allows retrying a failed catalog request', async () => {
    getProducts.mockRejectedValueOnce(new Error('Network unavailable'))
    const app = await renderAt('/products')
    expect(app.get('[role="alert"]').text()).toContain("We couldn't load the books")

    await app.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(app.find('[role="alert"]').exists()).toBe(false)
    expect(app.get('article h2').text()).toBe('The Great Gatsby')
    expect(getProducts).toHaveBeenCalledTimes(2)
  })

  it('opens the selected book from a catalog card', async () => {
    const app = await renderAt('/products')
    await app.get('article a').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/products/1'))
    await flushPromises()
    expect(app.get('main h1').text()).toBe('The Great Gatsby')
    expect(getProduct).toHaveBeenCalledWith('1', expect.any(AbortSignal))
  })

  it('loads a direct detail URL and displays all book information', async () => {
    const pending = deferred<AxiosResponse<Product>>()
    getProduct.mockReturnValueOnce(pending.promise)
    const app = await renderAt('/products/1')
    expect(app.get('[role="status"]').text()).toBe('Loading book…')

    pending.resolve(response(book()))
    await flushPromises()
    const text = app.get('main').text()
    expect(app.get('main h1').text()).toBe('The Great Gatsby')
    for (const detail of [
      'Fiction',
      'F. Scott Fitzgerald',
      '$18.00',
      '7 copies available',
      'Jazz Age',
      'Paperback',
      'E-book',
    ]) {
      expect(text).toContain(detail)
    }
    expect(app.get('main img').attributes('src')).toMatch(/\/images\/front\.png$/)
    expect(document.title).toBe('Book details | InwZa Bookstore')
  })

  it('shows a missing-book message for an API 404', async () => {
    getProduct.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
    const app = await renderAt('/products/999')
    expect(app.get('main h1').text()).toBe('Book not found')
    expect(app.get('[role="alert"]').text()).toContain('unavailable or no longer listed')
    expect(app.find('main button').exists()).toBe(false)
    await app.get('main a[href="/products"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/products'))
  })

  it.each(['abc', '0', '-1'])('handles invalid detail ID %s without a request', async (id) => {
    const app = await renderAt(`/products/${id}`)
    expect(app.get('main h1').text()).toBe('Book not found')
    expect(getProduct).not.toHaveBeenCalled()
  })

  it('allows retrying a failed detail request', async () => {
    getProduct.mockRejectedValueOnce({ isAxiosError: true, response: { status: 500 } })
    const app = await renderAt('/products/1')
    expect(app.get('main h1').text()).toBe('Unable to load book')
    await app.get('main button').trigger('click')
    await flushPromises()
    expect(app.get('main h1').text()).toBe('The Great Gatsby')
    expect(getProduct).toHaveBeenCalledTimes(2)
  })

  it('handles missing optional details, no cover, and zero stock', async () => {
    getProduct.mockResolvedValueOnce(
      response(
        book({ author: null, description: null, images: [], formats: [], stockQuantity: 0 }),
      ),
    )
    const app = await renderAt('/products/1')
    for (const fallback of [
      'Unknown author',
      'No description available.',
      'Cover unavailable',
      'No formats listed.',
      'Out of stock',
    ]) {
      expect(app.get('main').text()).toContain(fallback)
    }
    expect(app.find('main img').exists()).toBe(false)
  })

  it('switches covers and falls back when an image fails', async () => {
    getProduct.mockResolvedValueOnce(
      response(book({ images: ['/images/front.png', '/images/back.png'] })),
    )
    const app = await renderAt('/products/1')
    expect(app.get('button[aria-label="View cover 1"]').attributes('aria-pressed')).toBe('true')
    await app.get('button[aria-label="View cover 2"]').trigger('click')
    expect(app.get('main img').attributes('src')).toMatch(/\/images\/back\.png$/)
    await app.get('main img').trigger('error')
    expect(app.get('main').text()).toContain('Cover unavailable')
    await app.get('button[aria-label="View cover 1"]').trigger('click')
    expect(app.get('main img').attributes('src')).toMatch(/\/images\/front\.png$/)
  })

  it('does not let a delayed response overwrite the next route', async () => {
    const pending = deferred<AxiosResponse<Product>>()
    getProduct.mockReturnValueOnce(pending.promise)
    const app = await renderAt('/products/1')
    const firstSignal = getProduct.mock.calls[0]?.[1]
    getProduct.mockResolvedValueOnce(response(book({ id: 2, name: 'Second book' })))

    await router.push('/products/2')
    await flushPromises()
    expect(firstSignal?.aborted).toBe(true)
    expect(app.get('main h1').text()).toBe('Second book')
    pending.resolve(response(book()))
    await flushPromises()
    expect(app.get('main h1').text()).toBe('Second book')
  })

  it('cancels an unfinished catalog request when leaving the page', async () => {
    getProducts.mockReturnValueOnce(deferred<AxiosResponse<ProductPage>>().promise)
    await renderAt('/products')
    const signal = getProducts.mock.calls[0]?.[1]
    await router.push('/contact')
    await flushPromises()
    expect(signal?.aborted).toBe(true)
  })
})
