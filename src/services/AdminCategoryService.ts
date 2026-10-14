import apiClient from './apiClient'

export interface ManagedCategory {
  id: number
  name: string
  imageUrl: string | null
  visible: boolean
  productCount: number
  version: number
  createdAt: string
}
export interface CategoryPayload {
  name: string
  imageUrl: string | null
  visible: boolean
  version: number | null
}

export const AdminCategoryService = {
  async list(signal?: AbortSignal): Promise<ManagedCategory[]> {
    return (await apiClient.get<ManagedCategory[]>('/admin/categories', { signal })).data
  },
  async get(id: number): Promise<ManagedCategory> {
    return (await apiClient.get<ManagedCategory>(`/admin/categories/${id}`)).data
  },
  async save(
    id: number | null,
    payload: CategoryPayload,
    file: File | null,
  ): Promise<ManagedCategory> {
    const data = new FormData()
    data.append('category', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
    if (file) data.append('file', file)
    return (
      await apiClient.request<ManagedCategory>({
        method: id === null ? 'post' : 'put',
        url: `/admin/categories${id === null ? '' : `/${id}`}`,
        data,
      })
    ).data
  },
  async visibility(category: ManagedCategory): Promise<ManagedCategory> {
    return (
      await apiClient.patch<ManagedCategory>(`/admin/categories/${category.id}/visibility`, {
        visible: !category.visible,
        version: category.version,
      })
    ).data
  },
  async delete(category: ManagedCategory): Promise<void> {
    await apiClient.delete(`/admin/categories/${category.id}`, {
      params: { version: category.version },
    })
  },
}
