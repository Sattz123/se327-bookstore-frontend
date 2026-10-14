import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import type { AxiosResponse } from 'axios'
import App from '@/App.vue'
import { createBookstoreRouter } from '@/router'
import ProductService from '@/services/ProductService'
import CategoryService from '@/services/CategoryService'
import type { ProductPage } from '@/types/catalog'
import { book, deferred, page, response } from './fixtures/catalog'

vi.mock('@/services/ProductService', () => ({
  default: { getProducts: vi.fn(), getProduct: vi.fn(), getFeaturedProducts: vi.fn() },
}))
vi.mock('@/services/CategoryService', () => ({ default: { getCategories: vi.fn() } }))

describe('catalog discovery', () => {
  let wrapper: VueWrapper | undefined
  let router: ReturnType<typeof createBookstoreRouter>
  const products = vi.mocked(ProductService.getProducts)
  const featured = vi.mocked(ProductService.getFeaturedProducts)
  const categories = vi.mocked(CategoryService.getCategories)
  const topics = [book().category, { id: 2, name: 'Science', imageUrl: null }]

  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    products.mockResolvedValue(response(page([book()])))
    featured.mockResolvedValue(response([book()]))
    categories.mockResolvedValue(response(topics))
    vi.mocked(ProductService.getProduct).mockResolvedValue(response(book()))
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

  it('shows featured books and opens a home-page category', async () => {
    featured.mockResolvedValueOnce(
      response(Array.from({ length: 8 }, (_, i) => book({ id: i + 1 }))),
    )
    const app = await renderAt('/')
    expect(app.get('ul[aria-label="Featured books"]').findAll('article')).toHaveLength(8)
    expect(app.get('ul[aria-label="Book categories"]').findAll('a')).toHaveLength(2)
    await app.get('a[href="/categories/2"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/categories/2'))
    await flushPromises()
    expect(app.get('main h1').text()).toBe('Science')
    expect(products).toHaveBeenLastCalledWith(
      { q: undefined, categoryId: '2', page: 1 },
      expect.any(AbortSignal),
    )
  })

  it('handles empty home sections', async () => {
    featured.mockResolvedValueOnce(response([]))
    categories.mockResolvedValueOnce(response([]))
    const app = await renderAt('/')
    expect(app.get('main').text()).toContain('No books available yet.')
    expect(app.get('main').text()).toContain('No categories available yet.')
  })

  it('shows home loading and permits retry after a failed request', async () => {
    const pending = deferred<AxiosResponse<ReturnType<typeof book>[]>>()
    featured.mockReturnValueOnce(pending.promise)
    const app = await renderAt('/')
    expect(app.get('[role="status"]').text()).toContain('Loading the latest books')
    pending.resolve(response([book()]))
    await flushPromises()
    expect(app.find('ul[aria-label="Featured books"]').exists()).toBe(true)
    await router.push('/contact')
    featured.mockRejectedValueOnce(new Error('Offline'))
    await router.push('/')
    await flushPromises()
    expect(app.get('[role="alert"]').text()).toContain("We couldn't load the books")
    await app.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(app.find('[role="alert"]').exists()).toBe(false)
  })

  it('lists returned categories without inventing hidden categories', async () => {
    const app = await renderAt('/categories')
    expect(app.get('main h1').text()).toBe('Shop by category')
    expect(
      app
        .get('.category-collection')
        .findAll('a')
        .map((link) => link.attributes('href')),
    ).toEqual(['/categories/1', '/categories/2'])
    expect(app.find('a[href="/categories/99"]').exists()).toBe(false)
  })

  it('handles an empty category list', async () => {
    categories.mockResolvedValueOnce(response([]))
    const app = await renderAt('/categories')
    expect(app.get('[role="status"]').text()).toBe('No categories available yet.')
  })

  it('shows category loading and retries an error', async () => {
    const pending = deferred<AxiosResponse<typeof topics>>()
    categories.mockReturnValueOnce(pending.promise)
    const app = await renderAt('/categories')
    expect(app.get('[role="status"]').text()).toBe('Loading categories…')
    pending.resolve(response(topics))
    await flushPromises()
    await router.push('/contact')
    categories.mockRejectedValueOnce(new Error('Offline'))
    await router.push('/categories')
    await flushPromises()
    expect(app.get('[role="alert"]').text()).toContain("We couldn't load the categories")
    await app.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(app.get('.category-collection').findAll('a')).toHaveLength(2)
  })

  it('restores combined search, category, and page from a direct URL', async () => {
    products.mockResolvedValueOnce(
      response(page([book()], { page: 2, totalElements: 20, totalPages: 2 })),
    )
    const app = await renderAt('/products?q=space&categoryId=2&page=2')
    expect((app.get('#book-search').element as HTMLInputElement).value).toBe('space')
    expect((app.get('#category-filter').element as HTMLSelectElement).value).toBe('2')
    expect(products).toHaveBeenCalledWith(
      { q: 'space', categoryId: '2', page: 2 },
      expect.any(AbortSignal),
    )
    expect(app.get('nav[aria-label="Book pages"]').text()).toContain('Page 2 of 2')
  })

  it('updates the URL and resets the page when submitting new filters', async () => {
    const app = await renderAt('/products?page=3')
    await app.get('#book-search').setValue('  space  ')
    await app.get('#category-filter').setValue('2')
    await app.get('form[aria-label="Search books"]').trigger('submit')
    await vi.waitFor(() =>
      expect(router.currentRoute.value.query).toEqual({ q: 'space', categoryId: '2' }),
    )
    await flushPromises()
    expect(products).toHaveBeenLastCalledWith(
      { q: 'space', categoryId: '2', page: 1 },
      expect.any(AbortSignal),
    )
    router.back()
    await vi.waitFor(() => expect(router.currentRoute.value.query.page).toBe('3'))
    await flushPromises()
    expect((app.get('#book-search').element as HTMLInputElement).value).toBe('')
  })

  it('preserves filters when moving forward and backward between pages', async () => {
    products.mockImplementation(async (query) =>
      response(page([book()], { page: query?.page ?? 1, totalElements: 40, totalPages: 3 })),
    )
    const app = await renderAt('/products?q=space&categoryId=2&page=2')
    await app.get('nav[aria-label="Book pages"] a[href$="page=3"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.query.page).toBe('3'))
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ q: 'space', categoryId: '2', page: '3' })
    expect(app.find('nav[aria-label="Book pages"] a[aria-label="Next page"]').exists()).toBe(false)
    await app.get('nav[aria-label="Book pages"] a').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.query.page).toBe('2'))
    await flushPromises()
    expect(products).toHaveBeenLastCalledWith(
      { q: 'space', categoryId: '2', page: 2 },
      expect.any(AbortSignal),
    )
  })

  it('centers numbered links, marks the current page and preserves filters when jumping', async () => {
    products.mockImplementation(async (query) =>
      response(page([book()], { page: query?.page ?? 1, totalElements: 320, totalPages: 20 })),
    )
    const app = await renderAt('/products?q=space&categoryId=2&page=10')
    const pagination = app.get('nav[aria-label="Book pages"]')
    expect(pagination.get('[aria-current="page"]').text()).toBe('10')
    expect(pagination.findAll('[aria-current="page"]')).toHaveLength(1)
    expect(pagination.get('ol').findAll('li').length).toBeLessThanOrEqual(7)
    expect(pagination.get('ol').text()).toContain('…')
    await pagination.get('a[aria-label="Page 11"]').trigger('click')
    await vi.waitFor(() =>
      expect(router.currentRoute.value.query).toEqual({ q: 'space', categoryId: '2', page: '11' }),
    )
  })

  it('keeps Previous and Next in place but disables unavailable directions', async () => {
    products.mockImplementation(async (query) =>
      response(page([book()], { page: query?.page ?? 1, totalElements: 32, totalPages: 2 })),
    )
    const app = await renderAt('/products')
    expect(app.get('.catalog-page-previous').attributes('aria-disabled')).toBe('true')
    await app.get('a[aria-label="Next page"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.query.page).toBe('2'))
    await flushPromises()
    expect(app.get('.catalog-page-next').attributes('aria-disabled')).toBe('true')
    expect(app.find('a[aria-label="Previous page"]').exists()).toBe(true)
  })

  it('keeps category-page search in the URL and opens book details', async () => {
    const app = await renderAt('/categories/2?page=2')
    await app.get('#book-search').setValue('science')
    await app.get('form[aria-label="Search books"]').trigger('submit')
    await vi.waitFor(() =>
      expect(router.currentRoute.value.fullPath).toBe('/categories/2?q=science'),
    )
    await flushPromises()
    expect(app.get('main h1').text()).toBe('Science')
    await app.get('article a').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/products/1'))
    await flushPromises()
    expect(app.get('main h1').text()).toBe('The Great Gatsby')
  })

  it('switches category filters from a category page', async () => {
    const app = await renderAt('/categories/1')
    await app.get('#category-filter').setValue('2')
    await app.get('form[aria-label="Search books"]').trigger('submit')
    await vi.waitFor(() =>
      expect(router.currentRoute.value.fullPath).toBe('/products?categoryId=2'),
    )
    await flushPromises()
    expect(products).toHaveBeenLastCalledWith(
      { q: undefined, categoryId: '2', page: 1 },
      expect.any(AbortSignal),
    )
  })

  it('shows no matching results without pagination controls', async () => {
    products.mockResolvedValueOnce(response(page()))
    const app = await renderAt('/products?q=unmatched&categoryId=2')
    expect(app.get('main').text()).toContain('0 books found')
    expect(app.get('[role="status"]').text()).toContain('No books match these filters')
    expect(app.find('nav[aria-label="Book pages"]').exists()).toBe(false)
  })

  it('offers the first filtered page when the requested page is beyond the last', async () => {
    products.mockResolvedValueOnce(
      response(page([], { page: 99, totalElements: 20, totalPages: 2 })),
    )
    const app = await renderAt('/products?q=space&categoryId=2&page=99')
    expect(app.get('main').text()).toContain('No books on this page.')
    expect(app.get('[role="status"] a').attributes('href')).toBe('/products?q=space&categoryId=2')
  })

  it.each([
    'page=0',
    'page=-1',
    'page=abc',
    'page=1.5',
    'page=1000001',
    'page=2&page=3',
    'categoryId=0',
    'categoryId=abc',
    'q=a&q=b',
  ])('handles invalid URL parameters %s without requesting books', async (query) => {
    const app = await renderAt(`/products?${query}`)
    expect(app.get('[role="alert"]').text()).toContain('page or filters are invalid')
    expect(products).not.toHaveBeenCalled()
    expect(app.find('a[href="/products"]').exists()).toBe(true)
  })

  it('shows a missing-category state when the server rejects a hidden category', async () => {
    products.mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })
    const app = await renderAt('/categories/99')
    expect(app.get('main h1').text()).toBe('Category not found')
    expect(app.get('[role="alert"]').text()).toContain('unavailable or no longer listed')
    expect(app.findAll('article')).toHaveLength(0)
  })

  it('ignores a delayed result from a previous search', async () => {
    const pending = deferred<AxiosResponse<ProductPage>>()
    products.mockReturnValueOnce(pending.promise)
    const app = await renderAt('/products?q=first')
    const oldSignal = products.mock.calls[0]?.[1]
    products.mockResolvedValueOnce(response(page([book({ name: 'Second result' })])))
    await router.push('/products?q=second')
    await flushPromises()
    expect(oldSignal?.aborted).toBe(true)
    pending.resolve(response(page([book({ name: 'Old result' })])))
    await flushPromises()
    expect(app.get('article').text()).toContain('Second result')
    expect(app.get('main').text()).not.toContain('Old result')
  })
})
