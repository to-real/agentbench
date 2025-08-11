// Test file to isolate the issue
import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import jwt from 'jsonwebtoken'
import { EventEmitter } from 'events'

// Simple test class
class TestGateway extends EventEmitter {
  private wss: WebSocketServer
  private server: any
  private clients: Map<string, any> = new Map()
  private jwtSecret: string

  constructor(jwtSecret: string) {
    super()
    this.jwtSecret = jwtSecret
    
    // 创建HTTP服务器
    this.server = createServer()
    
    // 创建WebSocket服务器
    this.wss = new WebSocketServer({ 
      server: this.server,
      maxPayload: 1024 * 1024 // 1MB
    })
    
    this.setupWebSocketServer()
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleConnection(ws, req)
    })
  }

  private handleConnection(ws: WebSocket, req: any): void {
    try {
      const requestUrl = new URL(req.url, `http://${req.headers.host}`)
      const token = requestUrl.searchParams.get('token') || 
                   req.headers['authorization']?.replace('Bearer ', '')

      if (!token) {
        ws.close(1008, 'Missing authentication token')
        return
      }

      const clientId = 'test-client-id'
      
      // 创建客户端状态
      const clientState = {
        id: clientId,
        userId: 'test-user',
        user: { id: 'test-user', username: 'test' },
        connectedAt: Date.now(),
        lastPing: Date.now(),
        isActive: true,
        sessionIds: [],
        subscriptions: []
      }

      this.clients.set(clientId, clientState)
      
      // 为WebSocket添加自定义属性
      (ws as any).clientId = clientId
      (ws as any).isAlive = true

      console.log(`Client connected: ${clientId}`)
    } catch (error) {
      console.error('Connection error:', error)
      ws.close(1008, 'Connection failed')
    }
  }
}

// Export for testing
export { TestGateway }