import { AgentBenchWebSocketIntegration } from '../src/websocket-integration'
import { AgentBenchWebSocketService } from '../../agentbench-assistant/src/lib/websocket-service'
import { TestEvent, TestExecutionContext } from '../../agentbench-assistant/src/types/automation'

// 可靠性测试配置
interface ReliabilityTestConfig {
  serverPort: number
  clientCount: number
  messagesPerClient: number
  failureRate: number // 0.0 - 1.0
  testDuration: number
  enableLogging: boolean
}

// 可靠性测试结果
interface ReliabilityTestResult {
  testName: string
  totalMessagesSent: number
  totalMessagesReceived: number
  messageLossRate: number
  averageDeliveryTime: number
  maxDeliveryTime: number
  minDeliveryTime: number
  successfulSessions: number
  failedSessions: number
  errorRate: number
  recoveryTime: number
}

// 模拟的网络故障类型
type NetworkFailureType = 'disconnect' | 'timeout' | 'corruption' | 'delay'

export class WebSocketReliabilityTester {
  private server: AgentBenchWebSocketIntegration
  private clients: AgentBenchWebSocketService[] = []
  private results: ReliabilityTestResult[] = []
  private isRunning = false
  private messageTracker: Map<string, { sentTime: number; received: boolean; receivedTime?: number }> = new Map()

