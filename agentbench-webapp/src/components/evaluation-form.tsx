"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Brain, Loader2, Save } from "lucide-react"

interface EvaluationFormData {
  core_delivery_capability: {
    first_try_success_rate: number
    first_try_completion_rate: number
    first_try_usability: number
    notes: string
  }
  cognition_planning_capability: {
    problem_understanding: number
    planning_ability: number
    requirement_clarification: number
    notes: string
  }
  interaction_communication_capability: {
    communication_clarity: number
    feedback_response: number
    notes: string
  }
  efficiency_resourcefulness_capability: {
    code_efficiency: number
    resource_optimization: number
    notes: string
  }
  engineering_scalability_capability: {
    code_quality: number
    maintainability: number
    scalability: number
    error_handling: number
    documentation: number
    notes: string
  }
  overall_notes: string
}

interface EvaluationFormProps {
  agentName: string
  testCase: { title: string; prompt: string }
  initialData?: Partial<EvaluationFormData>
  evidence?: string[]
  onSave: (data: EvaluationFormData) => void
  onAIScore?: (data: EvaluationFormData) => void
}

export function EvaluationForm({ 
  agentName, 
  testCase, 
  initialData, 
  evidence = [], 
  onSave, 
  onAIScore 
}: EvaluationFormProps) {
  const [formData, setFormData] = useState<EvaluationFormData>({
    core_delivery_capability: {
      first_try_success_rate: 3,
      first_try_completion_rate: 3,
      first_try_usability: 3,
      notes: ''
    },
    cognition_planning_capability: {
      problem_understanding: 3,
      planning_ability: 3,
      requirement_clarification: 3,
      notes: ''
    },
    interaction_communication_capability: {
      communication_clarity: 3,
      feedback_response: 3,
      notes: ''
    },
    efficiency_resourcefulness_capability: {
      code_efficiency: 3,
      resource_optimization: 3,
      notes: ''
    },
    engineering_scalability_capability: {
      code_quality: 3,
      maintainability: 3,
      scalability: 3,
      error_handling: 3,
      documentation: 3,
      notes: ''
    },
    overall_notes: '',
    ...initialData
  })

  const [isAILoading, setIsAILoading] = useState(false)

  const handleSliderChange = (section: keyof EvaluationFormData, field: string, value: number[]) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev] as any,
        [field]: value[0]
      }
    }))
  }

  const handleNotesChange = (section: keyof EvaluationFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev] as any,
        notes: value
      }
    }))
  }

  const handleAIScore = async () => {
    setIsAILoading(true)
    try {
      // 这里会调用GLM API
      const response = await fetch('/api/ai-evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentName,
          testCase,
          evidence
        })
      })

      if (!response.ok) {
        throw new Error('AI评分失败')
      }

      const aiData = await response.json()
      
      // 更新表单数据
      setFormData(prev => ({
        ...prev,
        core_delivery_capability: {
          ...prev.core_delivery_capability,
          first_try_success_rate: aiData.first_try_success_rate,
          first_try_completion_rate: aiData.first_try_completion_rate,
          first_try_usability: aiData.first_try_usability,
          notes: aiData.notes
        },
        cognition_planning_capability: {
          ...prev.cognition_planning_capability,
          problem_understanding: aiData.problem_understanding,
          planning_ability: aiData.planning_ability,
          requirement_clarification: aiData.requirement_clarification,
          notes: aiData.notes
        },
        interaction_communication_capability: {
          ...prev.interaction_communication_capability,
          communication_clarity: aiData.communication_clarity,
          feedback_response: aiData.feedback_response,
          notes: aiData.notes
        },
        efficiency_resourcefulness_capability: {
          ...prev.efficiency_resourcefulness_capability,
          code_efficiency: aiData.code_efficiency,
          resource_optimization: aiData.resource_optimization,
          notes: aiData.notes
        },
        engineering_scalability_capability: {
          ...prev.engineering_scalability_capability,
          code_quality: aiData.code_quality,
          maintainability: aiData.maintainability,
          scalability: aiData.scalability,
          error_handling: aiData.error_handling,
          documentation: aiData.documentation,
          notes: aiData.notes
        },
        overall_notes: aiData.notes
      }))

      if (onAIScore) {
        onAIScore(formData)
      }
    } catch (error) {
      console.error('AI评分失败:', error)
      alert('AI评分失败，请手动评分')
    } finally {
      setIsAILoading(false)
    }
  }

  const ScoreSlider = ({ 
    label, 
    value, 
    onChange 
  }: { 
    label: string; 
    value: number; 
    onChange: (value: number) => void 
  }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{label}</span>
        <Badge variant="outline">{value}分</Badge>
      </div>
      <Slider
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
        max={5}
        min={1}
        step={1}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>1分</span>
        <span>3分</span>
        <span>5分</span>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* AI评分按钮 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI智能评分
          </CardTitle>
          <CardDescription>
            使用GLM大模型对 {agentName} 在该测试用例中的表现进行智能评分
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleAIScore} 
              disabled={isAILoading}
              className="flex items-center gap-2"
            >
              {isAILoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI评分中...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  启动AI评分
                </>
              )}
            </Button>
            <span className="text-sm text-gray-500">
              AI评分将作为参考，您可以手动调整各项分数
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 核心交付能力 */}
      <Card>
        <CardHeader>
          <CardTitle>核心交付能力</CardTitle>
          <CardDescription>
            评估Agent首次交付的质量和完整度
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ScoreSlider
            label="首次尝试成功率"
            value={formData.core_delivery_capability.first_try_success_rate}
            onChange={(value) => handleSliderChange('core_delivery_capability', 'first_try_success_rate', [value])}
          />
          <ScoreSlider
            label="首次尝试完成率"
            value={formData.core_delivery_capability.first_try_completion_rate}
            onChange={(value) => handleSliderChange('core_delivery_capability', 'first_try_completion_rate', [value])}
          />
          <ScoreSlider
            label="首次尝试可用性"
            value={formData.core_delivery_capability.first_try_usability}
            onChange={(value) => handleSliderChange('core_delivery_capability', 'first_try_usability', [value])}
          />
          <div>
            <label className="text-sm font-medium">详细说明</label>
            <Textarea
              value={formData.core_delivery_capability.notes}
              onChange={(e) => handleNotesChange('core_delivery_capability', e.target.value)}
              placeholder="请详细描述该维度的评分理由..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* 认知与规划能力 */}
      <Card>
        <CardHeader>
          <CardTitle>认知与规划能力</CardTitle>
          <CardDescription>
            评估Agent对问题的理解和规划能力
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ScoreSlider
            label="问题理解能力"
            value={formData.cognition_planning_capability.problem_understanding}
            onChange={(value) => handleSliderChange('cognition_planning_capability', 'problem_understanding', [value])}
          />
          <ScoreSlider
            label="规划能力"
            value={formData.cognition_planning_capability.planning_ability}
            onChange={(value) => handleSliderChange('cognition_planning_capability', 'planning_ability', [value])}
          />
          <ScoreSlider
            label="需求澄清能力"
            value={formData.cognition_planning_capability.requirement_clarification}
            onChange={(value) => handleSliderChange('cognition_planning_capability', 'requirement_clarification', [value])}
          />
          <div>
            <label className="text-sm font-medium">详细说明</label>
            <Textarea
              value={formData.cognition_planning_capability.notes}
              onChange={(e) => handleNotesChange('cognition_planning_capability', e.target.value)}
              placeholder="请详细描述该维度的评分理由..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* 交互与沟通能力 */}
      <Card>
        <CardHeader>
          <CardTitle>交互与沟通能力</CardTitle>
          <CardDescription>
            评估Agent的沟通和反馈处理能力
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ScoreSlider
            label="沟通清晰度"
            value={formData.interaction_communication_capability.communication_clarity}
            onChange={(value) => handleSliderChange('interaction_communication_capability', 'communication_clarity', [value])}
          />
          <ScoreSlider
            label="反馈响应能力"
            value={formData.interaction_communication_capability.feedback_response}
            onChange={(value) => handleSliderChange('interaction_communication_capability', 'feedback_response', [value])}
          />
          <div>
            <label className="text-sm font-medium">详细说明</label>
            <Textarea
              value={formData.interaction_communication_capability.notes}
              onChange={(e) => handleNotesChange('interaction_communication_capability', e.target.value)}
              placeholder="请详细描述该维度的评分理由..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* 效率与资源利用 */}
      <Card>
        <CardHeader>
          <CardTitle>效率与资源利用</CardTitle>
          <CardDescription>
            评估Agent的效率和资源优化能力
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ScoreSlider
            label="代码效率"
            value={formData.efficiency_resourcefulness_capability.code_efficiency}
            onChange={(value) => handleSliderChange('efficiency_resourcefulness_capability', 'code_efficiency', [value])}
          />
          <ScoreSlider
            label="资源优化"
            value={formData.efficiency_resourcefulness_capability.resource_optimization}
            onChange={(value) => handleSliderChange('efficiency_resourcefulness_capability', 'resource_optimization', [value])}
          />
          <div>
            <label className="text-sm font-medium">详细说明</label>
            <Textarea
              value={formData.efficiency_resourcefulness_capability.notes}
              onChange={(e) => handleNotesChange('efficiency_resourcefulness_capability', e.target.value)}
              placeholder="请详细描述该维度的评分理由..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* 工程化与可扩展性 */}
      <Card>
        <CardHeader>
          <CardTitle>工程化与可扩展性</CardTitle>
          <CardDescription>
            评估Agent的工程质量和可扩展性
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ScoreSlider
            label="代码质量"
            value={formData.engineering_scalability_capability.code_quality}
            onChange={(value) => handleSliderChange('engineering_scalability_capability', 'code_quality', [value])}
          />
          <ScoreSlider
            label="可维护性"
            value={formData.engineering_scalability_capability.maintainability}
            onChange={(value) => handleSliderChange('engineering_scalability_capability', 'maintainability', [value])}
          />
          <ScoreSlider
            label="可扩展性"
            value={formData.engineering_scalability_capability.scalability}
            onChange={(value) => handleSliderChange('engineering_scalability_capability', 'scalability', [value])}
          />
          <ScoreSlider
            label="错误处理"
            value={formData.engineering_scalability_capability.error_handling}
            onChange={(value) => handleSliderChange('engineering_scalability_capability', 'error_handling', [value])}
          />
          <ScoreSlider
            label="文档质量"
            value={formData.engineering_scalability_capability.documentation}
            onChange={(value) => handleSliderChange('engineering_scalability_capability', 'documentation', [value])}
          />
          <div>
            <label className="text-sm font-medium">详细说明</label>
            <Textarea
              value={formData.engineering_scalability_capability.notes}
              onChange={(e) => handleNotesChange('engineering_scalability_capability', e.target.value)}
              placeholder="请详细描述该维度的评分理由..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* 综合评语 */}
      <Card>
        <CardHeader>
          <CardTitle>综合评语</CardTitle>
          <CardDescription>
            对Agent整体表现的综合评价和建议
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.overall_notes}
            onChange={(e) => setFormData(prev => ({ ...prev, overall_notes: e.target.value }))}
            placeholder="请输入综合评语..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button onClick={() => onSave(formData)} className="flex items-center gap-2">
          <Save className="w-4 h-4" />
          保存评测结果
        </Button>
      </div>
    </div>
  )
}