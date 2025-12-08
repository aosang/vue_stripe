<template>
  <button
    @click="handleSubscribe"
    class="subscribe-button"
  >
    立即订阅
  </button>
</template>

<script setup>
// 使用新版本的 Stripe Checkout，不再需要加载 Stripe.js
const handleSubscribe = async () => {
  try {
    // 调用后端创建 Checkout Session
    const response = await fetch('http://localhost:3000/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        priceId: 'price_1SbyFpFpdtCmQBszCaeTA7wC' // 你的 Stripe Price ID
      })
    })

    const session = await response.json()
    console.log('Session created:', session)
    
    // 直接跳转到 Stripe Checkout 页面（新版本推荐方式）
    if (session.url) {
      window.location.href = session.url
    } else {
      console.error('未获取到 Checkout URL')
    }
    
  } catch(error) {
    console.error('订阅处理错误:', error)
  }
}
</script>

<style scoped>
.subscribe-button { 
  background-color: #007bff;
  color: white;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  text-align: center;
  line-height: 100%;
  padding: 10px 20px;
  border: none;
}
</style>