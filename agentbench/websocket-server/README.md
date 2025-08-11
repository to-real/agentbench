# AgentBench WebSocket Server

WebSocket 服务器为 AgentBench 自动化评测系统提供实时通信功能。

## 功能特性

- **实时双向通信**: 支持浏览器扩展与主应用之间的低延迟通信
- **JWT 认证**: 基于 JSON Web Token 的安全认证机制
- **会话管理**: 支持测试会话的创建、加入和管理
- **消息可靠性**: 内置消息队列、重试机制和确认机制
- **心跳检测**: 自动检测连接状态并处理断线重连
- **事件广播**: 支持向特定会话的参与者广播事件
- **性能监控**: 实时监控连接状态和系统性能

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量

```bash
# JWT 密钥（生产环境请使用强密码）
export JWT_SECRET="your-super-secret-jwt-key"

# WebSocket 服务器端口
export WS_PORT=3001

# 是否启用指标收集
export ENABLE_METRICS=true

# 是否启用日志记录
export ENABLE_LOGGING=true

# 最大会话数量
export MAX_SESSIONS=100

# 会话超时时间（毫秒）
export SESSION_TIMEOUT=1800000

# 是否生成示例令牌
export GENERATE_SAMPLE_TOKENS=true
```

### 构建和运行

```bash
# 构建项目
npm run build

# 启动服务器
npm start

# 开发模式运行
npm run dev
```

服务器启动后将在 `ws://localhost:3001` 监听连接。

## 使用方法

### 1. 服务器端

```typescript
import { AgentBenchWebSocketIntegration } from './src/websocket-integration'

const integration = new AgentBenchWebSocketIntegration({
  port: 3001,
  authConfig: {
    jwtSecret: 'your-secret-key',
    jwtExpiry: 15 * 60 * 1000, // 15分钟
    refreshExpiry: 7 * 24 * 60 * 60 * 1000, // 7天
    issuer: 'agentbench',
    audience: 'agentbench-websocket'
  },
  enableMetrics: true,
  enableLogging: true,
  maxSessions: 100,
  sessionTimeout: 1800000 // 30分钟
})

await integration.start()
```

### 2. 客户端（浏览器扩展）

```typescript
import { AgentBenchWebSocketService } from './src/lib/websocket-service'

const service = new AgentBenchWebSocketService(
  {
    url: 'ws://localhost:3001',
    token: 'your-jwt-token',
    enableLogging: true,
    autoReconnect: true
  },
  {
    sessionCreated: (sessionId, data) => {
      console.log('Session created:', sessionId)
    },
    testEventReceived: (event) => {
      console.log('Test event:', event)
    },
    // 其他事件处理器...
  }
)

await service.connect()
```

## API 文档

### 消息格式

所有 WebSocket 消息都遵循以下格式：

```typescript
interface WebSocketMessage {
  id: string                    // 消息唯一标识
  type: 'test_event' | 'control_command' | 'system_message' | 'heartbeat' | 'error'
  timestamp: number             // 时间戳
  sessionId?: string            // 会话ID
  data: any                     // 消息数据
  metadata?: {
    priority: 'low' | 'normal' | 'high' | 'critical'
    requiresAck: boolean        // 是否需要确认
    retryCount: number          // 重试次数
    ttl?: number                // 消息生存时间
  }
}
```

### 控制命令

#### 创建会话

```javascript
{
  "type": "control_command",
  "data": {
    "command": "create_session",
    "projectId": "project-123",
    "testId": "test-456",
    "agentName": "MGX"
  }
}
```

#### 加入会话

```javascript
{
  "type": "control_command",
  "data": {
    "command": "join_session",
    "sessionId": "session-789"
  }
}
```

#### 开始测试

```javascript
{
  "type": "control_command",
  "data": {
    "command": "start_test",
    "sessionId": "session-789"
  }
}
```

### 测试事件

#### 自动化步骤事件

```javascript
{
  "type": "test_event",
  "sessionId": "session-789",
  "data": {
    "eventType": "automation_step",
    "step": "navigate_to_url",
    "status": "completed",
    "context": {
      "sessionId": "session-789",
      "currentStep": 1,
      "totalSteps": 5
    }
  }
}
```

#### 进度更新事件

```javascript
{
  "type": "test_event",
  "sessionId": "session-789",
  "data": {
    "eventType": "progress",
    "current": 3,
    "total": 5,
    "percentage": 60,
    "message": "正在执行测试步骤..."
  }
}
```

## 认证

### 生成 JWT 令牌

```typescript
import { AuthenticationService } from './src/auth-service'

const authService = new AuthenticationService({
  jwtSecret: 'your-secret-key',
  jwtExpiry: 15 * 60 * 1000,
  refreshExpiry: 7 * 24 * 60 * 60 * 1000,
  issuer: 'agentbench',
  audience: 'agentbench-websocket'
})

const user = {
  id: 'user-123',
  username: 'evaluator',
  email: 'evaluator@agentbench.com',
  role: 'evaluator',
  permissions: ['run:automated_tests']
}

const token = authService.generateWebSocketToken(user)
```

### 连接时使用令牌

```javascript
const ws = new WebSocket(`ws://localhost:3001?token=${token}`)
```

## 性能特性

### 连接管理
- 支持多客户端同时连接
- 自动清理过期会话
- 心跳检测和断线重连

### 消息可靠性
- 消息队列和重试机制
- 消息确认和超时处理
- 消息优先级和TTL

### 性能监控
- 实时连接状态监控
- 消息吞吐量统计
- 延迟和错误率监控

## 故障排除

### 常见问题

1. **连接失败**
   - 检查 JWT 令牌是否有效
   - 确认服务器地址和端口
   - 检查网络连接

2. **认证失败**
   - 验证 JWT 密钥是否正确
   - 检查令牌是否过期
   - 确认用户权限

3. **消息丢失**
   - 检查网络连接稳定性
   - 确认消息格式正确
   - 查看服务器日志

### 日志调试

启用详细日志：

```bash
export ENABLE_LOGGING=true
export GENERATE_SAMPLE_TOKENS=true
```

### 性能调优

- 调整心跳间隔：`heartbeatInterval`
- 优化队列大小：`maxQueueSize`
- 配置重试策略：`maxRetries`
- 设置会话超时：`sessionTimeout`

## 安全考虑

- 使用强密码作为 JWT 密钥
- 定期轮换 JWT 密钥
- 限制令牌有效期
- 监控异常连接
- 实施速率限制

## 许可证

MIT License