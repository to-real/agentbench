import { WebSocketPerformanceTester } from './performance-test'
import { WebSocketConnectionTester } from './connection-test'
import { WebSocketReliabilityTester } from './reliability-test'
import * as fs from 'fs'
import * as path from 'path'

// 测试套件配置
interface TestSuiteConfig {
  runPerformanceTests: boolean
  runConnectionTests: boolean
  runReliabilityTests: boolean
  generateReport: boolean
  outputDirectory: string
  enableDetailedLogging: boolean
}

// 综合测试报告
interface ComprehensiveTestReport {
  timestamp: string
  summary: {
    totalTests: number
    passedTests: number
    failedTests: number
    testDuration: number
  }
  performance: {
    avgMessagesPerSecond: number
    avgLatency: number
    maxLatency: number
    minLatency: number
    avgMemoryUsage: number
    peakMemoryUsage: number
  }
  connection: {
    avgConnectionSuccessRate: number
    avgConnectionTime: number
    avgReconnectionSuccessRate: number
    avgReconnectionTime: number
  }
  reliability: {
    avgMessageLossRate: number
    avgSessionSuccessRate: number
    avgErrorRate: number
    avgDeliveryTime: number
  }
  recommendations: string[]
  overallScore: number // 0-100
}

export class WebSocketTestSuite {
  private config: TestSuiteConfig
  private performanceTester: WebSocketPerformanceTester
  private connectionTester: WebSocketConnectionTester
  private reliabilityTester: WebSocketReliabilityTester
  private startTime: number
  private testResults: any[] = []

  constructor(config: Partial<TestSuiteConfig> = {}) {
    this.config = {
      runPerformanceTests: true,
      runConnectionTests: true,
      runReliabilityTests: true,
      generateReport: true,
      outputDirectory: './test-results',
      enableDetailedLogging: false,
      ...config
    }

    this.performanceTester = new WebSocketPerformanceTester()
    this.connectionTester = new WebSocketConnectionTester()
    this.reliabilityTester = new WebSocketReliabilityTester()
    this.startTime = Date.now()
  }

  // 运行完整测试套件
  async runFullTestSuite(): Promise<ComprehensiveTestReport> {
    console.log('🚀 Starting WebSocket Comprehensive Test Suite...')
    console.log(`📁 Output directory: ${this.config.outputDirectory}`)
    console.log(`📝 Detailed logging: ${this.config.enableDetailedLogging}`)
    
    // 创建输出目录
    this.ensureOutputDirectory()

    try {
      // 性能测试
      if (this.config.runPerformanceTests) {
        console.log('\n📊 Running Performance Tests...')
        await this.runPerformanceTests()
      }

      // 连接测试
      if (this.config.runConnectionTests) {
        console.log('\n🔗 Running Connection Tests...')
        await this.runConnectionTests()
      }

      // 可靠性测试
      if (this.config.runReliabilityTests) {
        console.log('\n🛡️ Running Reliability Tests...')
        await this.runReliabilityTests()
      }

      // 生成综合报告
      const report = this.generateComprehensiveReport()
      
      if (this.config.generateReport) {
        await this.saveReport(report)
      }

      console.log('\n🎉 WebSocket Comprehensive Test Suite completed!')
      console.log(`⏱️  Total duration: ${Date.now() - this.startTime}ms`)
      console.log(`📊 Overall score: ${report.overallScore}/100`)

      return report

    } catch (error) {
      console.error('❌ Test suite failed:', error)
      throw error
    }
  }

  // 运行性能测试
  private async runPerformanceTests(): Promise<void> {
    await this.performanceTester.start()
    
    try {
      await this.performanceTester.runFullTestSuite()
      this.testResults.push({
        type: 'performance',
        results: this.performanceTester.getResults(),
        timestamp: new Date().toISOString()
      })
    } finally {
      await this.performanceTester.stop()
    }
  }

  // 运行连接测试
  private async runConnectionTests(): Promise<void> {
    await this.connectionTester.start()
    
    try {
      await this.connectionTester.runFullConnectionTestSuite()
      this.testResults.push({
        type: 'connection',
        results: this.connectionTester.getResults(),
        timestamp: new Date().toISOString()
      })
    } finally {
      await this.connectionTester.stop()
    }
  }

