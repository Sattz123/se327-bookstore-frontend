import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { AxiosAdapter } from 'axios'
import { PaymentMethodService as service } from '@/services/PaymentMethodService'
import apiClient from '@/services/apiClient'
import type { PaymentMethod, PaymentMethodPayload } from '@/types/paymentMethod'
import { response } from './fixtures/catalog'

const originalAdapter = apiClient.defaults.adapter
const payload: PaymentMethodPayload = {
  provider: 'Visa',
  cardholderName: 'Demo Reader',
  lastFour: '1234',
  expiryMonth: 12,
  expiryYear: 2030,
  isDefault: true,
}
const saved: PaymentMethod = {
  id: 5,
  provider: 'Visa',
  cardholderName: 'Demo Reader',
  cardNumberMasked: '**** **** **** 1234',
  expiryMonth: 12,
  expiryYear: 2030,
  isDefault: true,
  createdAt: '2026-01-01T00:00:00Z',
}

beforeEach(() => localStorage.clear())
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  localStorage.clear()
})

it('uses authenticated endpoints and sends display metadata without an owner or full number', async () => {
  localStorage.setItem('auth_token', 'test-token')
  const adapter = vi
    .fn<AxiosAdapter>()
    .mockResolvedValueOnce(response([saved]))
    .mockResolvedValueOnce(response(saved))
    .mockResolvedValueOnce(response(saved))
    .mockResolvedValueOnce(response(undefined))
  apiClient.defaults.adapter = adapter
  const controller = new AbortController()
  expect(await service.getPaymentMethods(controller.signal)).toEqual([saved])
  expect(await service.addPaymentMethod(payload)).toEqual(saved)
  expect(await service.setDefault(5)).toEqual(saved)
  await service.deletePaymentMethod(5)
  expect(adapter.mock.calls.map(([config]) => [config.method, config.url])).toEqual([
    ['get', '/payment-methods'],
    ['post', '/payment-methods'],
    ['put', '/payment-methods/5/default'],
    ['delete', '/payment-methods/5'],
  ])
  expect(adapter.mock.calls[0]?.[0].signal).toBe(controller.signal)
  for (const [config] of adapter.mock.calls)
    expect(config.headers.get('Authorization')).toBe('Bearer test-token')
  expect(JSON.parse(adapter.mock.calls[1]?.[0].data)).toEqual(payload)
})

it('passes HTTP failures to the page', async () => {
  apiClient.defaults.adapter = vi.fn<AxiosAdapter>().mockRejectedValue(new Error('Offline'))
  await expect(service.getPaymentMethods()).rejects.toThrow('Offline')
  await expect(service.deletePaymentMethod(5)).rejects.toThrow('Offline')
})
