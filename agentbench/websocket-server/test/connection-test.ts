import { AgentBenchWebSocketIntegration } from '../src/websocket-integration'
import { AgentBenchWebSocketService } from '../../agentbench-assistant/src/lib/websocket-service'
import { TestEvent } from '../../agentbench-assistant/src/types/automation'

// 连接测试配置
interface ConnectionTestConfig {
  serverPort: number
  clientCount: number
  maxReconnectAttempts: number
  reconnectInterval: number
  enableLogging: boolean
}

// 连接测试结果
interface ConnectionTestResult {
  testName: string
  totalConnections: number
  successfulConnections: number
  failedConnections: number
  averageConnectionTime: number
  maxConnectionTime: number
  minConnectionTime: number
  reconnectionAttempts: number
  successfulReconnections: number
  averageReconnectionTime: number
  disconnections: number
}

export class WebSocketConnectionTester {
  private server: AgentBenchWebSocketIntegration
  private clients: AgentBenchWebSocketService[] = []
  private results: ConnectionTestResult[] = []
  private isRunning = false

  constructor() {
    this.server = new AgentBenchWebSocketIntegration({
      port: 3002,
      authConfig: {
        jwtSecret: 'test-secret-key',
        jwtExpiry: 15 * 60 * 1000,
        refreshExpiry: 7 * 24 * 60 * 60 * 1000,
        issuer: 'agentbench-test',
        audience: 'agentbench-websocket-test'
      },
      enableMetrics: true,
      enableLogging: false,
      maxSessions: 1000,
      sessionTimeout: 60000
    })
  }

  async start(): Promise<void> {
    await this.server.start()
    console.log('🚀 Connection test server started on port 3002')
  }

  async stop(): Promise<void> {
    this.server.stop()
    for (const client of this.clients) {
      client.disconnect()
    }
    this.clients = []
    console.log('🛑 Connection test server stopped')
  }

  // 获取连接测试场景
  getConnectionTestScenarios(): { name: string; config: ConnectionTestConfig }[] {
    return [
      {
        name: 'Basic Connection Test',
        config: {
          serverPort: 3002,
          clientCount: 10,
          maxReconnectAttempts: 3,
          reconnectInterval: 1000,
          enableLogging: false
        }
      },
      {
        name: 'High Volume Connection Test',
        config: {
          serverPort: 3002,
          clientCount: 50,
          maxReconnectAttempts: 5,
          reconnectInterval: 2000,
          enableLogging: false
        }
      },
      {
        name: 'Reconnection Stress Test',
        config: {
          serverPort: 3002,
          clientCount: 20,
          maxReconnectAttempts: 10,
          reconnectInterval: 500,
          enableLogging: false
        }
      }
    ]
  }

  // 执行连接测试
  async runConnectionTest(name: string, config: ConnectionTestConfig): Promise<ConnectionTestResult> {
    console.log(`\n🔗 Running connection test: ${name}`)
    
    const startTime = Date.now()
    let successfulConnections = 0
    let failedConnections = 0
    let totalConnectionTime = 0
    let maxConnectionTime = 0
    let minConnectionTime = Infinity
    let reconnectionAttempts = 0
    let successfulReconnections = 0
    let totalReconnectionTime = 0
    let disconnections = 0

    this.isRunning = true

    try {
      // 测试初始连接
      console.log(`📡 Testing initial connections for ${config.clientCount} clients...`)
      
      for (let i = 0; i < config.clientCount; i++) {
        const result = await this.testSingleConnection(i, config)
        
        if (result.success) {
          successfulConnections++
          totalConnectionTime += result.connectionTime
          maxConnectionTime = Math.max(maxConnectionTime, result.connectionTime)
          minConnectionTime = Math.min(minConnectionTime, result.connectionTime)
        } else {
          failedConnections++
        }
      }

      // 等待所有连接稳定
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 测试重连机制
      console.log('🔄 Testing reconnection mechanism...')
      
      for (let i = 0; i < this.clients.length; i++) {
        const client = this.clients[i]
        
        // 强制断开连接
        client.disconnect()
        disconnections++
        
        // 等待一段时间后重连
        await new Promise(resolve => setTimeout(resolve, config.reconnectInterval))
        
        const reconnectResult = await this.testReconnection(client, i, config)
        
        if (reconnectResult.success) {
          successfulReconnections++
          totalReconnectionTime += reconnectResult.reconnectionTime
        }
        
        reconnectionAttempts++
      }

      // 测试并发连接
      console.log('🚀 Testing concurrent connections...')
      await this.testConcurrentConnections(config)

      const result: ConnectionTestResult = {
        testName: name,
        totalConnections: config.clientCount,
        successfulConnections,
        failedConnections,
        averageConnectionTime: successfulConnections > 0 ? totalConnectionTime / successfulConnections : 0,
        maxConnectionTime: maxConnectionTime === Infinity ? 0 : maxConnectionTime,
        minConnectionTime: minConnectionTime === Infinity ? 0 : minConnectionTime,
        reconnectionAttempts,
        successfulReconnections,
        averageReconnectionTime: successfulReconnections > 0 ? totalReconnectionTime / successfulReconnections : 0,
        disconnections
      }

      this.results.push(result)
      console.log(`✅ Connection test completed: ${name}`)
      this.logConnectionTestResult(result)

      return result

    } catch (error) {
      console.error(`❌ Connection test failed: ${name}`, error)
      throw error
    } finally {
      this.isRunning = false
      await this.cleanupClients()
    }
  }