  constructor() {
    this.server = new AgentBenchWebSocketIntegration({
      port: 3003,
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
    console.log('🚀 Reliability test server started on port 3003')
  }

  async stop(): Promise<void> {
    this.server.stop()
    for (const client of this.clients) {
      client.disconnect()
    }
    this.clients = []
    this.messageTracker.clear()
    console.log('🛑 Reliability test server stopped')
  }

  // 获取可靠性测试场景
  getReliabilityTestScenarios(): { name: string; config: ReliabilityTestConfig }[] {
    return [
      {
        name: 'Normal Operation Test',
        config: {
          serverPort: 3003,
          clientCount: 10,
          messagesPerClient: 100,
          failureRate: 0.0,
          testDuration: 30000,
          enableLogging: false
        }
      },
      {
        name: 'Low Failure Rate Test',
        config: {
          serverPort: 3003,
          clientCount: 15,
          messagesPerClient: 200,
          failureRate: 0.05, // 5% failure rate
          testDuration: 60000,
          enableLogging: false
        }
      },
      {
        name: 'High Failure Rate Test',
        config: {
          serverPort: 3003,
          clientCount: 20,
          messagesPerClient: 150,
          failureRate: 0.15, // 15% failure rate
          testDuration: 90000,
          enableLogging: false
        }
      },
      {
        name: 'Extreme Conditions Test',
        config: {
          serverPort: 3003,
          clientCount: 25,
          messagesPerClient: 100,
          failureRate: 0.25, // 25% failure rate
          testDuration: 120000,
          enableLogging: false
        }
      }
    ]
  }

  // 执行可靠性测试
  async runReliabilityTest(name: string, config: ReliabilityTestConfig): Promise<ReliabilityTestResult> {
    console.log(`\n🛡️ Running reliability test: ${name}`)
    console.log(`⚙️  Config: ${JSON.stringify(config, null, 2)}`)

    const startTime = Date.now()
    let totalMessagesSent = 0
    let totalMessagesReceived = 0
    let totalDeliveryTime = 0
    let maxDeliveryTime = 0
    let minDeliveryTime = Infinity
    let successfulSessions = 0
    let failedSessions = 0
    let errorCount = 0
    let recoveryStartTime = 0
    let recoveryTime = 0

    this.isRunning = true
    this.messageTracker.clear()

    try {
      // 创建客户端连接
      console.log(`🔗 Creating ${config.clientCount} client connections...`)
      
      for (let i = 0; i < config.clientCount; i++) {
        const client = await this.createReliabilityTestClient(i, config)
        this.clients.push(client)
      }

      // 等待所有客户端连接
      await this.waitForClientsReady(5000)

      // 开始可靠性测试
      console.log(`📤 Starting reliability test with ${config.failureRate * 100}% failure rate...`)
      
      const testPromises: Promise<void>[] = []
      
      for (let i = 0; i < this.clients.length; i++) {
        const client = this.clients[i]
        const promise = this.runReliabilityTestForClient(client, i, config, (messageId, deliveryTime) => {
          totalMessagesReceived++
          totalDeliveryTime += deliveryTime
          maxDeliveryTime = Math.max(maxDeliveryTime, deliveryTime)
          minDeliveryTime = Math.min(minDeliveryTime, deliveryTime)
        }, (messageId) => {
          totalMessagesSent++
        }, () => {
          errorCount++
        })
        testPromises.push(promise)
      }

      // 在测试过程中模拟网络故障
      this.simulateNetworkFailures(config)

      // 等待测试完成或超时
      await Promise.race([
        Promise.all(testPromises),
        new Promise(resolve => setTimeout(resolve, config.testDuration))
      ])

      // 计算消息丢失率
      const lostMessages = Array.from(this.messageTracker.values()).filter(msg => !msg.received).length
      const messageLossRate = totalMessagesSent > 0 ? (lostMessages / totalMessagesSent) * 100 : 0

      // 统计会话成功率
      successfulSessions = this.clients.filter(client => client.isConnected()).length
      failedSessions = this.clients.length - successfulSessions

      const result: ReliabilityTestResult = {
        testName: name,
        totalMessagesSent,
        totalMessagesReceived,
        messageLossRate,
        averageDeliveryTime: totalMessagesReceived > 0 ? totalDeliveryTime / totalMessagesReceived : 0,
        maxDeliveryTime: maxDeliveryTime === Infinity ? 0 : maxDeliveryTime,
        minDeliveryTime: minDeliveryTime === Infinity ? 0 : minDeliveryTime,
        successfulSessions,
        failedSessions,
        errorRate: totalMessagesSent > 0 ? (errorCount / totalMessagesSent) * 100 : 0,
        recoveryTime
      }

      this.results.push(result)
      console.log(`✅ Reliability test completed: ${name}`)
      this.logReliabilityTestResult(result)

      return result

    } catch (error) {
      console.error(`❌ Reliability test failed: ${name}`, error)
      throw error
    } finally {
      this.isRunning = false
      await this.cleanupClients()
    }
  }

  // 创建可靠性测试客户端
  private async createReliabilityTestClient(index: number, config: ReliabilityTestConfig): Promise<AgentBenchWebSocketService> {
    const token = this.server.generateWebSocketToken({
      id: `reliability-test-user-${index}`,
      username: `reliability-test-user-${index}`,
      email: `reliability-test-${index}@example.com`,
      role: 'evaluator',
      permissions: ['run:automated_tests']
    })

    const client = new AgentBenchWebSocketService(
      {
        url: `ws://localhost:${config.serverPort}`,
        token,
        enableLogging: config.enableLogging,
        autoReconnect: true,
        reconnectInterval: 1000
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
          this.handleReceivedMessage(event.id, Date.now())
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
    return client
  }

  // 为单个客户端运行可靠性测试
  private async runReliabilityTestForClient(
    client: AgentBenchWebSocketService,
    clientIndex: number,
    config: ReliabilityTestConfig,
    onMessageReceived: (messageId: string, deliveryTime: number) => void,
    onMessageSent: (messageId: string) => void,
    onError: () => void
  ): Promise<void> {
    const testSessionId = `reliability-session-${clientIndex}`
    
    try {
      // 创建测试会话
      await client.createSession(`reliability-project-${clientIndex}`, `reliability-case-${clientIndex}`, `reliability-agent-${clientIndex}`)
      
      // 发送测试消息
      for (let i = 0; i < config.messagesPerClient && this.isRunning; i++) {
        const messageId = `msg-${clientIndex}-${i}-${Date.now()}`
        const sentTime = Date.now()
        
        // 跟踪消息
        this.messageTracker.set(messageId, {
          sentTime,
          received: false
        })
        
        // 随机决定是否模拟故障
        const shouldFail = Math.random() < config.failureRate
        
        if (shouldFail) {
          // 模拟消息发送失败
          await this.simulateMessageFailure(client, messageId, config)
          onError()
        } else {
          // 正常发送消息
          const success = client.sendTestEvent('reliability_test', {
            messageId,
            clientIndex,
            messageIndex: i,
            timestamp: sentTime,
            testData: this.generateReliabilityTestData()
          }, 'normal')

          if (success) {
            onMessageSent(messageId)
          } else {
            onError()
          }
        }

        // 控制消息发送频率
        const delay = Math.max(10, config.testDuration / config.messagesPerClient / 1000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }

    } catch (error) {
      console.error(`Client ${clientIndex} reliability test failed:`, error)
      onError()
    }
  }

  // 处理接收到的消息
  private handleReceivedMessage(messageId: string, receivedTime: number): void {
    const messageInfo = this.messageTracker.get(messageId)
    
    if (messageInfo && !messageInfo.received) {
      messageInfo.received = true
      messageInfo.receivedTime = receivedTime
    }
  }

  // 模拟网络故障
  private async simulateNetworkFailures(config: ReliabilityTestConfig): Promise<void> {
    if (config.failureRate === 0) return

    const failureTypes: NetworkFailureType[] = ['disconnect', 'timeout', 'corruption', 'delay']
    
    // 定期模拟网络故障
    const simulateFailure = async () => {
      if (!this.isRunning) return

      const failureType = failureTypes[Math.floor(Math.random() * failureTypes.length)]
      const randomClient = this.clients[Math.floor(Math.random() * this.clients.length)]

      if (randomClient) {
        switch (failureType) {
          case 'disconnect':
            console.log('🔌 Simulating client disconnect...')
            randomClient.disconnect()
            setTimeout(() => randomClient.reconnect(), 2000)
            break
            
          case 'timeout':
            console.log('⏱️ Simulating network timeout...')
            // 模拟网络超时，客户端会自动重连
            break
            
          case 'corruption':
            console.log('🗑️ Simulating data corruption...')
            // 模拟数据损坏，通过发送格式错误的消息
            break
            
          case 'delay':
            console.log('⏰ Simulating network delay...')
            // 模拟网络延迟，通过延迟发送消息
            break
        }
      }

      // 随机间隔后再次模拟故障
      if (this.isRunning) {
        const nextFailureDelay = Math.random() * 10000 + 5000 // 5-15秒
        setTimeout(simulateFailure, nextFailureDelay)
      }
    }

    // 开始模拟故障
    setTimeout(simulateFailure, 5000)
  }

  // 模拟消息发送失败
  private async simulateMessageFailure(client: AgentBenchWebSocketService, messageId: string, config: ReliabilityTestConfig): Promise<void> {
    console.log(`❌ Simulating message failure for ${messageId}`)
    
    // 模拟不同的失败场景
    const failureScenario = Math.random()
    
    if (failureScenario < 0.33) {
      // 场景1: 暂时断开连接
      client.disconnect()
      setTimeout(() => client.reconnect(), 1000)
    } else if (failureScenario < 0.66) {
      // 场景2: 网络延迟
      await new Promise(resolve => setTimeout(resolve, 3000))
    } else {
      // 场景3: 消息丢失（不执行任何操作）
    }
  }

  // 生成可靠性测试数据
  private generateReliabilityTestData(): any {
    return {
      reliability: true,
      timestamp: Date.now(),
      checksum: Math.random().toString(36).substring(2, 15),
      sequence: Math.floor(Math.random() * 1000000),
      size: Math.floor(Math.random() * 4096) + 128,
      metadata: {
        testType: 'reliability',
        generated: true
      }
    }
  }

  // 等待客户端准备就绪
  private async waitForClientsReady(timeout: number): Promise<void> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      const readyClients = this.clients.filter(client => client.isConnected()).length
      if (readyClients === this.clients.length) {
        console.log(`✅ All ${this.clients.length} clients are ready`)
        return
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const readyClients = this.clients.filter(client => client.isConnected()).length
    console.log(`⚠️  Only ${readyClients}/${this.clients.length} clients are ready`)
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

  // 记录可靠性测试结果
  private logReliabilityTestResult(result: ReliabilityTestResult): void {
    console.log('\n📊 Reliability Test Results:')
    console.log(`  Test Name: ${result.testName}`)
    console.log(`  Messages Sent: ${result.totalMessagesSent}`)
    console.log(`  Messages Received: ${result.totalMessagesReceived}`)
    console.log(`  Message Loss Rate: ${result.messageLossRate.toFixed(2)}%`)
    console.log(`  Average Delivery Time: ${result.averageDeliveryTime.toFixed(2)}ms`)
    console.log(`  Max Delivery Time: ${result.maxDeliveryTime.toFixed(2)}ms`)
    console.log(`  Min Delivery Time: ${result.minDeliveryTime.toFixed(2)}ms`)
    console.log(`  Successful Sessions: ${result.successfulSessions}`)
    console.log(`  Failed Sessions: ${result.failedSessions}`)
    console.log(`  Session Success Rate: ${((result.successfulSessions / (result.successfulSessions + result.failedSessions)) * 100).toFixed(2)}%`)
    console.log(`  Error Rate: ${result.errorRate.toFixed(2)}%`)
    console.log(`  Recovery Time: ${result.recoveryTime.toFixed(2)}ms`)
  }

  // 获取所有测试结果
  getResults(): ReliabilityTestResult[] {
    return [...this.results]
  }

  // 生成可靠性测试报告
  generateReliabilityReport(): string {
    if (this.results.length === 0) {
      return 'No reliability test results available'
    }

    let report = '🛡️ WebSocket Reliability Test Report\n'
    report += '='.repeat(50) + '\n\n'

    this.results.forEach(result => {
      report += `Test: ${result.testName}\n`
      report += `  Message Loss Rate: ${result.messageLossRate.toFixed(2)}%\n`
      report += `  Session Success Rate: ${((result.successfulSessions / (result.successfulSessions + result.failedSessions)) * 100).toFixed(2)}%\n`
      report += `  Avg Delivery Time: ${result.averageDeliveryTime.toFixed(2)}ms\n`
      report += `  Error Rate: ${result.errorRate.toFixed(2)}%\n`
      report += '\n'
    })

    // 计算平均值
    const avgMessageLossRate = this.results.reduce((sum, r) => sum + r.messageLossRate, 0) / this.results.length
    const avgSessionSuccessRate = this.results.reduce((sum, r) => sum + ((r.successfulSessions / (r.successfulSessions + r.failedSessions)) * 100), 0) / this.results.length
    const avgErrorRate = this.results.reduce((sum, r) => sum + r.errorRate, 0) / this.results.length

    report += '📊 Summary:\n'
    report += `  Average Message Loss Rate: ${avgMessageLossRate.toFixed(2)}%\n`
    report += `  Average Session Success Rate: ${avgSessionSuccessRate.toFixed(2)}%\n`
    report += `  Average Error Rate: ${avgErrorRate.toFixed(2)}%\n`

    return report
  }

  // 运行完整可靠性测试套件
  async runFullReliabilityTestSuite(): Promise<void> {
    console.log('🚀 Starting full WebSocket reliability test suite...')
    
    const scenarios = this.getReliabilityTestScenarios()
    
    for (const scenario of scenarios) {
      try {
        await this.runReliabilityTest(scenario.name, scenario.config)
        // 测试间隔，给系统恢复时间
        await new Promise(resolve => setTimeout(resolve, 5000))
      } catch (error) {
        console.error(`Reliability test scenario failed: ${scenario.name}`, error)
      }
    }

    console.log('\n🎉 Full reliability test suite completed!')
    console.log(this.generateReliabilityReport())
  }
}

// 如果直接运行此文件，执行可靠性测试
if (require.main === module) {
  const tester = new WebSocketReliabilityTester()
  
  tester.start().then(() => {
    return tester.runFullReliabilityTestSuite()
  }).then(() => {
    return tester.stop()
  }).catch(error => {
    console.error('Reliability test failed:', error)
    process.exit(1)
  })
}