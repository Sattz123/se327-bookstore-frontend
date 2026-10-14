import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { OrderService } from '@/services/OrderService'
import { ProfileService } from '@/services/ProfileService'
import { WishlistService } from '@/services/WishlistService'
import apiClient from '@/services/apiClient'
import FaqView from '@/views/FaqView.vue'
import StoreInformationView from '@/views/StoreInformationView.vue'
import ComingSoonView from '@/views/ComingSoonView.vue'
import ForbiddenView from '@/views/ForbiddenView.vue'

vi.mock('@/services/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('Services direct coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('OrderService calls getOrders and getOrder', async () => {
    const ordersMock = [{ id: 'ord-1', status: 'PENDING', total: 100 }]
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: ordersMock })
    const orders = await OrderService.getOrders()
    expect(orders).toEqual(ordersMock)
    expect(apiClient.get).toHaveBeenCalledWith('/orders', { signal: undefined })

    const orderDetailMock = { id: 'ord-1', status: 'COMPLETED', total: 100 }
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: orderDetailMock })
    const order = await OrderService.getOrder('ord-1')
    expect(order).toEqual(orderDetailMock)
    expect(apiClient.get).toHaveBeenCalledWith('/orders/ord-1', { signal: undefined })
  })

  it('ProfileService calls profile endpoints', async () => {
    const userMock = { id: 1, email: 'test@example.com', username: 'tester', role: 'CUSTOMER' }
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: userMock })
    const user = await ProfileService.getProfile()
    expect(user).toEqual(userMock)

    const updatedUserMock = { token: 'new-token', user: { ...userMock, displayName: 'New Name' } }
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: updatedUserMock })
    const updateRes = await ProfileService.updateProfile({
      username: 'tester',
      email: 'test@example.com',
    })
    expect(updateRes).toEqual(updatedUserMock)

    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { message: 'Password updated' } })
    const pwdRes = await ProfileService.changePassword({
      currentPassword: 'old',
      newPassword: 'new',
    })
    expect(pwdRes.message).toBe('Password updated')
  })

  it('WishlistService calls wishlist endpoints', async () => {
    const itemsMock = [{ id: 1, product: { id: 10, name: 'Book 1' } }]
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: itemsMock })
    const items = await WishlistService.getWishlist()
    expect(items).toEqual(itemsMock)

    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: itemsMock[0] })
    const added = await WishlistService.addToWishlist({ productId: 10 })
    expect(added).toEqual(itemsMock[0])

    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: null })
    await WishlistService.removeFromWishlist(10)
    expect(apiClient.delete).toHaveBeenCalledWith('/wishlist/10')
  })
})

import router from '@/router'

describe('Static Informational Views', () => {
  it('renders FaqView properly', async () => {
    router.push('/faq')
    await router.isReady()
    const wrapper = mount(FaqView, {
      global: { plugins: [router] },
    })
    expect(wrapper.text()).toContain('Frequently asked questions')
  })

  it('renders StoreInformationView properly', async () => {
    router.push('/store-info')
    await router.isReady()
    const wrapper = mount(StoreInformationView, {
      global: { plugins: [router] },
    })
    expect(wrapper.text()).toContain('Store information')
  })

  it('renders ComingSoonView properly', async () => {
    router.push('/coming-soon')
    await router.isReady()
    const wrapper = mount(ComingSoonView, {
      global: { plugins: [router] },
    })
    expect(wrapper.text()).toContain('Coming soon')
  })

  it('renders ForbiddenView properly', async () => {
    router.push('/forbidden')
    await router.isReady()
    const wrapper = mount(ForbiddenView, {
      global: { plugins: [router] },
    })
    expect(wrapper.text()).toContain('Administrator access required')
  })
})
