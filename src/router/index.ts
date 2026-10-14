import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

export function createBookstoreRouter(
  history: RouterHistory = createWebHistory(import.meta.env.BASE_URL),
) {
  const router = createRouter({
    history,
    routes: [
      {
        path: '/',
        name: 'home',
        component: HomeView,
        meta: { title: 'Home' },
      },
      {
        path: '/products',
        name: 'products',
        component: () => import('@/views/ProductListView.vue'),
        meta: { title: 'Books' },
      },
      {
        path: '/products/:id',
        name: 'product-detail',
        component: () => import('@/views/ProductDetailView.vue'),
        meta: { title: 'Book details' },
      },
      {
        path: '/categories',
        name: 'categories',
        component: () => import('@/views/CategoryListView.vue'),
        meta: { title: 'Categories' },
      },
      {
        path: '/categories/:id',
        name: 'category-products',
        component: () => import('@/views/ProductListView.vue'),
        meta: { title: 'Category books' },
      },
      {
        path: '/contact',
        name: 'contact',
        component: () => import('@/views/ComingSoonView.vue'),
        props: { title: 'Contact', description: 'Get in touch with InwZa Bookstore.' },
        meta: { title: 'Contact' },
      },
      {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/views/NotFoundView.vue'),
        meta: { title: 'Page not found' },
      },
    ],
    scrollBehavior(_to, _from, savedPosition) {
      return savedPosition ?? { top: 0 }
    },
  })

  router.afterEach((to) => {
    document.title = `${to.meta.title ?? 'Home'} | InwZa Bookstore`
  })

  return router
}

export default createBookstoreRouter()
