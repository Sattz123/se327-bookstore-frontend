import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import { createBookstoreRouter } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { PaymentMethodService } from '@/services/PaymentMethodService'
import type { PaymentMethod } from '@/types/paymentMethod'
import type { User } from '@/types/auth'
import { deferred } from './fixtures/catalog'

vi.mock('@/services/PaymentMethodService', () => ({
  PaymentMethodService: {
    getPaymentMethods: vi.fn(),
    addPaymentMethod: vi.fn(),
    setDefault: vi.fn(),
    deletePaymentMethod: vi.fn(),
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
const visa: PaymentMethod = {
  id: 10,
  provider: 'Visa',
  cardholderName: 'Demo Reader',
  cardNumberMasked: '**** **** **** 1234',
  expiryMonth: 12,
  expiryYear: 2030,
  isDefault: true,
  createdAt: '2026-01-01T00:00:00Z',
}
const spare: PaymentMethod = {
  ...visa,
  id: 20,
  provider: 'Mastercard',
  cardNumberMasked: '**** **** **** 5678',
  isDefault: false,
}

describe('saved payment methods', () => {
  let wrapper: VueWrapper | undefined
  let pinia: ReturnType<typeof createPinia>
  let router: ReturnType<typeof createBookstoreRouter>
  const service = vi.mocked(PaymentMethodService)

  beforeEach(() => {
    vi.clearAllMocks()
    for (const method of Object.values(service)) method.mockReset()
    localStorage.clear()
    pinia = createPinia()
    setActivePinia(pinia)
    useAuthStore().setAuth({ token: 'test-token', user: reader })
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    service.getPaymentMethods.mockResolvedValue([visa, spare])
    service.addPaymentMethod.mockResolvedValue(visa)
    service.setDefault.mockResolvedValue({ ...spare, isDefault: true })
    service.deletePaymentMethod.mockResolvedValue()
  })
  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    localStorage.clear()
  })

  async function render() {
    router = createBookstoreRouter(createMemoryHistory())
    await router.push('/payment-methods')
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
  async function fillForm() {
    await click('Add payment method')
    await wrapper!.get('#payment-provider').setValue('Visa')
    await wrapper!.get('#payment-name').setValue('  Demo Reader  ')
    await wrapper!.get('#payment-card-number').setValue('4242 4242 4242 1234')
    await wrapper!.get('#payment-expiry').setValue('12/30')
  }
  async function submit() {
    await wrapper!.get('main form').trigger('submit')
    await flushPromises()
  }

  it('redirects guests to login with a return URL', async () => {
    useAuthStore().clearAuth()
    await render()
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/payment-methods')
    expect(service.getPaymentMethods).not.toHaveBeenCalled()
  })
  it('shows masked metadata, simulation notice, default badge and navigation', async () => {
    const app = await render()
    expect(app.get('main h1').text()).toBe('Payment methods')
    expect(app.get('main').text()).toContain('Simulated payments only')
    expect(app.get('main').text()).toContain('**** **** **** 1234')
    expect(app.findAll('article')).toHaveLength(2)
    expect(app.get('main').text()).toContain('Default payment method')
    expect(app.get('header a[href="/payment-methods"]').text()).toBe('Payment methods')
    await fillForm()
    expect(app.get('#payment-card-number').attributes('maxlength')).toBe('23')
    expect(app.find('input[autocomplete="cc-number"]').exists()).toBe(false)
    expect(app.find('input[autocomplete="cc-csc"]').exists()).toBe(false)
  })
  it('shows loading and empty states', async () => {
    const pending = deferred<PaymentMethod[]>()
    service.getPaymentMethods.mockReturnValueOnce(pending.promise)
    const app = await render()
    expect(app.get('main').text()).toContain('Loading payment methods')
    pending.resolve([])
    await flushPromises()
    expect(app.get('main').text()).toContain('No saved payment methods')
  })
  it('shows the first name in the account button and updates after a profile change', async () => {
    useAuthStore().setAuth({
      token: 'test-token',
      user: { ...reader, username: '  Alex Morgan  ' },
    })
    const app = await render()
    expect(app.get('summary.account-trigger span').text()).toBe('Alex')
    useAuthStore().setAuth({ token: 'test-token', user: { ...reader, username: 'Sam Jones' } })
    await flushPromises()
    expect(app.get('summary.account-trigger span').text()).toBe('Sam')
  })
  it('uses a card-type selector and a blank typed expiry field', async () => {
    const app = await render()
    await click('Add payment method')
    expect(app.get('#payment-provider').element.tagName).toBe('SELECT')
    expect(app.get<HTMLInputElement>('#payment-expiry').element.value).toBe('')
    expect(app.get('#payment-expiry').element.tagName).toBe('INPUT')
    expect(app.get<HTMLInputElement>('#payment-name').element.value).toBe('Reader')
    await submit()
    expect(service.addPaymentMethod).not.toHaveBeenCalled()
  })
  it('retries loading after a network failure', async () => {
    service.getPaymentMethods.mockRejectedValueOnce(new Error('Offline'))
    const app = await render()
    expect(app.get('[role="alert"]').text()).toContain("couldn't load")
    await click('Try again')
    expect(app.findAll('article')).toHaveLength(2)
    expect(service.addPaymentMethod).not.toHaveBeenCalled()
  })
  it('sends trimmed display details and only the last four digits', async () => {
    const app = await render()
    await fillForm()
    await app.get('main form input[type="checkbox"]').setValue(true)
    await submit()
    expect(service.addPaymentMethod).toHaveBeenCalledWith({
      provider: 'Visa',
      cardholderName: 'Demo Reader',
      lastFour: '1234',
      expiryMonth: 12,
      expiryYear: 2030,
      isDefault: true,
    })
    expect(app.find('main form').exists()).toBe(false)
    expect(app.get('main').text()).toContain('Payment method saved.')
    expect(service.getPaymentMethods).toHaveBeenCalledTimes(2)
  })
  it.each(['1234', '12345678901234567890', 'abcd', '4242 4242 abcd 1234'])(
    'rejects invalid full card number %s',
    async (value) => {
      const app = await render()
      await fillForm()
      await app.get('#payment-card-number').setValue(value)
      await submit()
      expect(service.addPaymentMethod).not.toHaveBeenCalled()
      expect(app.get('[role="alert"]').text()).toContain('13–19 digits')
    },
  )
  it('retains a draft and displays server validation feedback', async () => {
    service.addPaymentMethod.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 400, data: { detail: 'Expiry date must not be in the past.' } },
    })
    const app = await render()
    await fillForm()
    await submit()
    expect(app.get('[role="alert"]').text()).toContain('Expiry date must not be in the past.')
    expect((app.get('#payment-card-number').element as HTMLInputElement).value).toBe(
      '4242 4242 4242 1234',
    )
    await click('Cancel')
    expect(app.find('main form').exists()).toBe(false)
  })
  it.each(['13/30', '00/30', '12/20', 'abcd', ''])(
    'rejects invalid or expired date %s',
    async (expiry) => {
      const app = await render()
      await fillForm()
      await app.get('#payment-expiry').setValue(expiry)
      await submit()
      expect(service.addPaymentMethod).not.toHaveBeenCalled()
      expect(app.get('[role="alert"]').text()).toContain('MM/YY')
    },
  )
  it('accepts a typed four-digit year and keeps the full number out of the request', async () => {
    const app = await render()
    await fillForm()
    await app.get('#payment-expiry').setValue('12/2030')
    await submit()
    expect(service.addPaymentMethod).toHaveBeenCalledWith({
      provider: 'Visa',
      cardholderName: 'Demo Reader',
      lastFour: '1234',
      expiryMonth: 12,
      expiryYear: 2030,
      isDefault: false,
    })
  })
  it('prevents repeated submissions while saving', async () => {
    const pending = deferred<PaymentMethod>()
    service.addPaymentMethod.mockReturnValueOnce(pending.promise)
    const app = await render()
    await fillForm()
    await app.get('main form').trigger('submit')
    await app.get('main form').trigger('submit')
    expect(service.addPaymentMethod).toHaveBeenCalledTimes(1)
    expect(app.get('fieldset').attributes('disabled')).toBeDefined()
    pending.resolve(visa)
    await flushPromises()
  })
  it('refreshes the default badge after selection', async () => {
    const app = await render()
    service.getPaymentMethods.mockResolvedValueOnce([
      { ...spare, isDefault: true },
      { ...visa, isDefault: false },
    ])
    await click('Make default')
    expect(service.setDefault).toHaveBeenCalledWith(20)
    expect(app.findAll('article')[0]!.text()).toContain('Mastercard')
    expect(app.findAll('article')[0]!.text()).toContain('Default payment method')
  })
  it('requires delete confirmation and does not promote another record', async () => {
    const app = await render()
    await click('Delete')
    expect(service.deletePaymentMethod).not.toHaveBeenCalled()
    expect(app.get('main').text()).toContain('You will have no default until you choose another.')
    await click('Keep method')
    expect(service.deletePaymentMethod).not.toHaveBeenCalled()
    await click('Delete')
    service.getPaymentMethods.mockResolvedValueOnce([spare])
    await click('Confirm delete')
    expect(service.deletePaymentMethod).toHaveBeenCalledWith(10)
    expect(app.findAll('article')).toHaveLength(1)
    expect(app.get('main').text()).not.toContain('Default payment method')
    expect(service.setDefault).not.toHaveBeenCalled()
  })
  it('clears private drafts and ignores old responses when the account changes', async () => {
    const app = await render()
    await fillForm()
    const previous = deferred<PaymentMethod[]>()
    service.getPaymentMethods.mockReturnValueOnce(previous.promise)
    useAuthStore().setAuth({ token: 'other-token', user: { ...reader, id: 2 } })
    await flushPromises()
    expect(app.find('main form').exists()).toBe(false)
    service.getPaymentMethods.mockResolvedValueOnce([])
    useAuthStore().setAuth({ token: 'third-token', user: { ...reader, id: 3 } })
    await flushPromises()
    previous.resolve([visa])
    await flushPromises()
    expect(app.findAll('article')).toHaveLength(0)
    expect(app.get('main').text()).not.toContain('Demo Reader')
  })
  it('clears authentication and redirects when the session expires', async () => {
    service.getPaymentMethods.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401 },
    })
    await render()
    await flushPromises()
    expect(useAuthStore().isAuthenticated).toBe(false)
    expect(router.currentRoute.value.path).toBe('/login')
    expect(wrapper!.findAll('article')).toHaveLength(0)
  })
})
