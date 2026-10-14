import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import { createBookstoreRouter } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { AddressService } from '@/services/AddressService'
import type { Address } from '@/types/address'
import type { User } from '@/types/auth'
import { deferred } from './fixtures/catalog'

vi.mock('@/services/AddressService', () => ({
  AddressService: {
    getAddresses: vi.fn(),
    addAddress: vi.fn(),
    updateAddress: vi.fn(),
    setDefault: vi.fn(),
    deleteAddress: vi.fn(),
  },
}))
vi.mock('@/services/WishlistService', () => ({
  WishlistService: { getWishlist: vi.fn().mockResolvedValue([]) },
}))
vi.mock('@/services/AuthService', () => ({
  AuthService: { logout: vi.fn(), getCurrentUser: vi.fn() },
}))
vi.mock('@/services/ProductService', () => ({
  default: { getFeaturedProducts: vi.fn().mockResolvedValue([]) },
}))
vi.mock('@/services/CategoryService', () => ({
  default: { getCategories: vi.fn().mockResolvedValue([]) },
}))

const reader: User = {
  id: 1,
  username: 'Reader',
  email: 'reader@example.com',
  phone: null,
  avatarUrl: null,
  role: 'CUSTOMER',
  createdAt: '2026-01-01T00:00:00Z',
}
const home: Address = {
  id: 10,
  label: 'Home',
  fullName: 'Reader One',
  phone: '0812345678',
  addressLine: '123 Home Road',
  city: 'Chiang Mai',
  province: 'Chiang Mai',
  postalCode: '50200',
  isDefault: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}
const work: Address = {
  ...home,
  id: 20,
  label: 'Work',
  addressLine: '456 Work Road',
  isDefault: false,
}

