import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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
      component: () => import('@/views/ComingSoonView.vue'),
      props: { title: 'Books', description: 'Discover your next favorite book.' },
      meta: { title: 'Books' },
    },
    {
      path: '/categories',
      name: 'categories',
      component: () => import('@/views/ComingSoonView.vue'),
      props: { title: 'Categories', description: 'Explore books by the topics you love.' },
      meta: { title: 'Categories' },
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

export default router
