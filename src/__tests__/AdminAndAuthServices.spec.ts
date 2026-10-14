import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from '@/services/apiClient'
import { AdminCustomerService } from '@/services/AdminCustomerService'
import { AdminDashboardService } from '@/services/AdminDashboardService'
import { AdminProfileService } from '@/services/AdminProfileService'
import { AdminOrderService } from '@/services/AdminOrderService'
import { AdminProductService } from '@/services/AdminProductService'
import { AdminCategoryService } from '@/services/AdminCategoryService'
import { AdminService } from '@/services/AdminService'
import { AuthService } from '@/services/AuthService'
import type { Order } from '@/types/checkout'
import type { AdminProduct, AdminProductPayload } from '@/types/adminProduct'

vi.mock('@/services/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
  },
}))

describe('Admin and Auth Services direct coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('AdminCustomerService.list calls /admin/customers', async () => {
    const pageMock = { content: [], page: 1, size: 20, totalElements: 0, totalPages: 0 }
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: pageMock })
    const res = await AdminCustomerService.list('search', 1)
    expect(res).toEqual(pageMock)
    expect(apiClient.get).toHaveBeenCalledWith('/admin/customers', {
      params: { q: 'search', page: 1 },
      signal: undefined,
    })
  })

  it('AdminDashboardService.get calls /admin/dashboard', async () => {
    const dashMock = {
      totalProducts: 10,
      totalOrders: 5,
      totalCustomers: 3,
      recentOrders: [],
      page: 1,
      size: 10,
      totalPages: 1,
    }
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: dashMock })
    const res = await AdminDashboardService.get(1)
    expect(res).toEqual(dashMock)
    expect(apiClient.get).toHaveBeenCalledWith('/admin/dashboard', {
      params: { page: 1 },
      signal: undefined,
    })
  })

  it('AdminProfileService calls endpoints', async () => {
    const userMock = { id: 1, username: 'admin', email: 'admin@example.com', role: 'ADMIN' }
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: userMock })
    const user = await AdminProfileService.get()
    expect(user).toEqual(userMock)

    const authRes = { token: 't1', user: { ...userMock, displayName: 'Admin' } }
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: authRes })
    const updated = await AdminProfileService.update({
      username: 'admin',
      email: 'admin@example.com',
    })
    expect(updated).toEqual(authRes)

    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { message: 'Updated' } })
    const pwdRes = await AdminProfileService.changePassword({
      currentPassword: 'old',
      newPassword: 'new',
    })
    expect(pwdRes.message).toBe('Updated')
  })

  it('AdminOrderService calls list, get, and updateStatus', async () => {
    const pageMock = { content: [], page: 1, size: 20, totalElements: 0, totalPages: 0 }
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: pageMock })
    const listRes = await AdminOrderService.list({ q: 'test', page: 1 })
    expect(listRes).toEqual(pageMock)

    const detailMock = {
      order: {} as unknown as Order,
      customerId: 1,
      customerName: 'c1',
      customerEmail: 'c1@test.com',
      customerPhone: null,
      version: 1,
      updatedAt: '',
      allowedStatuses: [],
    }
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: detailMock })
    const detail = await AdminOrderService.get('1')
    expect(detail).toEqual(detailMock)

    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: detailMock })
    const patched = await AdminOrderService.updateStatus(1, 'PROCESSING', 1)
    expect(patched).toEqual(detailMock)
  })

  it('AdminProductService calls all product admin endpoints', async () => {
    const prodMock = { id: 1, name: 'Book', version: 1 } as unknown as AdminProduct
    vi.mocked(apiClient.post).mockResolvedValue({ data: prodMock })
    vi.mocked(apiClient.get).mockResolvedValue({ data: prodMock })
    vi.mocked(apiClient.put).mockResolvedValue({ data: prodMock })
    vi.mocked(apiClient.patch).mockResolvedValue({ data: prodMock })
    vi.mocked(apiClient.delete).mockResolvedValue({ data: prodMock })

    const file = new File(['dummy'], 'cover.png', { type: 'image/png' })
    await AdminProductService.uploadImage(1, file, 1)
    await AdminProductService.uploadImage(1, file, 1, 2)
    await AdminProductService.removeImage(1, 2, 1)
    await AdminProductService.list({ q: 'b', page: 1 })
    await AdminProductService.categories()
    await AdminProductService.get(1)
    await AdminProductService.create({
      name: 'Book',
      categoryId: 1,
      price: 10,
      stockQuantity: 5,
      formats: ['PAPERBACK'],
      visible: true,
    } as unknown as AdminProductPayload)
    await AdminProductService.update(1, {
      name: 'Book',
      categoryId: 1,
      price: 10,
      stockQuantity: 5,
      formats: ['PAPERBACK'],
      visible: true,
    } as unknown as AdminProductPayload)
    await AdminProductService.inventory(1, 10, 1)
    await AdminProductService.visibility(1, true, 1)
    await AdminProductService.archive(1, 1)

    expect(apiClient.post).toHaveBeenCalled()
    expect(apiClient.delete).toHaveBeenCalled()
    expect(apiClient.patch).toHaveBeenCalled()
  })

  it('AdminCategoryService calls list, get, save, visibility, delete', async () => {
    const catMock = {
      id: 1,
      name: 'Fiction',
      imageUrl: null,
      visible: true,
      productCount: 0,
      version: 1,
      createdAt: '',
    }
    vi.mocked(apiClient.get).mockResolvedValue({ data: [catMock] })
    vi.mocked(apiClient.request).mockResolvedValue({ data: catMock })
    vi.mocked(apiClient.patch).mockResolvedValue({ data: catMock })
    vi.mocked(apiClient.delete).mockResolvedValue({ data: null })

    const list = await AdminCategoryService.list()
    expect(list).toEqual([catMock])

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: catMock })
    const single = await AdminCategoryService.get(1)
    expect(single).toEqual(catMock)

    const file = new File(['dummy'], 'cat.png', { type: 'image/png' })
    await AdminCategoryService.save(
      null,
      { name: 'New Cat', imageUrl: null, visible: true, version: null },
      file,
    )
    await AdminCategoryService.save(
      1,
      { name: 'Edit Cat', imageUrl: null, visible: true, version: 1 },
      null,
    )

    await AdminCategoryService.visibility(catMock)
    await AdminCategoryService.delete(catMock)

    expect(apiClient.request).toHaveBeenCalledTimes(2)
    expect(apiClient.patch).toHaveBeenCalled()
    expect(apiClient.delete).toHaveBeenCalled()
  })

  it('AdminService.getSession calls /admin/session', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { message: 'OK' } })
    await AdminService.getSession()
    expect(apiClient.get).toHaveBeenCalledWith('/admin/session')
  })

  it('AuthService calls all authentication endpoints', async () => {
    const userMock = { id: 1, username: 'u1', email: 'u1@test.com', role: 'CUSTOMER' }
    const authMock = { token: 'tok', user: userMock }
    vi.mocked(apiClient.post).mockResolvedValue({ data: authMock })
    vi.mocked(apiClient.get).mockResolvedValue({ data: userMock })

    const reg = await AuthService.register({
      username: 'u1',
      email: 'u1@test.com',
      password: 'password123',
    })
    expect(reg).toEqual(authMock)

    const log = await AuthService.login({ email: 'u1@test.com', password: 'password123' })
    expect(log).toEqual(authMock)

    const me = await AuthService.getCurrentUser()
    expect(me).toEqual(userMock)

    await AuthService.logout()
    expect(apiClient.post).toHaveBeenCalledWith('/auth/logout')

    // test logout error tolerance
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Network error'))
    await expect(AuthService.logout()).resolves.toBeUndefined()

    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { message: 'Sent' } })
    const fp = await AuthService.forgotPassword({ email: 'u1@test.com' })
    expect(fp.message).toBe('Sent')

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { valid: true } })
    const tokenCheck = await AuthService.verifyResetToken('valid-token')
    expect(tokenCheck.valid).toBe(true)

    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { message: 'Reset ok' } })
    const rp = await AuthService.resetPassword({ token: 'tok', newPassword: 'new-password' })
    expect(rp.message).toBe('Reset ok')
  })
})
