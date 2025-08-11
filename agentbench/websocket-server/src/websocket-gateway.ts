import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import jwt from 'jsonwebtoken'
import { EventEmitter } from 'events'

// 消息类型定义
export interface WebSocketMessage {
  id: string
  type: 'test_event' | 'control_command' | 'system_message' | 'heartbeat' | 'error'
  timestamp: number
  sessionId?: string
  data: any
  metadata?: {
    priority: 'low' | 'normal' | 'high' | 'critical'
    requiresAck: boolean
    retryCount: number
    ttl?: number
  }
}

// 认证用户信息
export interface AuthenticatedUser {
  id: string
  username: string
  role: 'admin' | 'evaluator' | 'viewer'
  projectId?: string
  permissions: string[]
}

// WebSocket客户端状态
export interface ClientState {
  id: string
  userId: string
  user: AuthenticatedUser
  connectedAt: number
  lastPing: number
  isActive: boolean
  sessionIds: string[]
  subscriptions: string[]
}

// 消息队列项
export interface QueuedMessage {
  message: WebSocketMessage
  targetClientId?: string
  targetSessionId?: string
  timestamp: number
  attempts: number
  maxAttempts: number
}

export class AgentBenchWebSocketGateway extends EventEmitter {
  private wss: WebSocketServer
  private server: any
  private clientMap: Map<string, ClientState> = new Map()
  private messageQueue: QueuedMessage[] = []
  private jwtSecret: string
  private heartbeatInterval: NodeJS.Timeout | null = null
  private queueProcessorInterval: NodeJS.Timeout | null = null
  
  // 配置类型
  private config: {
    port: number
    heartbeatInterval: number
    messageTimeout: number
    maxRetries: number
    queueProcessInterval: number
    maxQueueSize: number
    tokenExpiry: number
  }

  private getConfig() {
    return {
      port: 3001,
      heartbeatInterval: 30000, // 30秒
      messageTimeout: 10000, // 10秒
      maxRetries: 3,
      queueProcessInterval: 100, // 100ms
      maxQueueSize: 1000,
      tokenExpiry: 15 * 60 * 1000 // 15分钟
    }
  }

