import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import { createBookstoreRouter } from '@/router'
import CategoryService from '@/services/CategoryService'

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

describe('bookstore layout and navigation', () => {
  let wrapper: VueWrapper | undefined
  let router: ReturnType<typeof createBookstoreRouter>

  beforeEach(() => {
    // jsdom has no visual viewport or scrolling implementation.
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  async function renderAt(path = '/') {
    router = createBookstoreRouter(createMemoryHistory())
    await router.push(path)
    await router.isReady()
    wrapper = mount(App, { global: { plugins: [router] } })
    await flushPromises()
    return wrapper
  }

  async function followLink(app: VueWrapper, selector: string, path: string) {
    await app.get(selector).trigger('click')
    // Lazy-loaded views may still be importing after the current promise queue drains.
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe(path))
    await flushPromises()
  }

  it('renders the home page inside the shared header and footer', async () => {
    const app = await renderAt()

    expect(app.get('main h1').text()).toBe('Find your next great read.')
    expect(app.get('header a[href="/"]').attributes('aria-label')).toBe('InwZa Bookstore home')
    expect(app.get('footer').text()).toContain('InwZa Bookstore.')
    expect(app.get('a[href="#main-content"]').text()).toBe('Skip to content')
    expect(app.get('main').attributes('id')).toBe('main-content')
    expect(document.title).toBe('Home | InwZa Bookstore')
  })

  it.each([
    ['/products', 'Books', 'Books'],
    ['/categories', 'Shop by category', 'Categories'],
    ['/contact', 'Contact the store', 'Contact'],
  ])('opens %s from the main navigation', async (path, heading, title) => {
    const app = await renderAt()

    await followLink(app, `nav[aria-label="Main navigation"] a[href="${path}"]`, path)

    expect(router.currentRoute.value.path).toBe(path)
    expect(app.get('main h1').text()).toBe(heading)
    if (path === '/contact') expect(app.find('main a[href^="mailto:"]').exists()).toBe(true)
    expect(document.title).toBe(`${title} | InwZa Bookstore`)
    expect(app.get(`header a[href="${path}"]`).attributes('aria-current')).toBe('page')
    expect(app.get('header a[href="/"]').attributes('aria-current')).toBeUndefined()
  })

  it('opens the books page from the home page button', async () => {
    const app = await renderAt()

    await followLink(app, 'main section a[href="/products"]', '/products')

    expect(app.get('main h1').text()).toBe('Books')
  })

  it('opens contact from the footer while retaining the shared layout', async () => {
    const app = await renderAt('/categories')

    await followLink(app, 'footer a[href="/contact"]', '/contact')

    expect(app.get('main h1').text()).toBe('Contact the store')
    expect(app.find('header').exists()).toBe(true)
    expect(app.find('footer').exists()).toBe(true)
  })

  it('renders the correct page on a direct visit', async () => {
    const app = await renderAt('/products')

    expect(app.get('main h1').text()).toBe('Books')
    expect(app.get('header a[href="/products"]').attributes('aria-current')).toBe('page')
  })

  it.each(['/missing-page', '/books/unknown/deep/path'])(
    'shows the 404 page for %s',
    async (path) => {
      const app = await renderAt(path)

      expect(app.get('main h1').text()).toBe('Page not found')
      expect(app.get('main').text()).toContain('404')
      expect(document.title).toBe('Page not found | InwZa Bookstore')
      expect(app.findAll('header a[aria-current="page"]')).toHaveLength(0)
    },
  )

  it('returns home using the not-found page link', async () => {
    const app = await renderAt('/missing-page')

    await followLink(app, 'main a[href="/"]', '/')

    expect(router.currentRoute.value.name).toBe('home')
    expect(app.get('main h1').text()).toBe('Find your next great read.')
  })

  it('returns home using the bookstore brand link', async () => {
    const app = await renderAt('/contact')

    await followLink(app, 'header > div > a', '/')

    expect(router.currentRoute.value.name).toBe('home')
    expect(app.get('main h1').text()).toBe('Find your next great read.')
  })

  it('submits the header search and trims its query', async () => {
    const app = await renderAt('/contact')
    await app.get('#header-search').setValue('  Clean Code  ')
    await app.get('form[aria-label="Search the bookstore"]').trigger('submit')
    await vi.waitFor(() =>
      expect(router.currentRoute.value.fullPath).toBe('/products?q=Clean+Code'),
    )
    await flushPromises()
    expect(app.get<HTMLInputElement>('#book-search').element.value).toBe('Clean Code')
  })

  it('loads category links on demand and closes the dropdown with Escape', async () => {
    const app = await renderAt('/contact')
    const getCategories = vi.mocked(CategoryService.getCategories)
    getCategories.mockClear()
    getCategories.mockResolvedValueOnce({
      data: [{ id: 7, name: 'Travel', imageUrl: null }],
    } as Awaited<ReturnType<typeof CategoryService.getCategories>>)
    const dropdown = app.get<HTMLDetailsElement>('header nav details')
    expect(getCategories).not.toHaveBeenCalled()
    await dropdown.get('summary').trigger('click')
    await flushPromises()
    await vi.waitFor(() => expect(getCategories).toHaveBeenCalledOnce())
    await flushPromises()
    expect(dropdown.get('a[href="/categories/7"]').text()).toBe('Travel')
    await dropdown.get('summary').trigger('keydown', { key: 'Escape' })
    expect(dropdown.element.open).toBe(false)
  })
})
