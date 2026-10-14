import type { BookFormat, Product } from './catalog'

export interface AdminCategory {
  id: number
  name: string
  visible: boolean
}
export interface AdminProduct extends Omit<Product, 'category'> {
  category: AdminCategory
  visible: boolean
  version: number
  updatedAt: string
}
export interface AdminProductPage {
  content: AdminProduct[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
export interface AdminProductPayload {
  name: string
  description: string | null
  author: string | null
  price: number
  stockQuantity: number
  categoryId: number
  formats: BookFormat[]
  visible: boolean
  version: number | null
}
