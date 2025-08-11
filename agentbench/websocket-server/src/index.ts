import { AgentBenchWebSocketIntegration } from './websocket-integration'
import { defaultAuthConfig, sampleUsers } from './auth-service'

// 集成服务配置
const config = {
  port: parseInt(process.env.WS_PORT || '3001'),
  authConfig: {
    ...defaultAuthConfig,
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production'
  },
  enableMetrics: process.env.ENABLE_METRICS !== 'false',
  enableLogging: process.env.ENABLE_LOGGING !== 'false',
  maxSessions: parseInt(process.env.MAX_SESSIONS || '100'),
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '1800000') // 30分钟
}

// 创建集成服务实例
const integration = new AgentBenchWebSocketIntegration(config)

// 设置事件处理器
integration.on('clientConnected', ({ clientId, user }) => {
  console.log(`🔗 Client connected: ${user.username} (${clientId})`)
})

integration.on('clientDisconnected', ({ clientId, user }) => {
  console.log(`🔌 Client disconnected: ${user.username} (${clientId})`)
})

integration.on('sessionCreated', ({ session, clientId }) => {
  console.log(`📋 Session created: ${session.id} by ${clientId}`)
})

integration.on('sessionStarted', ({ session, clientId }) => {
  console.log(`▶️ Session started: ${session.id} by ${clientId}`)
})

integration.on('sessionStopped', ({ session, clientId }) => {
  console.log(`⏹️ Session stopped: ${session.id} by ${clientId}`)
})

integration.on('testEvent', ({ event, session, clientId }) => {
  if (config.enableLogging) {
    console.log(`📊 Test event: ${event.type} in session ${session.id}`)
  }
})

integration.on('metrics', (metrics) => {
  if (config.enableMetrics) {
    console.log(`📈 Metrics: ${metrics.connectedClients} clients, ${metrics.activeSessions} sessions, ${metrics.totalMessages} messages`)
  }
})

integration.on('error', (error) => {
  console.error('❌ Integration error:', error)
})

// 优雅关闭处理
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...')
  integration.stop()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...')
  integration.stop()
  process.exit(0)
})

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error)
  integration.stop()
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason)
  integration.stop()
  process.exit(1)
})

// 启动服务器
async function startServer() {
  try {
    console.log('🚀 Starting AgentBench WebSocket Server...')
    console.log(`📡 Port: ${config.port}`)
    console.log(`🔐 Auth: ${config.authConfig.jwtSecret ? 'Enabled' : 'Disabled'}`)
    console.log(`📊 Metrics: ${config.enableMetrics ? 'Enabled' : 'Disabled'}`)
    console.log(`📝 Logging: ${config.enableLogging ? 'Enabled' : 'Disabled'}`)
    
    await integration.start()
    
    console.log('✅ AgentBench WebSocket Server is running!')
    console.log(`🌐 WebSocket server listening on ws://localhost:${config.port}`)
    
    // 生成示例令牌用于测试
    if (process.env.GENERATE_SAMPLE_TOKENS === 'true') {
      console.log('\n🔑 Sample WebSocket tokens:')
      sampleUsers.forEach(user => {
        const token = integration.generateWebSocketToken(user)
        console.log(`   ${user.username}: ${token}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// 启动服务器
startServer()