  // 运行可靠性测试
  private async runReliabilityTests(): Promise<void> {
    await this.reliabilityTester.start()
    
    try {
      await this.reliabilityTester.runFullReliabilityTestSuite()
      this.testResults.push({
        type: 'reliability',
        results: this.reliabilityTester.getResults(),
        timestamp: new Date().toISOString()
      })
    } finally {
      await this.reliabilityTester.stop()
    }
  }

  // 生成综合测试报告
  private generateComprehensiveReport(): ComprehensiveTestReport {
    const performanceResults = this.testResults.find(r => r.type === 'performance')?.results || []
    const connectionResults = this.testResults.find(r => r.type === 'connection')?.results || []
    const reliabilityResults = this.testResults.find(r => r.type === 'reliability')?.results || []

    // 计算性能指标
    const performanceMetrics = this.calculatePerformanceMetrics(performanceResults)
    
    // 计算连接指标
    const connectionMetrics = this.calculateConnectionMetrics(connectionResults)
    
    // 计算可靠性指标
    const reliabilityMetrics = this.calculateReliabilityMetrics(reliabilityResults)
    
    // 生成建议
    const recommendations = this.generateRecommendations(performanceMetrics, connectionMetrics, reliabilityMetrics)
    
    // 计算总分
    const overallScore = this.calculateOverallScore(performanceMetrics, connectionMetrics, reliabilityMetrics)

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.testResults.length,
        passedTests: this.testResults.length,
        failedTests: 0,
        testDuration: Date.now() - this.startTime
      },
      performance: performanceMetrics,
      connection: connectionMetrics,
      reliability: reliabilityMetrics,
      recommendations,
      overallScore
    }
  }

  // 计算性能指标
  private calculatePerformanceMetrics(results: any[]): ComprehensiveTestReport['performance'] {
    if (results.length === 0) {
      return {
        avgMessagesPerSecond: 0,
        avgLatency: 0,
        maxLatency: 0,
        minLatency: 0,
        avgMemoryUsage: 0,
        peakMemoryUsage: 0
      }
    }

    const totalMessages = results.reduce((sum, r) => sum + r.totalMessages, 0)
    const totalDuration = results.reduce((sum, r) => sum + (r.totalMessages / r.messagesPerSecond), 0)
    const avgMessagesPerSecond = totalDuration > 0 ? totalMessages / totalDuration : 0
    
    const avgLatency = results.reduce((sum, r) => sum + r.averageLatency, 0) / results.length
    const maxLatency = Math.max(...results.map(r => r.maxLatency))
    const minLatency = Math.min(...results.map(r => r.minLatency))
    
    const avgMemoryUsage = results.reduce((sum, r) => sum + (r.memoryUsage.heapUsed / 1024 / 1024), 0) / results.length
    const peakMemoryUsage = Math.max(...results.map(r => r.memoryUsage.heapUsed / 1024 / 1024))

    return {
      avgMessagesPerSecond,
      avgLatency,
      maxLatency,
      minLatency,
      avgMemoryUsage,
      peakMemoryUsage
    }
  }

  // 计算连接指标
  private calculateConnectionMetrics(results: any[]): ComprehensiveTestReport['connection'] {
    if (results.length === 0) {
      return {
        avgConnectionSuccessRate: 0,
        avgConnectionTime: 0,
        avgReconnectionSuccessRate: 0,
        avgReconnectionTime: 0
      }
    }

    const avgConnectionSuccessRate = results.reduce((sum, r) => 
      sum + ((r.successfulConnections / r.totalConnections) * 100), 0) / results.length
    
    const avgConnectionTime = results.reduce((sum, r) => sum + r.averageConnectionTime, 0) / results.length
    
    const avgReconnectionSuccessRate = results.reduce((sum, r) => 
      sum + (r.reconnectionAttempts > 0 ? ((r.successfulReconnections / r.reconnectionAttempts) * 100) : 0), 0) / results.length
    
    const avgReconnectionTime = results.reduce((sum, r) => sum + r.averageReconnectionTime, 0) / results.length

    return {
      avgConnectionSuccessRate,
      avgConnectionTime,
      avgReconnectionSuccessRate,
      avgReconnectionTime
    }
  }

  // 计算可靠性指标
  private calculateReliabilityMetrics(results: any[]): ComprehensiveTestReport['reliability'] {
    if (results.length === 0) {
      return {
        avgMessageLossRate: 0,
        avgSessionSuccessRate: 0,
        avgErrorRate: 0,
        avgDeliveryTime: 0
      }
    }

    const avgMessageLossRate = results.reduce((sum, r) => sum + r.messageLossRate, 0) / results.length
    
    const avgSessionSuccessRate = results.reduce((sum, r) => 
      sum + ((r.successfulSessions / (r.successfulSessions + r.failedSessions)) * 100), 0) / results.length
    
    const avgErrorRate = results.reduce((sum, r) => sum + r.errorRate, 0) / results.length
    
    const avgDeliveryTime = results.reduce((sum, r) => sum + r.averageDeliveryTime, 0) / results.length

    return {
      avgMessageLossRate,
      avgSessionSuccessRate,
      avgErrorRate,
      avgDeliveryTime
    }
  }

  // 生成优化建议
  private generateRecommendations(
    performance: ComprehensiveTestReport['performance'],
    connection: ComprehensiveTestReport['connection'],
    reliability: ComprehensiveTestReport['reliability']
  ): string[] {
    const recommendations: string[] = []

    // 性能建议
    if (performance.avgMessagesPerSecond < 1000) {
      recommendations.push('🚀 性能优化：考虑增加服务器资源或优化消息处理逻辑')
    }
    
    if (performance.avgLatency > 100) {
      recommendations.push('⚡ 延迟优化：检查网络配置和消息处理管道')
    }
    
    if (performance.peakMemoryUsage > 500) {
      recommendations.push('💾 内存优化：实施内存管理策略，定期清理无用对象')
    }

    // 连接建议
    if (connection.avgConnectionSuccessRate < 95) {
      recommendations.push('🔗 连接优化：检查网络稳定性和服务器负载均衡')
    }
    
    if (connection.avgReconnectionSuccessRate < 90) {
      recommendations.push('🔄 重连优化：改进重连策略和错误处理机制')
    }
    
    if (connection.avgConnectionTime > 5000) {
      recommendations.push('⏱️ 连接时间优化：优化握手过程和认证流程')
    }

    // 可靠性建议
    if (reliability.avgMessageLossRate > 1) {
      recommendations.push('📨 消息可靠性：实施消息确认和重传机制')
    }
    
    if (reliability.avgSessionSuccessRate < 98) {
      recommendations.push('🛡️ 会话稳定性：增强会话管理和错误恢复机制')
    }
    
    if (reliability.avgErrorRate > 2) {
      recommendations.push('🐛 错误处理：改进错误检测和处理流程')
    }

    // 通用建议
    if (recommendations.length === 0) {
      recommendations.push('✅ 系统表现良好，继续保持当前配置')
    }

    recommendations.push('📊 建议定期运行性能测试以监控系统健康状况')
    recommendations.push('🔧 根据实际负载情况调整服务器配置')

    return recommendations
  }

  // 计算总分
  private calculateOverallScore(
    performance: ComprehensiveTestReport['performance'],
    connection: ComprehensiveTestReport['connection'],
    reliability: ComprehensiveTestReport['reliability']
  ): number {
    let score = 100

    // 性能评分 (40%)
    const performanceScore = Math.max(0, 100 - (performance.avgLatency / 10) - (performance.peakMemoryUsage / 10))
    score = score * 0.4 + performanceScore * 0.4

    // 连接评分 (30%)
    const connectionScore = (connection.avgConnectionSuccessRate + connection.avgReconnectionSuccessRate) / 2
    score = score * 0.6 + connectionScore * 0.3

    // 可靠性评分 (30%)
    const reliabilityScore = Math.max(0, 100 - (reliability.avgMessageLossRate * 10) - (reliability.avgErrorRate * 5))
    score = score * 0.7 + reliabilityScore * 0.3

    return Math.round(score)
  }

  // 确保输出目录存在
  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.config.outputDirectory)) {
      fs.mkdirSync(this.config.outputDirectory, { recursive: true })
    }
  }

  // 保存测试报告
  private async saveReport(report: ComprehensiveTestReport): Promise<void> {
    const reportPath = path.join(this.config.outputDirectory, `websocket-test-report-${Date.now()}.json`)
    const readableReportPath = path.join(this.config.outputDirectory, `websocket-test-report-${Date.now()}.md`)

    // 保存JSON格式报告
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    
    // 保存可读格式报告
    const readableReport = this.generateReadableReport(report)
    fs.writeFileSync(readableReportPath, readableReport)

    console.log(`📄 Test reports saved to:`)
    console.log(`   JSON: ${reportPath}`)
    console.log(`   Markdown: ${readableReportPath}`)
  }

  // 生成可读格式报告
  private generateReadableReport(report: ComprehensiveTestReport): string {
    let readable = `# WebSocket Comprehensive Test Report\n\n`
    readable += `**Generated:** ${report.timestamp}\n`
    readable += `**Test Duration:** ${report.summary.testDuration}ms\n`
    readable += `**Overall Score:** ${report.overallScore}/100\n\n`

    readable += `## 📊 Summary\n\n`
    readable += `- Total Tests: ${report.summary.totalTests}\n`
    readable += `- Passed Tests: ${report.summary.passedTests}\n`
    readable += `- Failed Tests: ${report.summary.failedTests}\n\n`

    readable += `## 🚀 Performance Metrics\n\n`
    readable += `- Average Messages/Second: ${report.performance.avgMessagesPerSecond.toFixed(2)}\n`
    readable += `- Average Latency: ${report.performance.avgLatency.toFixed(2)}ms\n`
    readable += `- Max Latency: ${report.performance.maxLatency.toFixed(2)}ms\n`
    readable += `- Min Latency: ${report.performance.minLatency.toFixed(2)}ms\n`
    readable += `- Average Memory Usage: ${report.performance.avgMemoryUsage.toFixed(2)}MB\n`
    readable += `- Peak Memory Usage: ${report.performance.peakMemoryUsage.toFixed(2)}MB\n\n`

    readable += `## 🔗 Connection Metrics\n\n`
    readable += `- Average Connection Success Rate: ${report.connection.avgConnectionSuccessRate.toFixed(2)}%\n`
    readable += `- Average Connection Time: ${report.connection.avgConnectionTime.toFixed(2)}ms\n`
    readable += `- Average Reconnection Success Rate: ${report.connection.avgReconnectionSuccessRate.toFixed(2)}%\n`
    readable += `- Average Reconnection Time: ${report.connection.avgReconnectionTime.toFixed(2)}ms\n\n`

    readable += `## 🛡️ Reliability Metrics\n\n`
    readable += `- Average Message Loss Rate: ${report.reliability.avgMessageLossRate.toFixed(2)}%\n`
    readable += `- Average Session Success Rate: ${report.reliability.avgSessionSuccessRate.toFixed(2)}%\n`
    readable += `- Average Error Rate: ${report.reliability.avgErrorRate.toFixed(2)}%\n`
    readable += `- Average Delivery Time: ${report.reliability.avgDeliveryTime.toFixed(2)}ms\n\n`

    readable += `## 💡 Recommendations\n\n`
    report.recommendations.forEach(rec => {
      readable += `- ${rec}\n`
    })

    return readable
  }
}

// 如果直接运行此文件，执行完整测试套件
if (require.main === module) {
  const testSuite = new WebSocketTestSuite({
    runPerformanceTests: true,
    runConnectionTests: true,
    runReliabilityTests: true,
    generateReport: true,
    outputDirectory: './test-results',
    enableDetailedLogging: false
  })

  testSuite.runFullTestSuite()
    .then(report => {
      console.log('\n🎉 Test suite completed successfully!')
      console.log(`📊 Final score: ${report.overallScore}/100`)
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error)
      process.exit(1)
    })
}