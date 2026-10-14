import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import { CartService } from '@/services/CartService'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'
import type { Cart } from '@/types/cart'
import { cartLine, cartReader, savedCart } from './fixtures/cart'
import { deferred } from './fixtures/catalog'

vi.mock('@/services/CartService', () => ({
  CartService: { getCart: vi.fn(), addItem: vi.fn(), updateQuantity: vi.fn(), removeItem: vi.fn() },
}))
const service = vi.mocked(CartService)
let pinia: ReturnType<typeof createPinia>
beforeEach(() => {
  for (const method of Object.values(service)) method.mockReset()
  localStorage.clear()
  pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().setAuth({ token: 'test-token', user: cartReader })
  service.getCart.mockResolvedValue(savedCart())
})
afterEach(() => {
  disposePinia(pinia)
  localStorage.clear()
})

it('reloads a saved cart into a new store rather than relying on browser cart data', async () => {
  const cart = useCartStore()
  await flushPromises()
  expect(cart.cart.items[0]?.format).toBe('PAPERBACK')
  expect(cart.count).toBe(2)
  expect(service.getCart).toHaveBeenCalledTimes(1)
})
it('prevents simultaneous mutations and accepts the authoritative response', async () => {
  const cart = useCartStore()
  await flushPromises()
  const pending = deferred<Cart>()
  service.addItem.mockReturnValueOnce(pending.promise)
  const payload = { productId: 1, format: 'PAPERBACK' as const, quantity: 1 }
  const first = cart.addItem(payload)
  expect(await cart.addItem(payload)).toBe(false)
  expect(service.addItem).toHaveBeenCalledTimes(1)
  pending.resolve(savedCart([{ ...cartLine, quantity: 3, lineTotal: 59.85 }]))
  expect(await first).toBe(true)
  expect(cart.count).toBe(3)
  expect(cart.busy).toBe(false)
})
it('does not let an older cart read overwrite a completed mutation', async () => {
  const pending = deferred<Cart>()
  service.getCart.mockReturnValueOnce(pending.promise)
  const cart = useCartStore()
  service.removeItem.mockResolvedValueOnce(savedCart([]))
  expect(await cart.removeItem(10)).toBe(true)
  pending.resolve(savedCart())
  await flushPromises()
  expect(cart.cart.items).toEqual([])
  expect(cart.count).toBe(0)
})
it('ignores another account’s late reads and clears private data immediately', async () => {
  const pending = deferred<Cart>()
  service.getCart.mockReturnValueOnce(pending.promise)
  const cart = useCartStore()
  useAuthStore().setAuth({ token: 'other-token', user: { ...cartReader, id: 2 } })
  expect(cart.cart.items).toEqual([])
  service.getCart.mockResolvedValueOnce(savedCart([]))
  useAuthStore().setAuth({ token: 'third-token', user: { ...cartReader, id: 3 } })
  await flushPromises()
  pending.resolve(savedCart())
  await flushPromises()
  expect(cart.cart.items).toEqual([])
})
it('ignores a mutation response received after logout', async () => {
  const cart = useCartStore()
  await flushPromises()
  const pending = deferred<Cart>()
  service.updateQuantity.mockReturnValueOnce(pending.promise)
  const update = cart.updateQuantity(10, 3)
  useAuthStore().clearAuth()
  expect(cart.count).toBe(0)
  pending.resolve(savedCart([{ ...cartLine, quantity: 3, lineTotal: 59.85 }]))
  expect(await update).toBe(false)
  expect(cart.cart.items).toEqual([])
})
it('retains the saved cart after a rejected update', async () => {
  const cart = useCartStore()
  await flushPromises()
  service.updateQuantity.mockRejectedValueOnce({
    isAxiosError: true,
    response: { status: 409, data: { detail: 'Stock limit reached.' } },
  })
  expect(await cart.updateQuantity(10, 9)).toBe(false)
  expect(cart.error).toBe('Stock limit reached.')
  expect(cart.cart.total).toBe(39.9)
  expect(cart.count).toBe(2)
})
it('clears authentication and private data after an expired session', async () => {
  const cart = useCartStore()
  await flushPromises()
  service.getCart.mockRejectedValueOnce({ isAxiosError: true, response: { status: 401 } })
  await cart.fetchCart()
  expect(useAuthStore().isAuthenticated).toBe(false)
  expect(cart.cart.items).toEqual([])
  expect(cart.count).toBe(0)
})

it('does not let a late cart mutation restore purchased items after checkout', async () => {
  const cart = useCartStore()
  await flushPromises()
  const pending = deferred<Cart>()
  service.updateQuantity.mockReturnValueOnce(pending.promise)
  const update = cart.updateQuantity(10, 2)
  service.getCart.mockResolvedValueOnce(savedCart([]))
  await cart.refreshAfterCheckout()
  pending.resolve(savedCart())
  expect(await update).toBe(false)
  expect(cart.cart.items).toEqual([])
  expect(cart.count).toBe(0)
})
