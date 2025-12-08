# Stripe Webhooks 配置指南

## 📖 什么是 Webhooks？

Webhooks 允许 Stripe 在特定事件发生时（如支付成功、订阅更新等）自动向你的服务器发送通知，让你能实时处理这些事件。

---

## 🚀 本地开发测试（推荐）

在本地开发时，使用 **Stripe CLI** 来测试 Webhooks 最方便。

### 步骤 1：安装 Stripe CLI

**Windows:**
```bash
# 使用 Scoop 安装
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

或者从 [Stripe CLI 下载页面](https://github.com/stripe/stripe-cli/releases/latest) 下载安装包。

### 步骤 2：登录 Stripe CLI

```bash
stripe login
```

这会打开浏览器，让你授权 CLI 访问你的 Stripe 账户。

### 步骤 3：启动本地 Webhook 转发

在终端运行：
```bash
stripe listen --forward-to localhost:3000/webhook
```

你会看到类似这样的输出：
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

**重要：** 复制这个 `whsec_xxxxxxxxxxxxx` 密钥！

### 步骤 4：配置环境变量

在 `server/.env` 文件中添加：
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### 步骤 5：测试 Webhook

保持 `stripe listen` 运行，在另一个终端触发测试事件：
```bash
# 测试支付成功事件
stripe trigger checkout.session.completed

# 测试订阅创建事件
stripe trigger customer.subscription.created
```

你应该能在服务器控制台看到事件日志！

---

## 🌐 生产环境配置

当部署到生产环境时，需要在 Stripe Dashboard 配置 Webhooks。

### 步骤 1：在 Stripe Dashboard 添加端点

1. 登录 [Stripe Dashboard](https://dashboard.stripe.com/)
2. 进入 **开发者 > Webhooks**（Developers > Webhooks）
3. 点击 **+ Add destination** 或 **+ Add endpoint**
4. 填写信息：
   - **端点 URL**: `https://你的域名.com/webhook`
   - **描述**: 可选，如 "生产环境 Webhook"
5. 点击 **Select events**，选择你需要监听的事件：
   - `checkout.session.completed` - 支付成功
   - `customer.subscription.created` - 订阅创建
   - `customer.subscription.updated` - 订阅更新
   - `customer.subscription.deleted` - 订阅取消
   - `invoice.payment_succeeded` - 发票支付成功
   - `invoice.payment_failed` - 发票支付失败
6. 点击 **Add endpoint**

### 步骤 2：获取 Signing Secret

1. 在 Webhooks 页面，点击刚创建的端点
2. 找到 **Signing secret** 部分
3. 点击 **Reveal** 显示密钥
4. 复制形如 `whsec_xxxxxxxxxxxxx` 的密钥

### 步骤 3：配置生产环境变量

在生产服务器的 `.env` 文件中添加：
```env
STRIPE_WEBHOOK_SECRET=whsec_你的生产环境密钥
```

---

## 🔒 安全最佳实践

1. ✅ **验证签名**: 代码中已经实现了签名验证，不要移除这部分代码
2. ✅ **使用 HTTPS**: 生产环境必须使用 HTTPS
3. ✅ **保密密钥**: 不要将 `STRIPE_WEBHOOK_SECRET` 提交到版本控制
4. ✅ **快速响应**: Webhook 处理应该在 5 秒内返回 200 响应

---

## 📝 处理的事件类型

当前代码处理以下事件：

| 事件类型 | 说明 | 触发时机 |
|---------|------|----------|
| `checkout.session.completed` | 支付成功 | 用户完成支付 |
| `customer.subscription.created` | 订阅创建 | 新订阅创建 |
| `customer.subscription.updated` | 订阅更新 | 订阅信息变更 |
| `customer.subscription.deleted` | 订阅取消 | 订阅被取消 |
| `invoice.payment_succeeded` | 发票支付成功 | 定期扣款成功 |
| `invoice.payment_failed` | 发票支付失败 | 定期扣款失败 |

---

## 🐛 故障排查

### 问题：Webhook 签名验证失败

**解决方案：**
- 确保使用 `express.raw()` 而不是 `express.json()` 处理 webhook 路由
- 检查 `STRIPE_WEBHOOK_SECRET` 是否正确配置
- 使用 Stripe CLI 时，确保使用 `stripe listen` 输出的密钥

### 问题：没有收到 Webhook 事件

**本地开发：**
- 确保 `stripe listen` 正在运行
- 检查转发地址是否正确

**生产环境：**
- 检查端点 URL 是否可公开访问
- 查看 Stripe Dashboard 中的 Webhook 日志
- 确保服务器防火墙允许 Stripe 的 IP 访问

### 问题：事件重复处理

Stripe 可能重复发送同一事件，建议：
- 使用 `event.id` 做幂等性检查
- 在数据库中记录已处理的事件 ID

---

## 📚 更多资源

- [Stripe Webhooks 文档](https://docs.stripe.com/webhooks)
- [Stripe CLI 文档](https://docs.stripe.com/cli)
- [所有 Webhook 事件类型](https://docs.stripe.com/api/events/types)

