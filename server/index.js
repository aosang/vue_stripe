// 加载环境变量 - 必须放在最前面
require('dotenv').config()

const express = require('express')
const app = express()
const cors = require('cors')
const dayjs = require('dayjs')

// 引入stripe依赖，并导入依赖
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

app.use(cors())

// ⚠️ Webhook 路由必须在 express.json() 之前，因为需要原始请求体来验证签名
// app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
//   const sig = req.headers['stripe-signature']
//   const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

//   let event

//   try {
//     // 验证 webhook 签名
//     event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
//   } catch (err) {
//     console.error('⚠️ Webhook 签名验证失败:', err.message)
//     return res.status(400).send(`Webhook Error: ${err.message}`)
//   }

//   // 处理不同的事件类型
//   // console.log('🔄 收到 Webhook 事件:', event.type)

//   try {
//     switch (event.type) {
//       case 'checkout.session.completed':
//         const session = event.data.object
//         console.log('💳 支付成功！Session ID:', session.id)
//         console.log('客户邮箱:', session.customer_email)
        
//         // 获取完整的客户信息
//         if (session.customer) {
//           const customer = await stripe.customers.retrieve(session.customer)
//           console.log('客户信息:', {
//             id: customer.id,
//             email: customer.email,
//             name: customer.name
//           })
//         }
//         // TODO: 在这里处理支付成功后的业务逻辑（如发送邮件、更新数据库等）
//         break

//       case 'customer.subscription.created':
//         const subscription = event.data.object
//         console.log('🎉 订阅创建成功！Subscription ID:', subscription.id)
        
//         // 获取客户信息
//         if (subscription.customer) {
//           const customer = await stripe.customers.retrieve(subscription.customer)
//           console.log('订阅客户:', {
//             id: customer.id,
//             email: customer.email,
//             name: customer.name
//           })
//         }
//         // TODO: 处理订阅创建逻辑
//         break

//       case 'customer.subscription.updated':
//         const updatedSubscription = event.data.object
//         console.log('🔄 订阅更新！Subscription ID:', updatedSubscription.id)
//         console.log('订阅状态:', updatedSubscription.status)
//         // TODO: 处理订阅更新逻辑
//         break

//       case 'customer.subscription.deleted':
//         const deletedSubscription = event.data.object
//         console.log('❌ 订阅取消！Subscription ID:', deletedSubscription.id)
        
//         // 获取客户信息
//         if (deletedSubscription.customer) {
//           const customer = await stripe.customers.retrieve(deletedSubscription.customer)
//           console.log('取消订阅的客户:', customer.email)
//         }
//         // TODO: 处理订阅取消逻辑（如通知用户、更新权限等）
//         break

//       case 'invoice.payment_succeeded':
//         const invoice = event.data.object
//         console.log('💰 发票支付成功！Invoice ID:', invoice.id)
//         console.log('金额:', invoice.amount_paid / 100, invoice.currency.toUpperCase())
//         // TODO: 处理发票支付成功逻辑
//         break

//       case 'invoice.payment_failed':
//         const failedInvoice = event.data.object
//         console.log('⚠️ 发票支付失败！Invoice ID:', failedInvoice.id)
        
//         // 获取客户信息以便通知
//         if (failedInvoice.customer) {
//           const customer = await stripe.customers.retrieve(failedInvoice.customer)
//           console.log('支付失败的客户:', customer.email)
//           // TODO: 发送支付失败通知邮件
//         }
//         break    
//       }
//   } catch (error) {
//     console.error('处理 Webhook 事件时出错:', error.message)
//     // 即使处理失败，也返回 200，避免 Stripe 重复发送
//   }

//   // 返回 200 响应告诉 Stripe 已收到事件
//   res.json({received: true})
// })

app.use(express.json())

//创建订阅
app.post('/create-subscription', async (req, res) => {
  const { paymentMethodId, customerId, priceId } = req.body

  try {
    //创建订阅
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      expand: ['latest_invoice.payment_intent'],
    })

    res.json(subscription)

  }catch(error) {
    console.error('Error creating subscription:', error);
    res.status(500).send('Error creating subscription');
  }
})

// 创建checkout session - 订阅模式（信用卡）
app.post('/create-checkout-session', async (req, res) => {
  const { priceId } = req.body
  
  try {
    // 移除 FRONTEND_URL 末尾可能存在的斜杠，避免出现双斜杠
    const frontendUrl = process.env.FRONTEND_URL.replace(/\/$/, '')
    
    const session = await stripe.checkout.sessions.create({
      // 订阅模式只支持信用卡（支付宝不支持自动续费）
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription', //订阅模式
      // 添加 session_id 到回调 URL，方便前端获取订阅信息
      success_url: `${frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/cancel`,
    })

    // 返回 session.url 用于直接跳转
    res.json({ id: session.id, url: session.url })
  }catch(error) {
    console.error('Error creating checkout session:', error);
    res.status(500).send('Error creating checkout session');
  }
})

// 创建一次性支付 session（支持支付宝）
app.post('/create-payment-session', async (req, res) => {
  const { amount, productName } = req.body
  
  try {
    const frontendUrl = process.env.FRONTEND_URL.replace(/\/$/, '')
    
    const session = await stripe.checkout.sessions.create({
      // 一次性支付支持多种方式
      payment_method_types: ['card', 'alipay'],
      line_items: [
        {
          price_data: {
            currency: 'cny',
            product_data: {
              name: productName || '产品购买',
              description: '一次性购买'
            },
            unit_amount: amount || 9900, // 默认 99 元
          },
          quantity: 1,
        }
      ],
      mode: 'payment', // 一次性支付模式
      // 添加 session_id 到回调 URL
      success_url: `${frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/cancel`,
    })

    res.json({ id: session.id, url: session.url })
  }catch(error) {
    console.error('Error creating payment session:', error);
    res.status(500).send('Error creating payment session');
  }
})

// 获取 Checkout Session 信息（包括订阅详情）
app.get('/get-session-info', async (req, res) => {
  const { session_id } = req.query

  if (!session_id) {
    return res.status(400).json({ error: 'session_id is required' })
  }

  try {
    // 获取 Checkout Session 信息
    const session = await stripe.checkout.sessions.retrieve(session_id)

    const sessionInfo = session
    // console.log('sessionInfo:', session)

  
    // 如果是订阅模式，获取订阅日期（返回原始时间戳）
    if (session.mode === 'subscription' && session.subscription) {
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)

      // 打印完整的订阅对象，查看所有字段
      // console.log('完整的订阅对象:', JSON.stringify(subscription))

      console.log('current_period_end:', dayjs(subscription.items.data[0].current_period_end * 1000).format('YYYY-MM-DD HH:mm:ss'))
      console.log('current_period_start:', dayjs(subscription.items.data[0].current_period_start * 1000).format('YYYY-MM-DD HH:mm:ss'))
    }

    res.json(sessionInfo)
  } catch (error) {
    console.error('Error retrieving session:', error)
    res.status(500).json({ error: 'Failed to retrieve session information' })
  }
})

app.listen(3000, () => {
  console.log('Server is running on port 3000')
})