  // 测试单个连接
  private async testSingleConnection(index: number, config: ConnectionTestConfig): Promise<{ success: boolean; connectionTime: number }> {
    const startTime = Date.now()
    
    try {
      const token = this.server.generateWebSocketToken({
        id: `conn-test-user-${index}`,
        username: `conn-test-user-${index}`,
        email: `conn-test-${index}@example.com`,
        role: 'evaluator',
        permissions: ['run:automated_tests']
      })

      const client = new AgentBenchWebSocketService(
        {
          url: `ws://localhost:${config.serverPort}`,
          token,
          enableLogging: config.enableLogging,
          autoReconnect: true,
          reconnectInterval: config.reconnectInterval
        },
        {
          sessionCreated: (sessionId, data) => {
            if (config.enableLogging) {
              console.log(`Client ${index}: Session created ${sessionId}`)
            }
          },
          sessionStarted: (sessionId) => {
            if (config.enableLogging) {
              console.log(`Client ${index}: Session started ${sessionId}`)
            }
          },
          sessionStopped: (sessionId) => {
            if (config.enableLogging) {
              console.log(`Client ${index}: Session stopped ${sessionId}`)
            }
          },
          testEventReceived: (event) => {
            // 处理接收到的测试事件
          },
          testResultUpdated: (result) => {
            // 处理测试结果更新
          },
          userJoined: (clientId) => {
            // 处理用户加入
          },
          userLeft: (clientId) => {
            // 处理用户离开
          }
        }
      )

      await client.connect()
      this.clients.push(client)
      
      const connectionTime = Date.now() - startTime
      
      // 验证连接是否成功
      if (client.isConnected()) {
        return { success: true, connectionTime }
      } else {
        return { success: false, connectionTime }
      }

    } catch (error) {
      const connectionTime = Date.now() - startTime
      console.error(`Client ${index} connection failed:`, error)
      return { success: false, connectionTime }
    }
  }

  // 测试重连
  private async testReconnection(client: AgentBenchWebSocketService, index: number, config: ConnectionTestConfig): Promise<{ success: boolean; reconnectionTime: number }> {
    const startTime = Date.now()
    
    try {
      // 尝试重连
      client.reconnect()
      
      // 等待重连完成
      let attempts = 0
      while (attempts < config.maxReconnectAttempts && !client.isConnected()) {
        await new Promise(resolve => setTimeout(resolve, config.reconnectInterval))
        attempts++
      }

      const reconnectionTime = Date.now() - startTime
      
      return { success: client.isConnected(), reconnectionTime }

    } catch (error) {
      const reconnectionTime = Date.now() - startTime
      console.error(`Client ${index} reconnection failed:`, error)
      return { success: false, reconnectionTime }
    }
  }

