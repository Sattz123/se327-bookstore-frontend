import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AxiosAdapter } from 'axios'
import ProductService from '@/services/ProductService'
import CategoryService from '@/services/CategoryService'
import apiClient from '@/services/apiClient'
import { formatLabels, formatPrice, resolveImageUrl } from '@/utils/catalog'
import { book, response, page } from './fixtures/catalog'

const originalAdapter = apiClient.defaults.adapter

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
})

describe('catalog HTTP service', () => {
  it('passes search, category, and page together to the paginated endpoint', async () => {
    const adapter = vi
      .fn<AxiosAdapter>()
      .mockResolvedValue(response(page([book()], { page: 2, totalElements: 20, totalPages: 2 })))
    apiClient.defaults.adapter = adapter
    const result = await ProductService.getProducts({ q: 'space', categoryId: '2', page: 2 })
    expect(adapter.mock.calls[0]?.[0].params).toEqual({ q: 'space', categoryId: '2', page: 2 })
    expect(result.data.totalElements).toBe(20)
  })

  it('requests featured books and visible categories', async () => {
    const adapter = vi
      .fn<AxiosAdapter>()
      .mockResolvedValueOnce(response([book()]))
      .mockResolvedValueOnce(response([book().category]))
    apiClient.defaults.adapter = adapter
    const controller = new AbortController()
    expect((await ProductService.getFeaturedProducts(controller.signal)).data).toHaveLength(1)
    expect((await CategoryService.getCategories(controller.signal)).data[0]?.name).toBe('Fiction')
    expect(
      adapter.mock.calls.map(([config]) => [config.method, config.url, config.signal]),
    ).toEqual([
      ['get', '/products/featured', controller.signal],
      ['get', '/categories', controller.signal],
    ])
  })
  it('requests the list as JSON and forwards cancellation', async () => {
    const adapter = vi.fn<AxiosAdapter>().mockResolvedValue(response(page([book()])))
    apiClient.defaults.adapter = adapter
    const controller = new AbortController()
    const result = await ProductService.getProducts({}, controller.signal)

    expect(result.data.content[0]?.name).toBe('The Great Gatsby')
    expect(adapter).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'get',
        url: '/products',
        signal: controller.signal,
      }),
    )
    expect(adapter.mock.calls[0]?.[0].headers.get('Accept')).toBe('application/json')
  })

  it('requests a detail and safely encodes the ID path segment', async () => {
    const adapter = vi.fn<AxiosAdapter>().mockResolvedValue(response(book()))
    apiClient.defaults.adapter = adapter
    expect((await ProductService.getProduct('1')).data.id).toBe(1)
    await ProductService.getProduct('a/b')
    expect(adapter.mock.calls[0]?.[0].url).toBe('/products/1')
    expect(adapter.mock.calls[1]?.[0].url).toBe('/products/a%2Fb')
  })

  it('passes request failures to the views for their error states', async () => {
    apiClient.defaults.adapter = vi
      .fn<AxiosAdapter>()
      .mockRejectedValue(new Error('Network unavailable'))
    await expect(ProductService.getProducts()).rejects.toThrow('Network unavailable')
    await expect(ProductService.getProduct('1')).rejects.toThrow('Network unavailable')
  })
})

describe('catalog display helpers', () => {
  it('resolves cover paths against the backend origin', () => {
    const backendOrigin = new URL(apiClient.defaults.baseURL ?? '/api', window.location.origin)
      .origin
    expect(resolveImageUrl('/images/front.png')).toBe(`${backendOrigin}/images/front.png`)
    expect(resolveImageUrl('https://example.com/cover.png')).toBe('https://example.com/cover.png')
  })

  it.each([
    undefined,
    '',
    '   ',
    'javascript:alert(1)',
    'data:image/png;base64,a',
    'http://[broken',
  ])('uses the fallback for an unusable image URL %s', (image) => {
    expect(resolveImageUrl(image)).toBeNull()
  })

  it('formats prices and all supported book formats', () => {
    expect(formatPrice(19.99)).toBe('$19.99')
    expect(formatPrice(0)).toBe('$0.00')
    expect(Object.values(formatLabels)).toEqual(['Paperback', 'Hardcover', 'E-book', 'Audiobook'])
  })
})
