<template>
  <div class="cancel-container">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading">
      <p>正在检查支付状态...</p>
    </div>

    <!-- 支付状态显示 -->
    <div v-else-if="statusInfo" class="status-card">
      <!-- 图标 -->
      <div class="icon" :class="statusInfo.type">
        <span v-if="statusInfo.type === 'user_cancelled'">😔</span>
        <span v-else-if="statusInfo.type === 'payment_failed'">❌</span>
        <span v-else-if="statusInfo.type === 'expired'">⏰</span>
        <span v-else>⚠️</span>
      </div>

      <!-- 标题和消息 -->
      <h1>{{ statusInfo.message }}</h1>
      
      <!-- 详细信息 -->
      <div class="details">
        <p v-if="statusInfo.customerEmail">
          <strong>邮箱：</strong>{{ statusInfo.customerEmail }}
        </p>
        <p v-if="statusInfo.amountTotal">
          <strong>金额：</strong>{{ statusInfo.amountTotal }} {{ statusInfo.currency }}
        </p>
        <p v-if="statusInfo.failureReason" class="error-message">
          <strong>失败原因：</strong>{{ statusInfo.failureReason }}
        </p>
      </div>

      <!-- 操作按钮 -->
      <div class="actions">
        <button @click="retry" class="btn-primary">
          重新支付
        </button>
        <button @click="goHome" class="btn-secondary">
          返回首页
        </button>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-card">
      <h2>⚠️ 获取状态失败</h2>
      <p>{{ error }}</p>
      <button @click="goHome" class="btn-secondary">返回首页</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const statusInfo = ref(null)
const error = ref(null)

// 获取支付状态
const checkPaymentStatus = async () => {
  // 从 URL 获取 session_id
  const sessionId = route.query.session_id

  if (!sessionId) {
    error.value = '未找到支付会话信息'
    loading.value = false
    return
  }

  try {
    const response = await fetch(
      `http://localhost:3000/check-payment-status?session_id=${sessionId}`
    )
    
    if (!response.ok) {
      throw new Error('获取状态失败')
    }

    const data = await response.json()
    statusInfo.value = data
    
    console.log('支付状态:', data)

  } catch (err) {
    console.error('查询支付状态失败:', err)
    error.value = '无法获取支付状态，请稍后重试'
  } finally {
    loading.value = false
  }
}

// 返回首页
const goHome = () => {
  router.push('/')
}

// 重新支付
const retry = () => {
  router.push('/home')
}

// 页面加载时查询状态
onMounted(() => {
  checkPaymentStatus()
})
</script>

<style scoped>
.cancel-container {
  max-width: 600px;
  margin: 50px auto;
  padding: 20px;
  text-align: center;
}

.loading {
  padding: 60px 20px;
  color: #666;
}

.status-card, .error-card {
  background: white;
  border-radius: 12px;
  padding: 40px 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.icon.user_cancelled {
  opacity: 0.8;
}

.icon.payment_failed {
  color: #dc2626;
}

.icon.expired {
  color: #f59e0b;
}

h1 {
  font-size: 28px;
  margin-bottom: 20px;
  color: #1f2937;
}

.details {
  background: #f9fafb;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  text-align: left;
}

.details p {
  margin: 10px 0;
  color: #4b5563;
}

.error-message {
  color: #dc2626 !important;
  background: #fee2e2;
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px !important;
}

.actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 30px;
}

.btn-primary, .btn-secondary {
  padding: 12px 32px;
  font-size: 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #635bff;
  color: white;
}

.btn-primary:hover {
  background: #4f46e5;
  transform: translateY(-1px);
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.error-card h2 {
  color: #dc2626;
  margin-bottom: 15px;
}
</style>
