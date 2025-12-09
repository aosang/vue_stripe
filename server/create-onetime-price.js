// 创建一次性价格的脚本
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

async function createOneTimePrice() {
  try {
    // 你的产品 ID
    const productId = 'prod_TZ6S49VeE9QVbx'
    
    // 创建一次性价格
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: 9900, // 价格（分为单位）：99.00 元
      currency: 'cny', // 货币：人民币
      // ⚠️ 注意：不设置 recurring，表示这是一次性价格
    })
    
    console.log('\n✅ 一次性价格创建成功！')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Price ID:', price.id)
    console.log('类型:', 'One-time（一次性）')
    console.log('价格:', price.unit_amount / 100, price.currency.toUpperCase())
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('📝 请将这个 Price ID 复制到 Home.vue 中：')
    console.log(`priceId: '${price.id}'\n`)
    
  } catch (error) {
    console.error('❌ 创建价格失败:', error.message)
  }
}

createOneTimePrice()

