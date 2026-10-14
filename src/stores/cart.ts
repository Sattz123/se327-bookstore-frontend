import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { isAxiosError } from 'axios'
import { useAuthStore } from './auth'
import { CartService } from '@/services/CartService'
import type { AddToCartPayload, Cart } from '@/types/cart'

const emptyCart = (): Cart => ({ items: [], totalQuantity: 0, total: 0 })

export const useCartStore = defineStore('cart', () => {
  const auth = useAuthStore()
  const cart = ref<Cart>(emptyCart())
  const loading = ref(false)
  const busy = ref(false)
  const error = ref('')
  const count = computed(() => cart.value.totalQuantity)
  let session = 0
  let revision = 0
  let controller: AbortController | undefined

  function report(cause: unknown) {
    if (isAxiosError<{ detail?: string; errors?: { message: string }[] }>(cause)) {
      if (cause.response?.status === 401) {
        auth.clearAuth()
        return
      }
      error.value =
        cause.response?.data?.errors?.map((item) => item.message).join(' ') ||
        cause.response?.data?.detail ||
        'Unable to update your cart. Please try again.'
    } else error.value = 'Unable to load or update your cart. Please try again.'
  }
  async function fetchCart() {
    if (!auth.isAuthenticated || busy.value || loading.value) return false
    const owner = session
    const request = ++revision
    controller?.abort()
    controller = new AbortController()
    loading.value = true
    error.value = ''
    try {
      const data = await CartService.getCart(controller.signal)
      if (owner !== session || request !== revision) return false
      cart.value = data
      return true
    } catch (cause) {
      if (owner === session && request === revision) report(cause)
      return false
    } finally {
      if (owner === session && request === revision) loading.value = false
    }
  }
  async function mutate(operation: () => Promise<Cart>) {
    if (!auth.isAuthenticated || busy.value) return false
    const owner = session
    ++revision
    controller?.abort()
    loading.value = false
    busy.value = true
    error.value = ''
    try {
      const data = await operation()
      if (owner !== session) return false
      cart.value = data
      return true
    } catch (cause) {
      if (owner === session) report(cause)
      return false
    } finally {
      if (owner === session) busy.value = false
    }
  }
  function addItem(payload: AddToCartPayload) {
    return mutate(() => CartService.addItem(payload))
  }
  function updateQuantity(id: number, quantity: number) {
    return mutate(() => CartService.updateQuantity(id, quantity))
  }
  function removeItem(id: number) {
    return mutate(() => CartService.removeItem(id))
  }

  watch(
    () => auth.currentUser?.id,
    () => {
      session++
      revision++
      controller?.abort()
      cart.value = emptyCart()
      error.value = ''
      busy.value = false
      loading.value = false
      if (auth.isAuthenticated) void fetchCart()
    },
    { immediate: true, flush: 'sync' },
  )

  return { cart, count, loading, busy, error, fetchCart, addItem, updateQuantity, removeItem }
})
