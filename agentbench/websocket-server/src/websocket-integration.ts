import { AgentBenchWebSocketGateway, WebSocketMessage } from './websocket-gateway'
import { AuthenticationService, User, AuthConfig } from './auth-service'
import { EventEmitter } from 'events'

// 测试会话状态
export interface TestSession {
  id: string
  projectId: string
  testId: string
  agentName: string
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error'
  startTime: number
  endTime?: number
  participants: string[]
  events: TestSessionEvent[]
  metadata: {
    [key: string]: any
  }
}

// 测试会话事件
export interface TestSessionEvent {
  id: string
  sessionId: string
  type: string
  timestamp: number
  data: any
  userId?: string
  metadata?: {
    [key: string]: any
  }
}

// 集成服务配置
export interface WebSocketIntegrationConfig {
  port: number
  authConfig: AuthConfig
  enableMetrics: boolean
  enableLogging: boolean
  maxSessions: number
  sessionTimeout: number
}

// 集成服务统计
export interface IntegrationStats {
  uptime: number
  connectedClients: number
  activeSessions: number
  totalMessages: number
  totalEvents: number
  errorRate: number
  averageLatency: number
}

export class AgentBenchWebSocketIntegration extends EventEmitter {
  private gateway: AgentBenchWebSocketGateway
  private authService: AuthenticationService
  private config: WebSocketIntegrationConfig
  private sessions: Map<string, TestSession> = new Map()
  private stats: IntegrationStats
  private metricsTimer: NodeJS.Timeout | null = null
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor(config: WebSocketIntegrationConfig) {
    super()
    
    this.config = config
    this.authService = new AuthenticationService(config.authConfig)
    this.gateway = new AgentBenchWebSocketGateway(config.authConfig.jwtSecret, {
      port: config.port,
      heartbeatInterval: 30000,
      messageTimeout: 10000
    })

    this.stats = {
      uptime: 0,
      connectedClients: 0,
      activeSessions: 0,
      totalMessages: 0,
      totalEvents: 0,
      errorRate: 0,
      averageLatency: 0
    }

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    // WebSocket服务器事件
    this.gateway.on('clientConnected', ({ clientId, user }) => {
      this.stats.connectedClients++
      this.log(`Client connected: ${user.username} (${clientId})`)
      this.emit('clientConnected', { clientId, user })
    })

    this.gateway.on('clientDisconnected', ({ clientId, user }) => {
      this.stats.connectedClients = Math.max(0, this.stats.connectedClients - 1)
      this.log(`Client disconnected: ${user.username} (${clientId})`)
      this.emit('clientDisconnected', { clientId, user })
    })

    this.gateway.on('messageReceived', ({ message, clientId }) => {
      this.stats.totalMessages++
      this.handleMessage(message, clientId)
    })

    this.gateway.on('testEvent', ({ message, clientId, user }) => {
      this.stats.totalEvents++
      this.handleTestEvent(message, clientId, user)
    })

    this.gateway.on('startTest', ({ sessionId, clientId }) => {
      this.startTestSession(sessionId, clientId)
    })

    this.gateway.on('stopTest', ({ sessionId, clientId }) => {
      this.stopTestSession(sessionId, clientId)
    })

    this.gateway.on('serverError', (error) => {
      this.log('Server error:', error)
      this.emit('error', error)
    })
  }

  // 消息处理
  private handleMessage(message: WebSocketMessage, clientId: string): void {
    const startTime = Date.now()
    
    try {
      switch (message.type) {
        case 'control_command':
          this.handleControlCommand(message, clientId)
          break
          
        default:
          this.log(`Unhandled message type: ${message.type}`)
      }
      
      this.updateLatency(Date.now() - startTime)
      
    } catch (error) {
      this.log('Message handling error:', error)
      this.emit('error', error)
    }
  }

  private handleControlCommand(message: WebSocketMessage, clientId: string): void {
    const { command, ...data } = message.data
    
    switch (command) {
      case 'create_session':
        this.createSession(data, clientId)
        break
        
      case 'join_session':
        this.joinSession(data.sessionId, clientId)
        break
        
      case 'leave_session':
        this.leaveSession(data.sessionId, clientId)
        break
        
      case 'get_session_info':
        this.getSessionInfo(data.sessionId, clientId)
        break
        
      case 'get_session_list':
        this.getSessionList(clientId)
        break
        
      default:
        this.log(`Unknown control command: ${command}`)
    }
  }

