import { createRouter, createWebHistory } from 'vue-router'

// 懒加载
const Home = () => import('../Home.vue')
const Success = () => import('../Success.vue')
const Cancel = () => import('../Cancel.vue')
const Subscription = () => import('../Subscription.vue')

const routes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    component: Home
  },
  {
    path: '/subscription',
    component: Subscription
  },
  {
    path: '/success',
    component: Success
  },
  {
    path: '/cancel',
    component: Cancel
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router