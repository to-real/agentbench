import { AgentBenchWebSocketIntegration } from '../src/websocket-integration'
import { AgentBenchWebSocketService } from '../../agentbench-assistant/src/lib/websocket-service'
import { TestEvent, TestExecutionContext } from '../../agentbench-assistant/src/types/automation'

// 性能测试配置
interface PerformanceTestConfig {
  serverPort: number
  clientCount: number
  messagesPerClient: number
  messageSize: number
  testDuration: number
  enableLogging: boolean
}

// 性能测试结果
interface PerformanceTestResult {
  testName: string
  totalMessages: number
  messagesPerSecond: number
  averageLatency: number
  maxLatency: number
  minLatency: number
  connectionTime: number
  errorRate: number
  memoryUsage: NodeJS.MemoryUsage
  cpuUsage: NodeJS.CpuUsage
}

// 负载测试场景
interface LoadTestScenario {
  name: string
  description: string
  config: PerformanceTestConfig
}

export class WebSocketPerformanceTester {
  private server: AgentBenchWebSocketIntegration
  private clients: AgentBenchWebSocketService[] = []
  private results: PerformanceTestResult[] = []
  private isRunning = false

  constructor() {
    this.server = new AgentBenchWebSocketIntegration({
      port: 3001,
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
    console.log('🚀 Performance test server started on port 3001')
  }

  async stop(): Promise<void> {
    this.server.stop()
    for (const client of this.clients) {
      client.disconnect()
    }
    this.clients = []
    console.log('🛑 Performance test server stopped')
  }

  // 预定义的负载测试场景
  getTestScenarios(): LoadTestScenario[] {
    return [
      {
        name: 'Small Load Test',
        description: '少量客户端，低消息频率',
        config: {
          serverPort: 3001,
          clientCount: 10,
          messagesPerClient: 100,
          messageSize: 1024,
          testDuration: 30000,
          enableLogging: false
        }
      },
      {
        name: 'Medium Load Test',
        description: '中等数量客户端，中等消息频率',
        config: {
          serverPort: 3001,
          clientCount: 50,
          messagesPerClient: 200,
          messageSize: 2048,
          testDuration: 60000,
          enableLogging: false
        }
      },
      {
        name: 'High Load Test',
        description: '大量客户端，高消息频率',
        config: {
          serverPort: 3001,
          clientCount: 100,
          messagesPerClient: 500,
          messageSize: 4096,
          testDuration: 120000,
          enableLogging: false
        }
      },
      {
        name: 'Stress Test',
        description: '极限压力测试',
        config: {
          serverPort: 3001,
          clientCount: 200,
          messagesPerClient: 1000,
          messageSize: 8192,
          testDuration: 180000,
          enableLogging: false
        }
      },
      {
        name: 'Latency Test',
        description: '低延迟测试，小消息高频发送',
        config: {
          serverPort: 3001,
          clientCount: 20,
          messagesPerClient: 1000,
          messageSize: 128,
          testDuration: 30000,
          enableLogging: false
        }
      }
    ]
  }

  // 执行单个测试场景
  async runTest(scenario: LoadTestScenario): Promise<PerformanceTestResult> {
    console.log(`\n🧪 Running test: ${scenario.name}`)
    console.log(`📝 Description: ${scenario.description}`)
    console.log(`⚙️  Config: ${JSON.stringify(scenario.config, null, 2)}`)

    const { config } = scenario
    const startTime = Date.now()
    let connectionTime = 0
    let totalMessages = 0
    let totalLatency = 0
    let maxLatency = 0
    let minLatency = Infinity
    let errorCount = 0

    // 记录开始时的系统资源
    const startMemory = process.memoryUsage()
    const startCpu = process.cpuUsage()

    this.isRunning = true

    try {
      // 创建客户端连接
      console.log(`🔗 Creating ${config.clientCount} client connections...`)
      const connectionStartTime = Date.now()

      for (let i = 0; i < config.clientCount; i++) {
        const client = await this.createTestClient(i, config)
        this.clients.push(client)
      }

      connectionTime = Date.now() - connectionStartTime
      console.log(`✅ All clients connected in ${connectionTime}ms`)

      // 等待所有客户端稳定连接
      await this.waitForClientsReady(5000)

      // 开始消息发送测试
      console.log(`📤 Starting message transmission test...`)
      const messagePromises: Promise<void>[] = []

      for (let i = 0; i < this.clients.length; i++) {
        const client = this.clients[i]
        const promise = this.sendTestMessages(client, i, config, (latency) => {
          totalMessages++
          totalLatency += latency
          maxLatency = Math.max(maxLatency, latency)
          minLatency = Math.min(minLatency, latency)
        }, () => {
          errorCount++
        })
        messagePromises.push(promise)
      }

      // 等待所有消息发送完成或超时
      await Promise.race([
        Promise.all(messagePromises),
        new Promise(resolve => setTimeout(resolve, config.testDuration))
      ])

      // 计算最终结果
      const endTime = Date.now()
      const testDuration = (endTime - startTime) / 1000 // 转换为秒
      const messagesPerSecond = totalMessages / testDuration
      const averageLatency = totalMessages > 0 ? totalLatency / totalMessages : 0

      // 记录结束时的系统资源
      const endMemory = process.memoryUsage()
      const endCpu = process.cpuUsage()

      const result: PerformanceTestResult = {
        testName: scenario.name,
        totalMessages,
        messagesPerSecond,
        averageLatency,
        maxLatency: maxLatency === Infinity ? 0 : maxLatency,
        minLatency: minLatency === Infinity ? 0 : minLatency,
        connectionTime,
        errorRate: totalMessages > 0 ? (errorCount / totalMessages) * 100 : 0,
        memoryUsage: endMemory,
        cpuUsage: endCpu
      }

      this.results.push(result)
      console.log(`✅ Test completed: ${scenario.name}`)
      this.logTestResult(result)

      return result

    } catch (error) {
      console.error(`❌ Test failed: ${scenario.name}`, error)
      throw error
    } finally {
      this.isRunning = false
      await this.cleanupClients()
    }
  }

  // 创建测试客户端
  private async createTestClient(index: number, config: PerformanceTestConfig): Promise<AgentBenchWebSocketService> {
    const token = this.server.generateWebSocketToken({
      id: `test-user-${index}`,
      username: `test-user-${index}`,
      email: `test-${index}@example.com`,
      role: 'evaluator',
      permissions: ['run:automated_tests']
    })

    const client = new AgentBenchWebSocketService(
      {
        url: `ws://localhost:${config.serverPort}`,
        token,
        enableLogging: config.enableLogging,
        autoReconnect: false,
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
    return client
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

  // 发送测试消息
  private async sendTestMessages(
    client: AgentBenchWebSocketService,
    clientIndex: number,
    config: PerformanceTestConfig,
    onMessageSent: (latency: number) => void,
    onError: () => void
  ): Promise<void> {
    const testSessionId = `test-session-${clientIndex}`
    
    try {
      // 创建测试会话
      await client.createSession(`test-project-${clientIndex}`, `test-case-${clientIndex}`, `test-agent-${clientIndex}`)
      
      // 发送测试消息
      for (let i = 0; i < config.messagesPerClient && this.isRunning; i++) {
        const startTime = Date.now()
        
        // 生成测试数据
        const testData = this.generateTestData(config.messageSize)
        
        // 发送不同类型的测试事件
        const eventType = ['automation_step', 'progress', 'evidence', 'score_update'][i % 4]
        
        const success = client.sendTestEvent(eventType, {
          step: `test-step-${i}`,
          status: 'completed',
          data: testData,
          clientIndex,
          messageIndex: i
        }, 'normal')

        if (success) {
          const latency = Date.now() - startTime
          onMessageSent(latency)
        } else {
          onError()
        }

        // 控制消息发送频率
        const delay = Math.max(1, config.testDuration / config.messagesPerClient / 1000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }

    } catch (error) {
      console.error(`Client ${clientIndex} failed:`, error)
      onError()
    }
  }

  // 生成测试数据
  private generateTestData(size: number): any {
    const data = {
      timestamp: Date.now(),
      randomData: Math.random().toString(36).repeat(Math.ceil(size / 36)),
      metadata: {
        size,
        generated: true,
        test: true
      }
    }
    return data
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

  // 记录测试结果
  private logTestResult(result: PerformanceTestResult): void {
    console.log('\n📊 Test Results:')
    console.log(`  Test Name: ${result.testName}`)
    console.log(`  Total Messages: ${result.totalMessages}`)
    console.log(`  Messages/Second: ${result.messagesPerSecond.toFixed(2)}`)
    console.log(`  Average Latency: ${result.averageLatency.toFixed(2)}ms`)
    console.log(`  Max Latency: ${result.maxLatency.toFixed(2)}ms`)
    console.log(`  Min Latency: ${result.minLatency.toFixed(2)}ms`)
    console.log(`  Connection Time: ${result.connectionTime}ms`)
    console.log(`  Error Rate: ${result.errorRate.toFixed(2)}%`)
    console.log(`  Memory Usage: ${(result.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`)
  }

  // 获取所有测试结果
  getResults(): PerformanceTestResult[] {
    return [...this.results]
  }

  // 生成性能报告
  generateReport(): string {
    if (this.results.length === 0) {
      return 'No test results available'
    }

    let report = '📈 WebSocket Performance Test Report\n'
    report += '=' .repeat(50) + '\n\n'

    this.results.forEach(result => {
      report += `Test: ${result.testName}\n`
      report += `  Messages/sec: ${result.messagesPerSecond.toFixed(2)}\n`
      report += `  Avg Latency: ${result.averageLatency.toFixed(2)}ms\n`
      report += `  Error Rate: ${result.errorRate.toFixed(2)}%\n`
      report += `  Memory: ${(result.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB\n`
      report += '\n'
    })

    // 计算平均值
    const avgMessagesPerSecond = this.results.reduce((sum, r) => sum + r.messagesPerSecond, 0) / this.results.length
    const avgLatency = this.results.reduce((sum, r) => sum + r.averageLatency, 0) / this.results.length
    const avgErrorRate = this.results.reduce((sum, r) => sum + r.errorRate, 0) / this.results.length

    report += '📊 Summary:\n'
    report += `  Average Messages/sec: ${avgMessagesPerSecond.toFixed(2)}\n`
    report += `  Average Latency: ${avgLatency.toFixed(2)}ms\n`
    report += `  Average Error Rate: ${avgErrorRate.toFixed(2)}%\n`

    return report
  }

  // 运行完整测试套件
  async runFullTestSuite(): Promise<void> {
    console.log('🚀 Starting full WebSocket performance test suite...')
    
    const scenarios = this.getTestScenarios()
    
    for (const scenario of scenarios) {
      try {
        await this.runTest(scenario)
        // 测试间隔，给系统恢复时间
        await new Promise(resolve => setTimeout(resolve, 5000))
      } catch (error) {
        console.error(`Test scenario failed: ${scenario.name}`, error)
      }
    }

    console.log('\n🎉 Full test suite completed!')
    console.log(this.generateReport())
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  const tester = new WebSocketPerformanceTester()
  
  tester.start().then(() => {
    return tester.runFullTestSuite()
  }).then(() => {
    return tester.stop()
  }).catch(error => {
    console.error('Performance test failed:', error)
    process.exit(1)
  })
}