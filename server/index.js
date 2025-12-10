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
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature']
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event

  try {
    // 验证 webhook 签名
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
  } catch (err) {
    console.error('⚠️ Webhook 签名验证失败:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // 处理不同的事件类型
  // console.log('🔄 收到 Webhook 事件:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object
        console.log('💳 支付成功！Session ID:', session.id)
        console.log('客户邮箱:', session.customer_email)
        
        // 获取完整的客户信息
        if (session.customer) {
          const customer = await stripe.customers.retrieve(session.customer)
          console.log('客户信息:', {
            id: customer.id,
            email: customer.email,
            name: customer.name
          })
        }
        // TODO: 在这里处理支付成功后的业务逻辑（如发送邮件、更新数据库等）
        break

      case 'customer.subscription.created':
        const subscription = event.data.object
        console.log('🎉 订阅创建成功！Subscription ID:', subscription.id)
        
        // 获取客户信息
        if (subscription.customer) {
          const customer = await stripe.customers.retrieve(subscription.customer)
          console.log('订阅客户:', {
            id: customer.id,
            email: customer.email,
            name: customer.name
          })
        }
        // TODO: 处理订阅创建逻辑
        break

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object
        console.log('⚠️ 支付失败！Invoice ID:', failedInvoice.id)
        
        // 获取客户信息以便通知
        if (failedInvoice.customer) {
          const customer = await stripe.customers.retrieve(failedInvoice.customer)
          console.log('支付失败的客户:', customer.email)
          // TODO: 发送支付失败通知邮件
        }
        break    
      }
  } catch (error) {
    console.error('处理 Webhook 事件时出错:', error.message)
    // 即使处理失败，也返回 200，避免 Stripe 重复发送
  }

  // 返回 200 响应告诉 Stripe 已收到事件
  res.json({received: true})
})

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
      cancel_url: `${frontendUrl}/cancel?session_id={CHECKOUT_SESSION_ID}`,
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
  
    // 如果是订阅模式，获取订阅日期（返回原始时间戳）
    if (session.mode === 'subscription' && session.subscription) {
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)

      // 打印完整的订阅对象，查看所有字段
      console.log('完整的订阅对象:', JSON.stringify(subscription))

      console.log('current_period_end:', dayjs(subscription.items.data[0].current_period_end * 1000).format('YYYY-MM-DD HH:mm:ss'))
      console.log('current_period_start:', dayjs(subscription.items.data[0].current_period_start * 1000).format('YYYY-MM-DD HH:mm:ss'))
    }

    res.json(sessionInfo)
  } catch (error) {
    console.error('Error retrieving session:', error)
    res.status(500).json({ error: 'Failed to retrieve session information' })
  }
})

// 检查支付/订阅状态（用于取消页面）
app.get('/check-payment-status', async (req, res) => {
  const { session_id } = req.query

  if (!session_id) {
    return res.status(400).json({ error: 'session_id is required' })
  }

  try {
    // 获取 Checkout Session
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['payment_intent', 'subscription']
    })

    // 判断状态
    let statusInfo = {
      sessionId: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
      mode: session.mode,
      amountTotal: session.amount_total / 100,
      currency: session.currency.toUpperCase(),
      customerEmail: session.customer_email || session.customer_details?.email
    }

    // 根据不同状态返回友好提示
    if (session.status === 'complete') {
      statusInfo.message = '支付成功'
      statusInfo.type = 'success'
    } else if (session.status === 'expired') {
      statusInfo.message = '支付链接已过期'
      statusInfo.type = 'expired'
    } else if (session.status === 'open') {
      // 检查是用户取消还是支付失败
      if (session.payment_status === 'unpaid') {
        statusInfo.message = '您取消了支付'
        statusInfo.type = 'user_cancelled'
      } else if (session.payment_status === 'failed') {
        statusInfo.message = '支付失败，请重试'
        statusInfo.type = 'payment_failed'
      } else {
        statusInfo.message = '支付未完成'
        statusInfo.type = 'incomplete'
      }
    }

    // 如果有 payment_intent，获取失败原因
    if (session.payment_intent && session.payment_intent.last_payment_error) {
      statusInfo.failureReason = session.payment_intent.last_payment_error.message
    }

    console.log('📊 支付状态查询:', statusInfo)

    res.json(statusInfo)

  } catch (error) {
    console.error('Error checking payment status:', error)
    res.status(500).json({ error: 'Failed to check payment status' })
  }
})

