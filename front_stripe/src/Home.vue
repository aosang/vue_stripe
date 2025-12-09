<template>
  <div class="payment-container">
    <h2>选择支付方式</h2>
    
    <!-- 订阅支付 - 信用卡 -->
    <div class="payment-option">
      <h3>💳 订阅服务（每月自动续费）</h3>
      <p>使用信用卡，每月自动扣款</p>
      <button @click="handleSubscribe" class="subscribe-button">
        订阅 - 信用卡支付
      </button>
    </div>

    <!-- 一次性支付 - 支持支付宝 -->
    <div class="payment-option">
      <h3>🇨🇳 一次性购买</h3>
      <p>支持信用卡、支付宝</p>
      <button @click="handleOneTimePayment" class="payment-button">
        购买 - 支付宝/信用卡
      </button>
    </div>
  </div>
</template>

<script setup>
// 订阅支付（信用卡）
const handleSubscribe = async () => {
  try {
    const response = await fetch('http://localhost:3000/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // 使用订阅价格（recurring price）
        priceId: 'price_1SbyFpFpdtCmQBszCaeTA7wC'
      })
    })

    const session = await response.json()
    if (session.url) {
      window.location.href = session.url
    }
  } catch(error) {
    console.error('订阅处理错误:', error)
  }
}

// 一次性支付（支付宝/信用卡）
const handleOneTimePayment = async () => {
  try {
    const response = await fetch('http://localhost:3000/create-payment-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // 使用 price_data 方式，无需 Price ID
        amount: 9900, // 99 元（单位：分）
        productName: '会员服务一次性购买'
      })
    })

    const session = await response.json()
    if (session.url) {
      window.location.href = session.url
    }
  } catch(error) {
    console.error('支付处理错误:', error)
  }
}
</script>

<style scoped>
.payment-container {
  max-width: 600px;
  margin: 50px auto;
  padding: 20px;
}

h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

.payment-option {
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
}

.payment-option h3 {
  margin-top: 0;
  color: #333;
}

.payment-option p {
  color: #666;
  margin-bottom: 15px;
}

.subscribe-button,
.payment-button {
  width: 100%;
  padding: 12px 20px;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.subscribe-button {
  background-color: #007bff;
  color: white;
}

.subscribe-button:hover {
  background-color: #0056b3;
}

.payment-button {
  background-color: #28a745;
  color: white;
}

.payment-button:hover {
  background-color: #218838;
}
</style>