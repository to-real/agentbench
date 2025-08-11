import { useState, useEffect, useRef, useCallback } from 'react'
import { AgentBenchWebSocketClient, WebSocketMessage, TestSession, ConnectionState } from '@/lib/websocket-client'

interface UseWebSocketOptions {
  url?: string
  token?: string
  autoConnect?: boolean
  enableLogging?: boolean
}

interface UseWebSocketReturn {
  client: AgentBenchWebSocketClient | null
  state: ConnectionState
  isConnected: boolean
  sessions: TestSession[]
  activeSession: TestSession | null
  connect: () => Promise<void>
  disconnect: () => void
  createSession: (projectId: string, testId: string, agentName: string) => Promise<string>
  joinSession: (sessionId: string) => boolean
  leaveSession: (sessionId: string) => boolean
  startTestSession: (sessionId: string) => boolean
  stopTestSession: (sessionId: string) => boolean
  getSessionInfo: (sessionId: string) => Promise<TestSession>
  getSessionList: () => Promise<TestSession[]>
  sendTestEvent: (sessionId: string, eventType: string, data: any) => boolean
  status: any
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url = 'ws://localhost:3001',
    token,
    autoConnect = true,
    enableLogging = false
  } = options

  const [client, setClient] = useState<AgentBenchWebSocketClient | null>(null)
  const [state, setState] = useState<ConnectionState>('disconnected')
  const [isConnected, setIsConnected] = useState(false)
  const [sessions, setSessions] = useState<TestSession[]>([])
  const [activeSession, setActiveSession] = useState<TestSession | null>(null)
  const [status, setStatus] = useState<any>(null)

  const clientRef = useRef<AgentBenchWebSocketClient | null>(null)

  // 创建 WebSocket 客户端
  const createClient = useCallback(() => {
    const newClient = new AgentBenchWebSocketClient({
      url,
      token,
      enableLogging,
      autoReconnect: true
    })

    // 设置事件监听器
    newClient.on('stateChange', (newState: ConnectionState) => {
      setState(newState)
      setIsConnected(newState === 'connected')
    })

    newClient.on('connected', () => {
      console.log('WebSocket connected')
    })

    newClient.on('disconnected', () => {
      console.log('WebSocket disconnected')
    })

    newClient.on('error', (error) => {
      console.error('WebSocket error:', error)
    })

    newClient.on('sessionCreated', (sessionId: string, session: TestSession) => {
      console.log('Session created:', sessionId)
      setActiveSession(session)
    })

    newClient.on('sessionStarted', (sessionId: string) => {
      console.log('Session started:', sessionId)
      if (activeSession?.id === sessionId) {
        setActiveSession(prev => prev ? { ...prev, status: 'running' as const } : null)
      }
    })

    newClient.on('sessionStopped', (sessionId: string) => {
      console.log('Session stopped:', sessionId)
      if (activeSession?.id === sessionId) {
        setActiveSession(prev => prev ? { ...prev, status: 'completed' as const, endTime: Date.now() } : null)
      }
    })

    newClient.on('testEvent', (message: WebSocketMessage) => {
      console.log('Test event received:', message)
      // 更新活动会话的事件列表
      if (activeSession && message.sessionId === activeSession.id) {
        setActiveSession(prev => {
          if (!prev) return null
          return {
            ...prev,
            events: [...prev.events, {
              id: message.id,
              sessionId: message.sessionId!,
              type: message.data.eventType,
              timestamp: message.timestamp,
              data: message.data
            }]
          }
        })
      }
    })

    return newClient
  }, [url, token, enableLogging])

  // 初始化客户端
  useEffect(() => {
    const newClient = createClient()
    setClient(newClient)
    clientRef.current = newClient

    // 自动连接
    if (autoConnect) {
      newClient.connect()
    }

    // 清理函数
    return () => {
      newClient.disconnect()
    }
  }, [createClient, autoConnect])

  // 定期更新状态
  useEffect(() => {
    if (!isConnected) return

    const interval = setInterval(() => {
      if (clientRef.current) {
        setStatus(clientRef.current.getStatus())
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [isConnected])

  // 定期刷新会话列表
  useEffect(() => {
    if (!isConnected) return

    const refreshSessions = async () => {
      try {
        if (clientRef.current) {
          const sessionList = await clientRef.current.getSessionList()
          setSessions(sessionList)
        }
      } catch (error) {
        console.error('Failed to refresh sessions:', error)
      }
    }

    refreshSessions()
    const interval = setInterval(refreshSessions, 30000) // 30秒刷新一次

    return () => clearInterval(interval)
  }, [isConnected])

  // 连接方法
  const connect = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.connect()
    }
  }, [])

  // 断开连接方法
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect()
    }
  }, [])

  // 创建会话方法
  const createSession = useCallback(async (projectId: string, testId: string, agentName: string) => {
    if (!clientRef.current) {
      throw new Error('WebSocket client not initialized')
    }
    return await clientRef.current.createSession(projectId, testId, agentName)
  }, [])

  // 加入会话方法
  const joinSession = useCallback((sessionId: string) => {
    if (!clientRef.current) return false
    return clientRef.current.joinSession(sessionId)
  }, [])

  // 离开会话方法
  const leaveSession = useCallback((sessionId: string) => {
    if (!clientRef.current) return false
    return clientRef.current.leaveSession(sessionId)
  }, [])

  // 开始测试会话方法
  const startTestSession = useCallback((sessionId: string) => {
    if (!clientRef.current) return false
    return clientRef.current.startTestSession(sessionId)
  }, [])

  // 停止测试会话方法
  const stopTestSession = useCallback((sessionId: string) => {
    if (!clientRef.current) return false
    return clientRef.current.stopTestSession(sessionId)
  }, [])

  // 获取会话信息方法
  const getSessionInfo = useCallback(async (sessionId: string) => {
    if (!clientRef.current) {
      throw new Error('WebSocket client not initialized')
    }
    return await clientRef.current.getSessionInfo(sessionId)
  }, [])

  // 获取会话列表方法
  const getSessionList = useCallback(async () => {
    if (!clientRef.current) {
      throw new Error('WebSocket client not initialized')
    }
    return await clientRef.current.getSessionList()
  }, [])

  // 发送测试事件方法
  const sendTestEvent = useCallback((sessionId: string, eventType: string, data: any) => {
    if (!clientRef.current) return false
    return clientRef.current.sendTestEvent(sessionId, eventType, data)
  }, [])

  return {
    client,
    state,
    isConnected,
    sessions,
    activeSession,
    connect,
    disconnect,
    createSession,
    joinSession,
    leaveSession,
    startTestSession,
    stopTestSession,
    getSessionInfo,
    getSessionList,
    sendTestEvent,
    status
  }
}