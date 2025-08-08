import { NextRequest, NextResponse } from 'next/server'
import { createGLMService } from '@/lib/glm-service'

export async function POST(request: NextRequest) {
  try {
    const { agentName, testCase, evidence } = await request.json()

    if (!agentName || !testCase) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    try {
      const glmService = createGLMService()
      const evaluation = await glmService.evaluateAgent(agentName, testCase, evidence || [])

      return NextResponse.json(evaluation)
    } catch (error) {
      console.error('GLM API error:', error)
      
      // 如果GLM API不可用，返回模拟数据
      return NextResponse.json({
        first_try_success_rate: 3,
        first_try_completion_rate: 3,
        first_try_usability: 3,
        problem_understanding: 3,
        planning_ability: 3,
        requirement_clarification: 3,
        communication_clarity: 3,
        feedback_response: 3,
        code_efficiency: 3,
        resource_optimization: 3,
        code_quality: 3,
        maintainability: 3,
        scalability: 3,
        error_handling: 3,
        documentation: 3,
        notes: 'AI评分服务暂时不可用，已使用默认评分。请手动调整各项分数。'
      })
    }
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}