  // 测试并发连接
  private async testConcurrentConnections(config: ConnectionTestConfig): Promise<void> {
    console.log('🔄 Testing concurrent connection/disconnection...')
    
    const concurrentClients: AgentBenchWebSocketService[] = []
    
    try {
      // 同时创建多个连接
      const connectionPromises = []
      for (let i = 0; i < 10; i++) {
        const promise = this.testSingleConnection(
          this.clients.length + i, 
          config
        )
        connectionPromises.push(promise)
      }

      const results = await Promise.all(connectionPromises)
      const successfulConcurrent = results.filter(r => r.success).length
      console.log(`✅ Concurrent connections: ${successfulConcurrent}/10 successful`)

      // 同时断开所有连接
      for (const client of concurrentClients) {
        client.disconnect()
      }

      await new Promise(resolve => setTimeout(resolve, 1000))

      // 同时重连所有连接
      const reconnectionPromises = concurrentClients.map((client, index) => 
        this.testReconnection(client, this.clients.length + index, config)
      )

      const reconnectionResults = await Promise.all(reconnectionPromises)
      const successfulReconnections = reconnectionResults.filter(r => r.success).length
      console.log(`✅ Concurrent reconnections: ${successfulReconnections}/10 successful`)

    } finally {
      // 清理并发客户端
      for (const client of concurrentClients) {
        client.disconnect()
      }
    }
  }

  // 清理客户端
  private async cleanupClients(): Promise<void> {
    console.log('🧹 Cleaning up clients...')
    for (const client of this.clients) {
      try {
        client.disconnect()
      } catch (error) {
        console.error('Error disconnecting client:', error)
      }
    }
    this.clients = []
    console.log('✅ All clients cleaned up')
  }

  // 记录连接测试结果
  private logConnectionTestResult(result: ConnectionTestResult): void {
    console.log('\n📊 Connection Test Results:')
    console.log(`  Test Name: ${result.testName}`)
    console.log(`  Total Connections: ${result.totalConnections}`)
    console.log(`  Successful Connections: ${result.successfulConnections}`)
    console.log(`  Failed Connections: ${result.failedConnections}`)
    console.log(`  Connection Success Rate: ${((result.successfulConnections / result.totalConnections) * 100).toFixed(2)}%`)
    console.log(`  Average Connection Time: ${result.averageConnectionTime.toFixed(2)}ms`)
    console.log(`  Max Connection Time: ${result.maxConnectionTime.toFixed(2)}ms`)
    console.log(`  Min Connection Time: ${result.minConnectionTime.toFixed(2)}ms`)
    console.log(`  Reconnection Attempts: ${result.reconnectionAttempts}`)
    console.log(`  Successful Reconnections: ${result.successfulReconnections}`)
    console.log(`  Reconnection Success Rate: ${result.reconnectionAttempts > 0 ? ((result.successfulReconnections / result.reconnectionAttempts) * 100).toFixed(2) : 0}%`)
    console.log(`  Average Reconnection Time: ${result.averageReconnectionTime.toFixed(2)}ms`)
  }

  // 获取所有测试结果
  getResults(): ConnectionTestResult[] {
    return [...this.results]
  }

  // 生成连接测试报告
  generateConnectionReport(): string {
    if (this.results.length === 0) {
      return 'No connection test results available'
    }

    let report = '🔗 WebSocket Connection Test Report\n'
    report += '='.repeat(50) + '\n\n'

    this.results.forEach(result => {
      report += `Test: ${result.testName}\n`
      report += `  Connection Success Rate: ${((result.successfulConnections / result.totalConnections) * 100).toFixed(2)}%\n`
      report += `  Avg Connection Time: ${result.averageConnectionTime.toFixed(2)}ms\n`
      report += `  Reconnection Success Rate: ${result.reconnectionAttempts > 0 ? ((result.successfulReconnections / result.reconnectionAttempts) * 100).toFixed(2) : 0}%\n`
      report += `  Avg Reconnection Time: ${result.averageReconnectionTime.toFixed(2)}ms\n`
      report += '\n'
    })

    return report
  }

  // 运行完整连接测试套件
  async runFullConnectionTestSuite(): Promise<void> {
    console.log('🚀 Starting full WebSocket connection test suite...')
    
    const scenarios = this.getConnectionTestScenarios()
    
    for (const scenario of scenarios) {
      try {
        await this.runConnectionTest(scenario.name, scenario.config)
        // 测试间隔，给系统恢复时间
        await new Promise(resolve => setTimeout(resolve, 3000))
      } catch (error) {
        console.error(`Connection test scenario failed: ${scenario.name}`, error)
      }
    }

    console.log('\n🎉 Full connection test suite completed!')
    console.log(this.generateConnectionReport())
  }
}

// 如果直接运行此文件，执行连接测试
if (require.main === module) {
  const tester = new WebSocketConnectionTester()
  
  tester.start().then(() => {
    return tester.runFullConnectionTestSuite()
  }).then(() => {
    return tester.stop()
  }).catch(error => {
    console.error('Connection test failed:', error)
    process.exit(1)
  })
}