  private handleTestEvent(message: WebSocketMessage, clientId: string, user: any): void {
    if (!message.sessionId) {
      this.log('Test event without session ID')
      return
    }

    const session = this.sessions.get(message.sessionId)
    if (!session) {
      this.log(`Test event for unknown session: ${message.sessionId}`)
      return
    }

    // 记录事件
    const event: TestSessionEvent = {
      id: message.id,
      sessionId: message.sessionId,
      type: message.data.eventType,
      timestamp: message.timestamp,
      data: message.data,
      userId: user.userId,
      metadata: message.metadata
    }

    session.events.push(event)
    
    // 广播给会话参与者
    this.broadcastToSession(message.sessionId, {
      id: this.generateMessageId(),
      type: 'test_event',
      timestamp: Date.now(),
      sessionId: message.sessionId,
      data: {
        originalEvent: message,
        processedBy: 'server'
      }
    }, clientId)

    this.emit('testEvent', { event, session, clientId })
  }

  // 会话管理
  public createSession(data: { projectId: string; testId: string; agentName: string }, clientId: string): string {
    const sessionId = this.generateSessionId()
    
    const session: TestSession = {
      id: sessionId,
      projectId: data.projectId,
      testId: data.testId,
      agentName: data.agentName,
      status: 'idle',
      startTime: Date.now(),
      participants: [clientId],
      events: [],
      metadata: {}
    }

    this.sessions.set(sessionId, session)
    this.stats.activeSessions++

    this.log(`Session created: ${sessionId}`)
    
    // 通知客户端
    this.gateway.sendToClientId(clientId, {
      id: this.generateMessageId(),
      type: 'system_message',
      timestamp: Date.now(),
      data: {
        type: 'session_created',
        sessionId,
        session
      }
    })

    this.emit('sessionCreated', { session, clientId })
    return sessionId
  }

  public joinSession(sessionId: string, clientId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      this.sendError(clientId, 'Session not found')
      return false
    }

    if (!session.participants.includes(clientId)) {
      session.participants.push(clientId)
      
      // 订阅会话
      this.gateway.subscribeToSession(clientId, sessionId)
      
      // 通知会话参与者
      this.broadcastToSession(sessionId, {
        id: this.generateMessageId(),
        type: 'system_message',
        timestamp: Date.now(),
        sessionId,
        data: {
          type: 'user_joined',
          clientId
        }
      })
    }

