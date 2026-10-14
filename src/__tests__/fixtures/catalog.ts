import { AxiosHeaders, type AxiosResponse } from 'axios'
import type { Product } from '@/types/catalog'

export function book(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    description: 'A story set in the Jazz Age.',
    price: 18,
    stockQuantity: 7,
    category: { id: 1, name: 'Fiction', imageUrl: null },
    images: ['/images/front.png'],
    formats: ['PAPERBACK', 'EBOOK'],
    ...overrides,
  }
}

export function response<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
}

export function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}
