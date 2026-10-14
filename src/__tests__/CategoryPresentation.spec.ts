import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import CategoryGrid from '@/components/CategoryGrid.vue'

describe('category presentation', () => {
  let wrapper: VueWrapper | undefined
  afterEach(() => wrapper?.unmount())

  function render(variant: 'photo' | 'collection') {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/categories/:id', name: 'category-products', component: { template: '<div />' } },
      ],
    })
    wrapper = mount(CategoryGrid, {
      props: {
        variant,
        categories: [
          { id: 30, name: 'Children', imageUrl: null },
          { id: 70, name: 'Travel', imageUrl: null },
          { id: 10, name: 'Fiction', imageUrl: null },
          { id: 40, name: 'Mystery & Thriller', imageUrl: null },
          { id: 50, name: 'Science & Technology', imageUrl: null },
        ],
      },
      global: { plugins: [router] },
    })
    return wrapper
  }

  it('keeps server IDs, unknown categories and missing categories in the collection layout', () => {
    const grid = render('collection')
    expect(grid.findAll('a').map((link) => link.attributes('href'))).toEqual([
      '/categories/10',
      '/categories/30',
      '/categories/40',
      '/categories/50',
      '/categories/70',
    ])
    expect(grid.text()).not.toContain('Non-Fiction')
    expect(grid.find('.category-other').exists()).toBe(true)
  })

  it('uses local photo assets and keeps a usable link if a picture fails', async () => {
    const grid = render('photo')
    const fiction = grid.get('a[href="/categories/10"]')
    expect(fiction.get('img').attributes('src')).toBe('/images/categories/fiction.jpg')
    await fiction.get('img').trigger('error')
    expect(fiction.find('img').exists()).toBe(false)
    expect(fiction.text()).toContain('Fiction')
    expect(fiction.attributes('href')).toBe('/categories/10')
  })
})
