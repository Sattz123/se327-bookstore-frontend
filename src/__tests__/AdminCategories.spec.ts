import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, disposePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import AdminCategoriesView from '@/views/AdminCategoriesView.vue'
import { AdminCategoryService } from '@/services/AdminCategoryService'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/services/AdminCategoryService', () => ({
  AdminCategoryService: { list: vi.fn(), get: vi.fn(), save: vi.fn() },
}))

describe('category administration without images', () => {
  let wrapper: VueWrapper | undefined
  let pinia: ReturnType<typeof createPinia>
  const category = {
    id: 7,
    name: 'Fiction',
    imageUrl: '/images/existing.jpg',
    visible: true,
    productCount: 3,
    version: 2,
    createdAt: '2026-01-01T00:00:00Z',
  }
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    pinia = createPinia()
    useAuthStore(pinia).setAuth({
      token: 'test-token',
      user: {
        id: 1,
        username: 'Admin',
        email: 'admin@example.com',
        phone: null,
        avatarUrl: null,
        role: 'ADMIN',
        createdAt: category.createdAt,
      },
    })
    vi.mocked(AdminCategoryService.list).mockResolvedValue([category])
    vi.mocked(AdminCategoryService.get).mockResolvedValue(category)
    vi.mocked(AdminCategoryService.save).mockResolvedValue(category)
  })
  afterEach(() => {
    wrapper?.unmount()
    disposePinia(pinia)
    localStorage.clear()
  })
  async function render() {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: AdminCategoriesView }],
    })
    await router.push('/')
    wrapper = mount(AdminCategoriesView, { global: { plugins: [pinia, router] } })
    await flushPromises()
    return wrapper
  }
  it('edits names without image fields or removing existing image metadata', async () => {
    const view = await render()
    expect(view.find('img').exists()).toBe(false)
    await view.get('tbody button').trigger('click')
    await flushPromises()
    expect(view.find('input[type="file"]').exists()).toBe(false)
    expect(view.find('#category-image-url').exists()).toBe(false)
    await view.get('#category-name').setValue('Literature')
    await view.get('form').trigger('submit')
    await flushPromises()
    expect(AdminCategoryService.save).toHaveBeenCalledWith(
      7,
      { name: 'Literature', imageUrl: category.imageUrl, visible: true, version: 2 },
      null,
    )
  })
  it('creates a category with only its name and visibility', async () => {
    const view = await render()
    const create = view.findAll('button').find((button) => button.text() === 'New category')!
    await create.trigger('click')
    await view.get('#category-name').setValue('Travel')
    await view.get('form').trigger('submit')
    await flushPromises()
    expect(AdminCategoryService.save).toHaveBeenCalledWith(
      null,
      { name: 'Travel', imageUrl: null, visible: true, version: null },
      null,
    )
  })
})
