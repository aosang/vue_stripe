<template>
  <div class="success-container">
    <!-- 加载中 -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>正在获取订阅信息...</p>
    </div>

    <!-- 加载失败 -->
    <div v-else-if="error" class="error">
      <h1>❌ 获取信息失败</h1>
      <p>{{ error }}</p>
    </div>

    <!-- 加载成功 -->
    <div v-else-if="sessionInfo" class="success">
      <h1>🎉 订阅成功！</h1>
      <p class="thank-you">感谢您的订阅！</p>

      <!-- 订阅周期信息 -->
      <div class="info-card">
        <h2>📅 订阅周期</h2>
        <div class="info-row">
          <span class="label">当前周期开始：</span>
          <span class="value">{{ sessionInfo.currentPeriodStart || '加载中...' }}</span>
        </div>
        <div class="info-row">
          <span class="label">当前周期结束：</span>
          <span class="value">{{ sessionInfo.currentPeriodEnd || '加载中...' }}</span>
        </div>
      </div>

      <div class="actions">
        <button @click="goHome" class="btn-primary">返回首页</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const error = ref(null)
const sessionInfo = ref(null)

// 获取订阅日期信息
const fetchSessionInfo = async (sessionId) => {
  try {
    const response = await fetch(`http://localhost:3000/get-session-info?session_id=${sessionId}`)
    
    if (!response.ok) {
      throw new Error('获取订阅信息失败')
    }

    const data = await response.json()
    console.log(data)
    sessionInfo.value = data
  } catch (err) {
    error.value = err.message
    console.error('Error fetching session info:', err)
  } finally {
    loading.value = false
  }
}

// 返回首页
const goHome = () => {
  router.push('/home')
}

// 页面加载时获取信息
onMounted(() => {
  const sessionId = route.query.session_id
  
  if (!sessionId) {
    error.value = '未找到 session_id 参数'
    loading.value = false
    return
  }

  fetchSessionInfo(sessionId)
})
</script>

<style scoped>
.success-container {
  max-width: 800px;
  margin: 50px auto;
  padding: 20px;
}

.loading {
  text-align: center;
  padding: 50px;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  text-align: center;
  padding: 50px;
  color: #dc3545;
}

.success {
  text-align: center;
}

.success h1 {
  color: #28a745;
  margin-bottom: 10px;
}

.thank-you {
  font-size: 18px;
  color: #666;
  margin-bottom: 30px;
}

.info-card {
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
  text-align: left;
}

.info-card h2 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
  font-size: 20px;
  border-bottom: 2px solid #007bff;
  padding-bottom: 10px;
}

.subscription h2 {
  border-bottom-color: #28a745;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  font-weight: 600;
  color: #555;
}

.value {
  color: #333;
  text-align: right;
}

.amount {
  font-size: 20px;
  font-weight: bold;
  color: #28a745;
}

.code {
  font-family: monospace;
  font-size: 12px;
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 3px;
}

.success-badge {
  background: #28a745;
  color: white;
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 14px;
}

.active-badge {
  background: #28a745;
  color: white;
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 14px;
}

.item {
  padding: 15px 0;
  border-bottom: 1px solid #eee;
}

.item:last-child {
  border-bottom: none;
}

.item-description {
  font-weight: 600;
  margin-bottom: 5px;
  color: #333;
}

.item-detail {
  display: flex;
  justify-content: space-between;
  color: #666;
  font-size: 14px;
}

.item-amount {
  font-weight: bold;
  color: #28a745;
}

.actions {
  margin-top: 30px;
}

.btn-primary {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary:hover {
  background-color: #0056b3;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}
</style>
