import { NextRequest, NextResponse } from 'next/server'
import { createGLMService } from '@/lib/glm-service'

export async function POST(request: NextRequest) {
  try {
    const { agentName, testCase, scores, evidence } = await request.json()

    if (!agentName || !testCase || !scores) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    try {
      const glmService = createGLMService()
      const report = await glmService.generateEvaluationReport(
        agentName,
        testCase,
        scores,
        evidence || []
      )

      return NextResponse.json({ report })
    } catch (error) {
      console.error('GLM API error:', error)
      
      // 如果GLM API不可用，返回简单的报告模板
      const simpleReport = `# ${agentName} 评测报告

## 测试用例
**标题：** ${testCase.title}
**描述：** ${testCase.prompt}

## 评测分数

### 核心交付能力
- 首次尝试成功率：${scores.core_delivery_capability?.first_try_success_rate || 'N/A'}/5
- 首次尝试完成率：${scores.core_delivery_capability?.first_try_completion_rate || 'N/A'}/5
- 首次尝试可用性：${scores.core_delivery_capability?.first_try_usability || 'N/A'}/5

### 认知与规划能力
- 问题理解能力：${scores.cognition_planning_capability?.problem_understanding || 'N/A'}/5
- 规划能力：${scores.cognition_planning_capability?.planning_ability || 'N/A'}/5
- 需求澄清能力：${scores.cognition_planning_capability?.requirement_clarification || 'N/A'}/5

### 交互与沟通能力
- 沟通清晰度：${scores.interaction_communication_capability?.communication_clarity || 'N/A'}/5
- 反馈响应能力：${scores.interaction_communication_capability?.feedback_response || 'N/A'}/5

### 效率与资源利用
- 代码效率：${scores.efficiency_resourcefulness_capability?.code_efficiency || 'N/A'}/5
- 资源优化：${scores.efficiency_resourcefulness_capability?.resource_optimization || 'N/A'}/5

### 工程化与可扩展性
- 代码质量：${scores.engineering_scalability_capability?.code_quality || 'N/A'}/5
- 可维护性：${scores.engineering_scalability_capability?.maintainability || 'N/A'}/5
- 可扩展性：${scores.engineering_scalability_capability?.scalability || 'N/A'}/5
- 错误处理：${scores.engineering_scalability_capability?.error_handling || 'N/A'}/5
- 文档质量：${scores.engineering_scalability_capability?.documentation || 'N/A'}/5

## 评分说明
${scores.overall_notes || '暂无评分说明'}

## 总结
此报告为自动生成的简化版本。建议配置GLM API以获得更详细和专业的评测报告。`

      return NextResponse.json({ report: simpleReport })
    }
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}