  constructor(jwtSecret: string, options: Partial<typeof this.config> = {}) {
    super()
    this.jwtSecret = jwtSecret
    const defaultConfig = {
      port: 3001,
      heartbeatInterval: 30000, // 30秒
      messageTimeout: 10000, // 10秒
      maxRetries: 3,
      queueProcessInterval: 100, // 100ms
      maxQueueSize: 1000,
      tokenExpiry: 15 * 60 * 1000 // 15分钟
    }
    this.config = { ...defaultConfig, ...options }
    
    // 创建HTTP服务器
    this.server = createServer()
    
    // 创建WebSocket服务器
    this.wss = new WebSocketServer({ 
      server: this.server,
      maxPayload: 1024 * 1024 // 1MB
    })
    
    this.setupWebSocketServer()
    this.startHeartbeat()
    this.startQueueProcessor()
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleConnection(ws, req)
    })

    this.wss.on('error', (error: any) => {
      console.error('WebSocket server error:', error)
      this.emit('serverError', error)
    })

    this.server.on('error', (error: any) => {
      console.error('HTTP server error:', error)
      this.emit('serverError', error)
    })
  }

  private async handleConnection(ws: WebSocket, req: any): Promise<void> {
    try {
      // 从URL参数获取token
      const requestUrl = new URL(req.url, `http://${req.headers.host}`)
      const token = requestUrl.searchParams.get('token') || 
                   req.headers['authorization']?.replace('Bearer ', '')

      if (!token) {
        ws.close(1008, 'Missing authentication token')
        return
      }

      // 验证JWT token
      const decoded = jwt.verify(token, this.jwtSecret) as any
      const user: AuthenticatedUser = {
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        projectId: decoded.projectId,
        permissions: decoded.permissions || []
      }

      const clientId = this.generateClientId()
      
      // 创建客户端状态
      const clientState: ClientState = {
        id: clientId,
        userId: user.id,
        user,
        connectedAt: Date.now(),
        lastPing: Date.now(),
        isActive: true,
        sessionIds: [],
        subscriptions: []
      }

      this.clientMap.set(clientId, clientState)
      
      // 为WebSocket添加自定义属性
      (ws as any).clientId = clientId
      (ws as any).isAlive = true

      console.log(`Client connected: ${clientId} (${user.username})`)
      this.emit('clientConnected', { clientId, user })

      // 发送连接成功消息
      this.sendToClient(ws, {
        id: this.generateMessageId(),
        type: 'system_message',
        timestamp: Date.now(),
        data: {
          type: 'connection_established',
          clientId,
          message: 'WebSocket连接已建立'
        },
        metadata: {
          priority: 'high',
          requiresAck: false,
          retryCount: 0
        }
      })

      // 设置消息处理器
      ws.on('message', (data) => {
        this.handleMessage(ws, data, clientId)
      })

      ws.on('pong', () => {
        (ws as any).isAlive = true
        const client = this.clientMap.get(clientId)
        if (client) {
          client.lastPing = Date.now()
        }
      })

      ws.on('close', (code, reason) => {
        this.handleDisconnection(clientId, code, reason.toString())
      })

      ws.on('error', (error) => {
        console.error(`Client error (${clientId}):`, error)
        this.handleDisconnection(clientId, 1006, 'Connection error')
      })

    } catch (error) {
      console.error('Connection authentication failed:', error)
      ws.close(1008, 'Authentication failed')
    }
  }

  private handleMessage(ws: WebSocket, data: any, clientId: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString())
      
      // 验证消息格式
      if (!this.validateMessage(message)) {
        this.sendError(ws, 'Invalid message format', clientId)
        return
      }

      // 更新客户端活动状态
      const client = this.clientMap.get(clientId)
      if (client) {
        client.lastPing = Date.now()
      }

      // 处理不同类型的消息
      switch (message.type) {
        case 'heartbeat':
          this.handleHeartbeat(ws, clientId)
          break
          
        case 'test_event':
          this.handleTestEvent(message, clientId)
          break
          
        case 'control_command':
          this.handleControlCommand(message, clientId)
          break
          
        default:
          console.warn(`Unknown message type: ${message.type}`)
          this.sendError(ws, 'Unknown message type', clientId)
      }

      // 如果需要确认，发送ACK
      if (message.metadata?.requiresAck) {
        this.sendAck(ws, message.id, clientId)
      }

      this.emit('messageReceived', { message, clientId })

    } catch (error) {
      console.error('Message handling error:', error)
      this.sendError(ws, 'Message processing failed', clientId)
    }
  }

  private handleTestEvent(message: WebSocketMessage, clientId: string): void {
    const client = this.clientMap.get(clientId)
    if (!client) return

    // 广播测试事件给相关订阅者
    if (message.sessionId) {
      this.broadcastToSession(message.sessionId, message, clientId)
    }
    
    // 触发事件
    this.emit('testEvent', { message, clientId, user: client.user })
  }

  private handleControlCommand(message: WebSocketMessage, clientId: string): void {
    const client = this.clientMap.get(clientId)
    if (!client) return

    // 处理控制命令
    switch (message.data.command) {
      case 'subscribe_session':
        this.subscribeToSession(clientId, message.data.sessionId)
        break
        
      case 'unsubscribe_session':
        this.unsubscribeFromSession(clientId, message.data.sessionId)
        break
        
      case 'start_test':
        this.emit('startTest', { sessionId: message.data.sessionId, clientId })
        break
        
      case 'stop_test':
        this.emit('stopTest', { sessionId: message.data.sessionId, clientId })
        break
        
      default:
        console.warn(`Unknown control command: ${message.data.command}`)
    }
  }

  private handleHeartbeat(ws: WebSocket, clientId: string): void {
    ws.pong()
  }

  private handleDisconnection(clientId: string, code: number, reason: string): void {
    const client = this.clientMap.get(clientId)
    if (client) {
      console.log(`Client disconnected: ${clientId} (${client.user.username}) - ${reason}`)
      this.clientMap.delete(clientId)
      this.emit('clientDisconnected', { clientId, user: client.user, code, reason })
    }
  }

  // 消息发送方法
  public sendToClient(ws: WebSocket, message: WebSocketMessage): void {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message))
      }
    } catch (error) {
      console.error('Failed to send message to client:', error)
    }
  }

  public sendToClientId(clientId: string, message: WebSocketMessage): boolean {
    const client = this.clientMap.get(clientId)
    if (!client) return false

    // 找到对应的WebSocket连接
    const ws = this.findWebSocketByClientId(clientId)
    if (ws) {
      this.sendToClient(ws, message)
      return true
    }

    return false
  }

  public broadcast(message: WebSocketMessage, excludeClientId?: string): void {
    this.wss.clients.forEach((ws) => {
      const clientId = (ws as any).clientId
      if (clientId !== excludeClientId && ws.readyState === WebSocket.OPEN) {
        this.sendToClient(ws, message)
      }
    })
  }

  public broadcastToSession(sessionId: string, message: WebSocketMessage, excludeClientId?: string): void {
    this.clientMap.forEach((client, clientId) => {
      if (clientId !== excludeClientId && client.sessionIds.includes(sessionId)) {
        this.sendToClientId(clientId, message)
      }
    })
  }

  public queueMessage(message: WebSocketMessage, targetClientId?: string, targetSessionId?: string): void {
    if (this.messageQueue.length >= this.config.maxQueueSize) {
      console.warn('Message queue full, dropping oldest message')
      this.messageQueue.shift()
    }

    const queuedMessage: QueuedMessage = {
      message,
      targetClientId,
      targetSessionId,
      timestamp: Date.now(),
      attempts: 0,
      maxAttempts: this.config.maxRetries
    }

    this.messageQueue.push(queuedMessage)
  }

  // 会话管理
  public subscribeToSession(clientId: string, sessionId: string): void {
    const client = this.clientMap.get(clientId)
    if (client && !client.sessionIds.includes(sessionId)) {
      client.sessionIds.push(sessionId)
      
      // 通知客户端订阅成功
      this.sendToClientId(clientId, {
        id: this.generateMessageId(),
        type: 'system_message',
        timestamp: Date.now(),
        data: {
          type: 'session_subscribed',
          sessionId
        },
        metadata: {
          priority: 'normal',
          requiresAck: false,
          retryCount: 0
        }
      })
    }
  }

  public unsubscribeFromSession(clientId: string, sessionId: string): void {
    const client = this.clientMap.get(clientId)
    if (client) {
      client.sessionIds = client.sessionIds.filter(id => id !== sessionId)
    }
  }

  // 辅助方法
  private findWebSocketByClientId(clientId: string): WebSocket | null {
    for (const ws of this.wss.clients) {
      if ((ws as any).clientId === clientId && ws.readyState === WebSocket.OPEN) {
        return ws
      }
    }
    return null
  }

  private sendError(ws: WebSocket, error: string, clientId: string): void {
    this.sendToClient(ws, {
      id: this.generateMessageId(),
      type: 'error',
      timestamp: Date.now(),
      data: { error, clientId },
      metadata: {
        priority: 'high',
        requiresAck: false,
        retryCount: 0
      }
    })
  }

  private sendAck(ws: WebSocket, messageId: string, clientId: string): void {
    this.sendToClient(ws, {
      id: this.generateMessageId(),
      type: 'system_message',
      timestamp: Date.now(),
      data: {
        type: 'ack',
        originalMessageId: messageId
      },
      metadata: {
        priority: 'normal',
        requiresAck: false,
        retryCount: 0
      }
    })
  }

  private validateMessage(message: any): boolean {
    return message && 
           typeof message.id === 'string' &&
           typeof message.type === 'string' &&
           typeof message.timestamp === 'number' &&
           typeof message.data === 'object'
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // 心跳检测
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const clientId = (ws as any).clientId
        const client = this.clientMap.get(clientId)
        
        if (!client) {
          ws.terminate()
          return
        }

        if (!(ws as any).isAlive) {
          console.log(`Client timeout: ${clientId}`)
          this.handleDisconnection(clientId, 1001, 'Heartbeat timeout')
          ws.terminate()
          return
        }

        (ws as any).isAlive = false
        ws.ping()
      })
    }, this.config.heartbeatInterval)
  }

  // 消息队列处理器
  private startQueueProcessor(): void {
    this.queueProcessorInterval = setInterval(() => {
      this.processMessageQueue()
    }, this.config.queueProcessInterval)
  }

  private processMessageQueue(): void {
    const now = Date.now()
    const processed: number[] = []

    this.messageQueue.forEach((queued, index) => {
      // 检查是否超时
      if (now - queued.timestamp > this.config.messageTimeout) {
        processed.push(index)
        return
      }

      // 检查重试次数
      if (queued.attempts >= queued.maxAttempts) {
        processed.push(index)
        console.warn(`Message delivery failed after ${queued.attempts} attempts`)
        return
      }

      // 尝试发送消息
      let sent = false
      if (queued.targetClientId) {
        sent = this.sendToClientId(queued.targetClientId, queued.message)
      } else if (queued.targetSessionId) {
        // 发送给订阅了特定会话的所有客户端
        this.broadcastToSession(queued.targetSessionId, queued.message)
        sent = true
      }

      if (sent) {
        processed.push(index)
      } else {
        queued.attempts++
      }
    })

    // 清理已处理的消息
    processed.reverse().forEach(index => {
      this.messageQueue.splice(index, 1)
    })
  }

  // 服务器控制
  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, () => {
        console.log(`WebSocket server started on port ${this.config.port}`)
        resolve()
      })
      
      this.server.on('error', reject)
    })
  }

  public stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    if (this.queueProcessorInterval) {
      clearInterval(this.queueProcessorInterval)
    }
    
    this.wss.clients.forEach((ws) => {
      ws.close()
    })
    
    this.wss.close()
    this.server.close()
    
    console.log('WebSocket server stopped')
  }

  // 获取服务器状态
  public getStatus() {
    return {
      port: this.config.port,
      connectedClients: this.clientMap.size,
      messageQueueSize: this.messageQueue.length,
      uptime: process.uptime(),
      clientList: Array.from(this.clients.values()).map(client => ({
        id: client.id,
        userId: client.userId,
        username: client.user.username,
        connectedAt: client.connectedAt,
        lastPing: client.lastPing,
        isActive: client.isActive,
        sessionIds: client.sessionIds,
        subscriptions: client.subscriptions
      }))
    }
  }

  // 生成JWT令牌
  public generateToken(user: AuthenticatedUser): string {
    return jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        projectId: user.projectId,
        permissions: user.permissions
      },
      this.jwtSecret,
      { expiresIn: this.config.tokenExpiry / 1000 }
    )
  }
}