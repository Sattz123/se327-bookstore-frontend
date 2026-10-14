export interface Category {
  id: number
  name: string
  imageUrl: string | null
}

export type BookFormat = 'PAPERBACK' | 'HARDCOVER' | 'EBOOK' | 'AUDIOBOOK'

export interface Product {
  id: number
  name: string
  description: string | null
  price: number
  author: string | null
  stockQuantity: number
  category: Category
  images: string[]
  formats: BookFormat[]
}

export interface ProductPage {
  content: Product[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface ProductQuery {
  q?: string
  categoryId?: string
  page?: number
}