describe('address book', () => {
  let wrapper: VueWrapper | undefined
  let pinia: ReturnType<typeof createPinia>
  let router: ReturnType<typeof createBookstoreRouter>
  const service = vi.mocked(AddressService)

  beforeEach(() => {
    vi.clearAllMocks()
    for (const method of Object.values(service)) method.mockReset()
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    useAuthStore().setAuth({ token: 'test-token', user: reader })
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    service.getAddresses.mockResolvedValue([home, work])
    service.addAddress.mockResolvedValue(home)
    service.updateAddress.mockResolvedValue(home)
    service.setDefault.mockResolvedValue({ ...work, isDefault: true })
    service.deleteAddress.mockResolvedValue()
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    localStorage.clear()
  })

  async function render() {
    router = createBookstoreRouter(createMemoryHistory())
    await router.push('/addresses')
    await router.isReady()
    wrapper = mount(App, { global: { plugins: [pinia, router] } })
    await flushPromises()
    return wrapper
  }

  async function click(text: string) {
    const button = wrapper!.findAll('button').find((item) => item.text() === text)
    if (!button) throw new Error(`Button not found: ${text}`)
    await button.trigger('click')
    await flushPromises()
  }

  it('redirects guests to login with a return URL', async () => {
    useAuthStore().clearAuth()
    await render()
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/addresses')
    expect(service.getAddresses).not.toHaveBeenCalled()
  })

  it('shows the saved address fields, default badge, and header link', async () => {
    const app = await render()
    expect(app.get('main h1').text()).toBe('Address book')
    expect(app.findAll('article')).toHaveLength(2)
    expect(app.get('main').text()).toContain('123 Home Road')
    expect(app.get('main').text()).toContain('0812345678')
    expect(app.get('main').text()).toContain('50200')
    expect(app.get('header a[href="/addresses"]').text()).toBe('Addresses')
    expect(app.get('article[aria-label="Home address"]').text()).toContain('Default address')
  })

  it('shows loading then an empty state', async () => {
    const pending = deferred<Address[]>()
    service.getAddresses.mockReturnValueOnce(pending.promise)
    const app = await render()
    expect(app.get('main').text()).toContain('Loading addresses…')
    pending.resolve([])
    await flushPromises()
    expect(app.get('main').text()).toContain('No saved addresses yet')
  })

  it('retries loading without sending a mutation', async () => {
    service.getAddresses.mockRejectedValueOnce(new Error('Offline'))
    const app = await render()
    expect(app.get('[role="alert"]').text()).toContain("couldn't load your addresses")
    await click('Try again')
    expect(app.findAll('article')).toHaveLength(2)
    expect(service.addAddress).not.toHaveBeenCalled()
  })

  it('adds a trimmed address with optional blanks as null', async () => {
    const app = await render()
    await click('Add address')
    await app.get('#address-fullName').setValue('  New Reader  ')
    await app.get('#address-addressLine').setValue('  7 New Road  ')
    await app.get('main form input[type="checkbox"]').setValue(true)
    await app.get('main form').trigger('submit')
    await flushPromises()
    expect(service.addAddress).toHaveBeenCalledWith({
      label: 'Home',
      fullName: 'New Reader',
      addressLine: '7 New Road',
      phone: null,
      city: null,
      province: null,
      postalCode: null,
      isDefault: true,
    })
    expect(app.get('main').text()).toContain('Address saved.')
    expect(app.find('main form').exists()).toBe(false)
    expect(service.getAddresses).toHaveBeenCalledTimes(2)
  })

  it('rejects blank required text before calling the API', async () => {
    const app = await render()
    await click('Add address')
    await app.get('#address-fullName').setValue('   ')
    await app.get('main form').trigger('submit')
    await flushPromises()
    expect(service.addAddress).not.toHaveBeenCalled()
    expect(app.get('[role="alert"]').text()).toContain('recipient name')
  })

  it('edits an existing address and can clear its default checkbox', async () => {
    const app = await render()
    await click('Edit')
    expect((app.get('#address-fullName').element as HTMLInputElement).value).toBe('Reader One')
    await app.get('#address-addressLine').setValue('Updated street')
    await app.get('main form input[type="checkbox"]').setValue(false)
    await app.get('main form').trigger('submit')
    await flushPromises()
    expect(service.updateAddress).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ addressLine: 'Updated street', isDefault: false }),
    )
    expect(service.addAddress).not.toHaveBeenCalled()
  })

  it('cancels an edit without saving it', async () => {
    const app = await render()
    await click('Edit')
    await app.get('#address-label').setValue('Unsaved draft')
    await click('Cancel')
    expect(app.find('main form').exists()).toBe(false)
    expect(app.get('main').text()).not.toContain('Unsaved draft')
    expect(service.updateAddress).not.toHaveBeenCalled()
  })

  it('keeps draft values and displays server validation messages on failure', async () => {
    service.updateAddress.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 400,
        data: { errors: [{ field: 'postalCode', message: 'Postal code is too long.' }] },
      },
    })
    const app = await render()
    await click('Edit')
    await app.get('#address-fullName').setValue('Draft recipient')
    await app.get('main form').trigger('submit')
    await flushPromises()
    expect(app.get('[role="alert"]').text()).toContain('Postal code is too long.')
    expect((app.get('#address-fullName').element as HTMLInputElement).value).toBe('Draft recipient')
  })

  it('does not submit the same form twice while saving', async () => {
    const pending = deferred<Address>()
    service.updateAddress.mockReturnValueOnce(pending.promise)
    const app = await render()
    await click('Edit')
    await app.get('main form').trigger('submit')
    await app.get('main form').trigger('submit')
    expect(service.updateAddress).toHaveBeenCalledTimes(1)
    expect(app.get('fieldset').attributes('disabled')).toBeDefined()
    pending.resolve(home)
    await flushPromises()
    expect(app.find('main form').exists()).toBe(false)
  })

  it('switches the default and displays the refreshed server list', async () => {
    const app = await render()
    service.getAddresses.mockResolvedValueOnce([
      { ...work, isDefault: true },
      { ...home, isDefault: false },
    ])
    await click('Make default')
    expect(service.setDefault).toHaveBeenCalledWith(20)
    expect(app.get('article').attributes('aria-label')).toBe('Work address')
    expect(app.get('article[aria-label="Work address"]').text()).toContain('Default address')
    expect(app.get('article[aria-label="Home address"]').text()).not.toContain('Default address')
  })

  it('confirms deleting the default and leaves the other address without a badge', async () => {
    const app = await render()
    await click('Delete')
    expect(app.get('main').text()).toContain('You will have no default address')
    await click('Keep address')
    expect(service.deleteAddress).not.toHaveBeenCalled()
    await click('Delete')
    service.getAddresses.mockResolvedValueOnce([work])
    await click('Confirm delete')
    expect(service.deleteAddress).toHaveBeenCalledWith(10)
    expect(app.findAll('article')).toHaveLength(1)
    expect(app.get('article').text()).not.toContain('Default address')
  })

  it('displays ownership/missing-record errors and retains the edit', async () => {
    service.updateAddress.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404, data: { detail: 'Address not found.' } },
    })
    const app = await render()
    await click('Edit')
    await app.get('main form').trigger('submit')
    await flushPromises()
    expect(app.get('[role="alert"]').text()).toBe('Address not found.')
    expect(app.find('main form').exists()).toBe(true)
  })

  it('clears expired authentication instead of leaving private addresses visible', async () => {
    service.getAddresses.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401, data: {} },
    })
    const app = await render()
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/login'))
    expect(useAuthStore().isAuthenticated).toBe(false)
    expect(app.find('article').exists()).toBe(false)
  })

  it('discards a pending response after changing accounts', async () => {
    const pending = deferred<Address[]>()
    service.getAddresses.mockReturnValueOnce(pending.promise)
    const app = await render()
    const oldSignal = service.getAddresses.mock.calls[0]?.[0]
    service.getAddresses.mockResolvedValueOnce([work])
    useAuthStore().setAuth({ token: 'second-token', user: { ...reader, id: 2 } })
    await flushPromises()
    pending.resolve([home])
    await flushPromises()
    expect(oldSignal?.aborted).toBe(true)
    expect(app.get('main').text()).toContain('456 Work Road')
    expect(app.get('main').text()).not.toContain('123 Home Road')
  })

  it('discards an old accounts draft and late mutation response', async () => {
    const pending = deferred<Address>()
    service.updateAddress.mockReturnValueOnce(pending.promise)
    const app = await render()
    await click('Edit')
    await app.get('#address-fullName').setValue('Private old draft')
    await app.get('main form').trigger('submit')
    service.getAddresses.mockResolvedValueOnce([work])
    useAuthStore().setAuth({ token: 'second-token', user: { ...reader, id: 2 } })
    await flushPromises()
    pending.resolve(home)
    await flushPromises()
    expect(app.find('main form').exists()).toBe(false)
    expect(app.get('main').text()).not.toContain('Private old draft')
    expect(app.get('main').text()).not.toContain('123 Home Road')
  })
})