    return true
  }

  public leaveSession(sessionId: string, clientId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return false
    }

    session.participants = session.participants.filter(id => id !== clientId)
    this.gateway.unsubscribeFromSession(clientId, sessionId)

    // 通知会话参与者
    this.broadcastToSession(sessionId, {
      id: this.generateMessageId(),
      type: 'system_message',
      timestamp: Date.now(),
      sessionId,
      data: {
        type: 'user_left',
        clientId
      }
    })

    // 如果没有参与者了，清理会话
    if (session.participants.length === 0) {
      this.cleanupSession(sessionId)
    }

    return true
  }

  public startTestSession(sessionId: string, clientId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      this.sendError(clientId, 'Session not found')
      return false
    }

    if (session.status !== 'idle') {
      this.sendError(clientId, 'Session is not idle')
      return false
    }

    session.status = 'running'
    
    // 通知会话参与者
    this.broadcastToSession(sessionId, {
      id: this.generateMessageId(),
      type: 'system_message',
      timestamp: Date.now(),
      sessionId,
      data: {
        type: 'session_started',
        sessionId
      }
    })

    this.emit('sessionStarted', { session, clientId })
    return true
  }

  public stopTestSession(sessionId: string, clientId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      this.sendError(clientId, 'Session not found')
      return false
    }

    session.status = 'completed'
    session.endTime = Date.now()
    
    // 通知会话参与者
    this.broadcastToSession(sessionId, {
      id: this.generateMessageId(),
      type: 'system_message',
      timestamp: Date.now(),
      sessionId,
      data: {
        type: 'session_stopped',
        sessionId
      }
    })

    this.emit('sessionStopped', { session, clientId })
    
    // 延迟清理会话
    setTimeout(() => this.cleanupSession(sessionId), 5000)
    
    return true
  }

  private cleanupSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      this.sessions.delete(sessionId)
      this.stats.activeSessions = Math.max(0, this.stats.activeSessions - 1)
      this.log(`Session cleaned up: ${sessionId}`)
      this.emit('sessionCleanup', session)
    }
  }

  // 查询方法
  public getSessionInfo(sessionId: string, clientId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) {
      this.sendError(clientId, 'Session not found')
      return
    }

    this.gateway.sendToClientId(clientId, {
      id: this.generateMessageId(),
      type: 'system_message',
      timestamp: Date.now(),
      data: {
        type: 'session_info',
        session
      }
    })
  }

  public getSessionList(clientId: string): void {
    const sessions = Array.from(this.sessions.values()).map(session => ({
      id: session.id,
      projectId: session.projectId,
      testId: session.testId,
      agentName: session.agentName,
      status: session.status,
      participantCount: session.participants.length,
      startTime: session.startTime,
      endTime: session.endTime
    }))

    this.gateway.sendToClientId(clientId, {
      id: this.generateMessageId(),
      type: 'system_message',
      timestamp: Date.now(),
      data: {
        type: 'session_list',
        sessions
      }
    })
  }

  // 辅助方法
  private broadcastToSession(sessionId: string, message: WebSocketMessage, excludeClientId?: string): void {
    this.gateway.broadcastToSession(sessionId, message, excludeClientId)
  }

  private sendError(clientId: string, error: string): void {
    this.gateway.sendToClientId(clientId, {
      id: this.generateMessageId(),
      type: 'error',
      timestamp: Date.now(),
      data: { error }
    })
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private updateLatency(latency: number): void {
    this.stats.averageLatency = (this.stats.averageLatency * 0.9) + (latency * 0.1)
  }

  private log(message: string, ...args: any[]): void {
    if (this.config.enableLogging) {
      console.log(`[WebSocketIntegration] ${message}`, ...args)
    }
  }

  // 服务器控制
  public async start(): Promise<void> {
    await this.gateway.start()
    this.stats.uptime = Date.now()
    
    // 启动定时任务
    this.startMetricsCollection()
    this.startCleanupTask()
    
    this.log('WebSocket integration started')
  }

  public stop(): void {
    this.gateway.stop()
    
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer)
    }
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    
    this.log('WebSocket integration stopped')
  }

  // 定时任务
  private startMetricsCollection(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer)
    }

    this.metricsTimer = setInterval(() => {
      this.collectMetrics()
    }, 30000) // 30秒
  }

  private startCleanupTask(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions()
      this.authService.cleanupExpiredTokens()
    }, 60000) // 1分钟
  }

  private collectMetrics(): void {
    const gatewayStats = this.gateway.getStatus()
    
    const metrics = {
      ...this.stats,
      uptime: Date.now() - this.stats.uptime,
      gateway: gatewayStats,
      auth: this.authService.getStats()
    }

    this.emit('metrics', metrics)
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now()
    let cleanedCount = 0

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.startTime > this.config.sessionTimeout) {
        this.sessions.delete(sessionId)
        cleanedCount++
        this.stats.activeSessions = Math.max(0, this.stats.activeSessions - 1)
        this.emit('sessionExpired', session)
      }
    }

    if (cleanedCount > 0) {
      this.log(`Cleaned up ${cleanedCount} expired sessions`)
    }
  }

  // 认证方法
  public generateWebSocketToken(user: User): string {
    return this.authService.generateWebSocketToken(user)
  }

  public verifyToken(token: string): any {
    return this.authService.verifyWebSocketToken(token)
  }

  // 获取状态
  public getStatus() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.uptime,
      gateway: this.gateway.getStatus(),
      auth: this.authService.getStats(),
      sessions: Array.from(this.sessions.values()).map(s => ({
        id: s.id,
        projectId: s.projectId,
        testId: s.testId,
        agentName: s.agentName,
        status: s.status,
        participantCount: s.participants.length,
        eventCount: s.events.length,
        startTime: s.startTime,
        endTime: s.endTime
      }))
    }
  }
}