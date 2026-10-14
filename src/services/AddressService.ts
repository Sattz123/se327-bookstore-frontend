import apiClient from './apiClient'
import type { Address, AddressPayload } from '@/types/address'

export const AddressService = {
  async getAddresses(signal?: AbortSignal): Promise<Address[]> {
    return (await apiClient.get<Address[]>('/addresses', { signal })).data
  },
  async addAddress(payload: AddressPayload): Promise<Address> {
    return (await apiClient.post<Address>('/addresses', payload)).data
  },
  async updateAddress(id: number, payload: AddressPayload): Promise<Address> {
    return (await apiClient.put<Address>(`/addresses/${id}`, payload)).data
  },
  async setDefault(id: number): Promise<Address> {
    return (await apiClient.put<Address>(`/addresses/${id}/default`)).data
  },
  async deleteAddress(id: number): Promise<void> {
    await apiClient.delete(`/addresses/${id}`)
  },
}
