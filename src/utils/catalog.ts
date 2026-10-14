import apiClient from '@/services/apiClient'
import type { BookFormat } from '@/types/catalog'

const priceFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function formatPrice(price: number) {
  return priceFormatter.format(price)
}

export const formatLabels: Record<BookFormat, string> = {
  PAPERBACK: 'Paperback',
  HARDCOVER: 'Hardcover',
  EBOOK: 'E-book',
  AUDIOBOOK: 'Audiobook',
}

export function resolveImageUrl(image: string | undefined) {
  if (!image?.trim()) return null
  try {
    const backendOrigin = new URL(apiClient.defaults.baseURL ?? '/api', window.location.origin)
      .origin
    const url = new URL(image, backendOrigin)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}
