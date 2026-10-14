import { afterEach, expect, it, vi } from 'vitest'
import type { AxiosAdapter } from 'axios'
import apiClient from '@/services/apiClient'
import { CartService } from '@/services/CartService'
import { response } from './fixtures/catalog'
import { savedCart } from './fixtures/cart'

const originalAdapter = apiClient.defaults.adapter
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  localStorage.clear()
})
it('uses authenticated cart endpoints and sends quantity and format without client prices', async () => {
  localStorage.setItem('auth_token', 'test-token')
  const adapter = vi.fn<AxiosAdapter>().mockResolvedValue(response(savedCart()))
  apiClient.defaults.adapter = adapter
  const controller = new AbortController()
  const payload = { productId: 1, format: 'PAPERBACK' as const, quantity: 2 }
  expect(await CartService.getCart(controller.signal)).toEqual(savedCart())
  expect(await CartService.addItem(payload)).toEqual(savedCart())
  await CartService.updateQuantity(10, 3)
  await CartService.removeItem(10)
  expect(adapter.mock.calls.map(([config]) => [config.method, config.url])).toEqual([
    ['get', '/cart'],
    ['post', '/cart/items'],
    ['put', '/cart/items/10'],
    ['delete', '/cart/items/10'],
  ])
  expect(adapter.mock.calls[0]?.[0].signal).toBe(controller.signal)
  for (const [config] of adapter.mock.calls)
    expect(config.headers.get('Authorization')).toBe('Bearer test-token')
  expect(JSON.parse(adapter.mock.calls[1]?.[0].data)).toEqual(payload)
  expect(JSON.parse(adapter.mock.calls[2]?.[0].data)).toEqual({ quantity: 3 })
})
it('passes server failures back to the store', async () => {
  apiClient.defaults.adapter = vi.fn<AxiosAdapter>().mockRejectedValue(new Error('Offline'))
  await expect(CartService.getCart()).rejects.toThrow('Offline')
  await expect(CartService.removeItem(10)).rejects.toThrow('Offline')
})
