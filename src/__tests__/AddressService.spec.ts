import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { AxiosAdapter } from 'axios'
import { AddressService } from '@/services/AddressService'
import apiClient from '@/services/apiClient'
import type { Address, AddressPayload } from '@/types/address'
import { response } from './fixtures/catalog'

const originalAdapter = apiClient.defaults.adapter
const payload: AddressPayload = {
  label: 'Home',
  fullName: 'Reader',
  phone: null,
  addressLine: 'Street',
  city: null,
  province: null,
  postalCode: null,
  isDefault: true,
}
const saved: Address = {
  ...payload,
  id: 5,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

beforeEach(() => localStorage.clear())
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
  localStorage.clear()
})

it('uses authenticated address endpoints and unwraps DTO responses', async () => {
  localStorage.setItem('auth_token', 'test-token')
  const adapter = vi
    .fn<AxiosAdapter>()
    .mockResolvedValueOnce(response([saved]))
    .mockResolvedValueOnce(response(saved))
    .mockResolvedValueOnce(response(saved))
    .mockResolvedValueOnce(response(saved))
    .mockResolvedValueOnce(response(undefined))
  apiClient.defaults.adapter = adapter
  const controller = new AbortController()
  expect(await AddressService.getAddresses(controller.signal)).toEqual([saved])
  expect(await AddressService.addAddress(payload)).toEqual(saved)
  expect(await AddressService.updateAddress(5, payload)).toEqual(saved)
  expect(await AddressService.setDefault(5)).toEqual(saved)
  await AddressService.deleteAddress(5)
  expect(adapter.mock.calls.map(([config]) => [config.method, config.url])).toEqual([
    ['get', '/addresses'],
    ['post', '/addresses'],
    ['put', '/addresses/5'],
    ['put', '/addresses/5/default'],
    ['delete', '/addresses/5'],
  ])
  expect(adapter.mock.calls[0]?.[0].signal).toBe(controller.signal)
  for (const [config] of adapter.mock.calls)
    expect(config.headers.get('Authorization')).toBe('Bearer test-token')
  expect(JSON.parse(adapter.mock.calls[1]?.[0].data)).toEqual(payload)
})

it('passes HTTP failures to the address page', async () => {
  apiClient.defaults.adapter = vi.fn<AxiosAdapter>().mockRejectedValue(new Error('Offline'))
  await expect(AddressService.getAddresses()).rejects.toThrow('Offline')
  await expect(AddressService.deleteAddress(5)).rejects.toThrow('Offline')
})
