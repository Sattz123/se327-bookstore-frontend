import { afterEach, expect, it, vi } from 'vitest'
import type { AxiosAdapter } from 'axios'
import apiClient from '@/services/apiClient'
import { CheckoutService } from '@/services/CheckoutService'
import { response } from './fixtures/catalog'
import { checkoutReview, placedOrder } from './fixtures/checkout'

const originalAdapter = apiClient.defaults.adapter
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  localStorage.clear()
})
it('uses authenticated checkout endpoints without sending prices or an owner ID', async () => {
  localStorage.setItem('auth_token', 'test-token')
  const adapter = vi
    .fn<AxiosAdapter>()
    .mockResolvedValueOnce(response(checkoutReview))
    .mockResolvedValueOnce(response(placedOrder))
    .mockResolvedValueOnce(response(placedOrder))
  apiClient.defaults.adapter = adapter
  const controller = new AbortController()
  const payload = {
    addressId: 10,
    paymentType: 'CASH_ON_DELIVERY' as const,
    paymentMethodId: null,
    checkoutKey: '00000000-0000-4000-8000-000000000001',
    cartFingerprint: 'a'.repeat(64),
  }
  expect(await CheckoutService.review(controller.signal)).toEqual(checkoutReview)
  expect(await CheckoutService.placeOrder(payload)).toEqual(placedOrder)
  expect(await CheckoutService.confirmation('41', controller.signal)).toEqual(placedOrder)
  expect(adapter.mock.calls.map(([config]) => [config.method, config.url])).toEqual([
    ['get', '/checkout/review'],
    ['post', '/checkout'],
    ['get', '/checkout/orders/41'],
  ])
  for (const [config] of adapter.mock.calls)
    expect(config.headers.get('Authorization')).toBe('Bearer test-token')
  expect(JSON.parse(adapter.mock.calls[1]![0].data)).toEqual(payload)
  expect(adapter.mock.calls[2]![0].signal).toBe(controller.signal)
})
it('propagates checkout conflicts to the page', async () => {
  apiClient.defaults.adapter = vi.fn<AxiosAdapter>().mockRejectedValue(new Error('Conflict'))
  await expect(CheckoutService.review()).rejects.toThrow('Conflict')
})