// 获取所有订阅用户列表
app.get('/subscriptions/all', async(req, res) => {
  const { status = 'all' } = req.query

  try {
    const allSubscriptions = []

    // 使用 for await of 自动分页获取所有订阅
    for await (const subscription of stripe.subscriptions.list({
      status: status === 'active' ? status : undefined,
      expand: ['data.customer'], // 展开客户信息
      limit: 100  // 每次获取100条
    })) {
      allSubscriptions.push(subscription)
    }

    // 提取所有用户的邮箱、姓名和订阅时间
    const mydata = allSubscriptions.map(sub => {
      // 获取订阅项中的时间字段
      const subscriptionItem = sub.items.data[0]
      
      return {
        // 用户信息
        email: sub.customer.email || '无邮箱',
        name: sub.customer.name || '未设置',
        customerId: sub.customer.id,
        
        // 订阅信息
        subscriptionId: sub.id,
        status: sub.status,
        
        // 订阅时间（格式化为可读格式）
        createdAt: dayjs(sub.created * 1000).format('YYYY-MM-DD HH:mm:ss'),
        periodStart: dayjs(subscriptionItem.current_period_start * 1000).format('YYYY-MM-DD HH:mm:ss'),
        periodEnd: dayjs(subscriptionItem.current_period_end * 1000).format('YYYY-MM-DD HH:mm:ss'),
      }
    })

    console.log('用户数据:', mydata)
    console.log('总数:', mydata.length)

    res.json({
      success: true,
      data: mydata,
      total: mydata.length
    })
    // 格式化数据，提取需要的字段
    // const formattedData = allSubscriptions.map(sub => {
    //   return {
    //     // 订阅信息
    //     subscriptionId: sub.id,
    //     status: sub.status,
    //     statusText: {
    //       'active': '活跃',
    //       'canceled': '已取消',
    //       'past_due': '逾期',
    //       'trialing': '试用中',
    //       'unpaid': '未支付',
    //       'incomplete': '未完成'
    //     }[sub.status] || sub.status,

    //     // 用户信息
    //     customerEmail: sub.customer.email || '无邮箱',
    //     customerName: sub.customer.name || '未设置',
    //     customerId: sub.customer.id,

    //     // 订阅套餐信息
    //     planId: sub.items.data[0].price.id,
    //     planName: sub.items.data[0].price.nickname || '未命名套餐',
    //     amount: (sub.items.data[0].price.unit_amount / 100).toFixed(2),
    //     currency: sub.items.data[0].price.currency.toUpperCase(),
    //     interval: sub.items.data[0].price.recurring.interval === 'month' ? '月' : '年',

    //     // 订阅时间（已转换为易读格式）
    //     createdAt: dayjs(sub.created * 1000).format('YYYY-MM-DD HH:mm:ss'),
    //     periodStart: dayjs(sub.current_period_start * 1000).format('YYYY-MM-DD HH:mm:ss'),
    //     periodEnd: dayjs(sub.current_period_end * 1000).format('YYYY-MM-DD HH:mm:ss'),

    //     // 原始时间戳（如果前端需要）
    //     createdTimestamp: sub.created,
    //     periodStartTimestamp: sub.current_period_start,
    //     periodEndTimestamp: sub.current_period_end,

    //     // 取消信息
    //     cancelAtPeriodEnd: sub.cancel_at_period_end,
    //     canceledAt: sub.canceled_at ? dayjs(sub.canceled_at * 1000).format('YYYY-MM-DD HH:mm:ss') : null
    //   }
    // })

    // res.json({
    //   success: true,
    //   data: formattedData,
    //   total: formattedData.length
    // })

  }catch(error) {
    console.error('获取订阅列表失败:', error)
    res.status(500).json({ 
      success: false,
      error: '获取订阅列表失败' 
    })
  }
})

app.listen(3000, () => {
  console.log('Server is running on port 3000')
})