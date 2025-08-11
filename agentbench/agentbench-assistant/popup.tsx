import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card"
import { Button } from "./components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs"
import { Camera, Upload, Settings, Link, Wifi, Play, Pause, Square, BarChart3, Robot, Target, Activity, Users, MessageSquare, Video, StopCircle } from "lucide-react"
import { initializeSyncManager, getSyncManager } from "./lib/sync-manager"
import { AutomationTestEngine } from "./lib/test-engine"
import { RealtimeMonitor } from "./lib/realtime-monitor"
import { GLMAnalyzer } from "./lib/glm-analyzer"
import { PRESET_TEST_SCRIPTS, getTestScriptsByAgent } from "./lib/test-scripts"
import { AgentBenchWebSocketService } from "./lib/websocket-service"
import { TestScript, TestResult, TestEvent, TestExecutionContext } from "./types/automation"
import "./style.css"

interface Project {
  id: string
  name: string
  targets: string[]
  created_at: string
}

interface TestCase {
  id: string
  title: string
  prompt: string
  tags: string[]
  created_at: string
}

interface Evaluation {
  id: string
  project_id: string
  test_case_id: string
  agent_name: string
  evaluator_name?: string
  evidence_urls?: string[]
  created_at: string
}

function IndexPopup() {
  // 原有状态
  const [projects, setProjects] = useState<Project[]>([])
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [selectedTestCase, setSelectedTestCase] = useState<string>("")
  const [selectedAgent, setSelectedAgent] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([])
  const [supabaseUrl, setSupabaseUrl] = useState<string>("")
  const [supabaseKey, setSupabaseKey] = useState<string>("")
  const [isSyncEnabled, setIsSyncEnabled] = useState<boolean>(false)
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  
  // 自动化测试相关状态
  const [testEngine, setTestEngine] = useState<AutomationTestEngine | null>(null)
  const [monitor, setMonitor] = useState<RealtimeMonitor | null>(null)
  const [analyzer, setAnalyzer] = useState<GLMAnalyzer | null>(null)
  const [activeTab, setActiveTab] = useState<string>("manual")
  const [selectedScript, setSelectedScript] = useState<string>("")
  const [isTestRunning, setIsTestRunning] = useState<boolean>(false)
  const [isTestPaused, setIsTestPaused] = useState<boolean>(false)
  const [currentSession, setCurrentSession] = useState<string>("")
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [realtimeEvents, setRealtimeEvents] = useState<TestEvent[]>([])
  const [testProgress, setTestProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 })
  const [glmApiKey, setGlmApiKey] = useState<string>("")
  
  // WebSocket相关状态
  const [websocketService, setWebsocketService] = useState<AgentBenchWebSocketService | null>(null)
  const [websocketStatus, setWebsocketStatus] = useState<string>("disconnected")
  const [websocketUrl, setWebsocketUrl] = useState<string>("ws://localhost:3001")
  const [websocketToken, setWebsocketToken] = useState<string>("")
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [sessionParticipants, setSessionParticipants] = useState<string[]>([])
  const [remoteEvents, setRemoteEvents] = useState<TestEvent[]>([])
  const [enableRealtimeSync, setEnableRealtimeSync] = useState<boolean>(false)

  useEffect(() => {
    // Load saved configuration
    const savedUrl = localStorage.getItem("supabaseUrl")
    const savedKey = localStorage.getItem("supabaseKey")
    const savedGlmKey = localStorage.getItem("glmApiKey")
    const savedWsUrl = localStorage.getItem("websocketUrl")
    const savedWsToken = localStorage.getItem("websocketToken")
    
    if (savedUrl) setSupabaseUrl(savedUrl)
    if (savedKey) setSupabaseKey(savedKey)
    if (savedGlmKey) setGlmApiKey(savedGlmKey)
    if (savedWsUrl) setWebsocketUrl(savedWsUrl)
    if (savedWsToken) setWebsocketToken(savedWsToken)
    
    // Initialize components if configuration is available
    if (savedUrl && savedKey) {
      initializeComponents(savedUrl, savedKey, savedGlmKey || "")
    }
    
    // Initialize WebSocket service if configuration is available
    if (savedWsUrl && savedWsToken) {
      initializeWebSocketService(savedWsUrl, savedWsToken)
    }
  }, [])

  const initializeComponents = (url: string, key: string, glmKey: string) => {
    // Initialize sync manager
    const syncManager = initializeSyncManager(url, key)
    syncManager.initializeRealtime().then(() => {
      setIsSyncEnabled(true)
    }).catch(() => {
      setIsSyncEnabled(false)
    })

    // Initialize test engine
    const engine = new AutomationTestEngine()
    setTestEngine(engine)

    // Initialize monitor
    const mon = new RealtimeMonitor()
    setMonitor(mon)

    // Initialize GLM analyzer if API key is available
    if (glmKey) {
      const glmAnalyzer = new GLMAnalyzer({
        apiKey: glmKey,
        baseUrl: "https://open.bigmodel.cn/api/paas/v4",
        model: "glm-4-flash",
        maxTokens: 2000,
        temperature: 0.3
      })
      setAnalyzer(glmAnalyzer)
    }
  }

  const initializeWebSocketService = (url: string, token: string) => {
    // Create event handlers for WebSocket service
    const eventHandlers = {
      sessionCreated: (sessionId: string, data: any) => {
        setActiveSession(sessionId)
        setSessionParticipants([])
        console.log('Session created:', sessionId)
      },
      sessionStarted: (sessionId: string) => {
        console.log('Session started:', sessionId)
      },
      sessionStopped: (sessionId: string) => {
        setActiveSession(null)
        setSessionParticipants([])
        console.log('Session stopped:', sessionId)
      },
      testEventReceived: (event: TestEvent) => {
        setRemoteEvents(prev => [...prev.slice(-49), event]) // 保留最近50个远程事件
        console.log('Remote test event:', event)
      },
      testResultUpdated: (result: TestResult) => {
        console.log('Test result updated:', result)
      },
      userJoined: (clientId: string) => {
        setSessionParticipants(prev => [...prev, clientId])
        console.log('User joined:', clientId)
      },
      userLeft: (clientId: string) => {
        setSessionParticipants(prev => prev.filter(id => id !== clientId))
        console.log('User left:', clientId)
      }
    }

    // Create WebSocket service
    const wsService = new AgentBenchWebSocketService(
      {
        url,
        token,
        enableLogging: true,
        autoReconnect: true
      },
      eventHandlers
    )

    setWebsocketService(wsService)
    
    // Set up connection status monitoring
    wsService.client?.on('stateChange', (state) => {
      setWebsocketStatus(state)
    })

    // Connect to WebSocket server
    wsService.connect().catch(error => {
      console.error('WebSocket connection failed:', error)
    })
  }

  const fetchProjects = async () => {
    if (!supabaseUrl || !supabaseKey) return

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/projects?select=*`, {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json"
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error("Error fetching projects:", error)
    }
  }

  const fetchTestCases = async () => {
    if (!supabaseUrl || !supabaseKey || !selectedProject) return

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/test_cases?select=*`, {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json"
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setTestCases(data)
      }
    } catch (error) {
      console.error("Error fetching test cases:", error)
    }
  }

  const saveConfiguration = () => {
    localStorage.setItem("supabaseUrl", supabaseUrl)
    localStorage.setItem("supabaseKey", supabaseKey)
    localStorage.setItem("glmApiKey", glmApiKey)
    localStorage.setItem("websocketUrl", websocketUrl)
    localStorage.setItem("websocketToken", websocketToken)
    
    // Reinitialize components with new configuration
    initializeComponents(supabaseUrl, supabaseKey, glmApiKey)
    
    // Reinitialize WebSocket service with new configuration
    if (websocketUrl && websocketToken) {
      initializeWebSocketService(websocketUrl, websocketToken)
    }
    
    alert("配置保存成功！")
  }

  const autoConfigureFromApp = async () => {
    try {
      // Try to communicate with the main app to get configuration
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      
      if (tab.url && tab.url.includes('localhost:3000')) {
        // Inject content script to get configuration
        await chrome.scripting.executeScript({
          target: { tabId: tab.id! },
          function: () => {
            // Try to get configuration from the main app
            const config = {
              supabaseUrl: localStorage.getItem('NEXT_PUBLIC_SUPABASE_URL') || '',
              supabaseKey: localStorage.getItem('NEXT_PUBLIC_SUPABASE_ANON_KEY') || '',
              glmApiKey: localStorage.getItem('GLM_API_KEY') || ''
            }
            return config
          }
        })

        // Get the result (this is simplified - in real implementation you'd use message passing)
        const response = await chrome.tabs.sendMessage(tab.id!, { type: 'GET_CONFIG' })
        
        if (response && response.config) {
          setSupabaseUrl(response.config.supabaseUrl)
          setSupabaseKey(response.config.supabaseKey)
          setGlmApiKey(response.config.glmApiKey)
          alert('自动配置成功！已从主应用同步配置信息。')
        } else {
          alert('无法从主应用获取配置信息，请手动配置。')
        }
      } else {
        alert('请在 AgentBench 主应用页面使用此功能。')
      }
    } catch (error) {
      console.error('Auto configuration failed:', error)
      alert('自动配置失败，请手动配置。')
    }
  }

  // 自动化测试功能
  const startAutomatedTest = async () => {
    if (!testEngine || !selectedScript || !selectedAgent) {
      alert("请先完成配置并选择测试脚本")
      return
    }

    const script = PRESET_TEST_SCRIPTS.find(s => s.id === selectedScript)
    if (!script) {
      alert("未找到选中的测试脚本")
      return
    }

    setIsTestRunning(true)
    setIsTestPaused(false)
    
    const sessionId = `session_${Date.now()}`
    setCurrentSession(sessionId)
    
    // 如果启用了实时同步，创建WebSocket会话
    if (enableRealtimeSync && websocketService && selectedProject && selectedTestCase) {
      try {
        const wsSessionId = await websocketService.createSession(
          selectedProject,
          selectedTestCase,
          selectedAgent
        )
        await websocketService.joinSession(wsSessionId)
        await websocketService.startTestSession(wsSessionId)
        
        // 发送测试开始事件
        websocketService.sendTestEvent('test_started', {
          scriptId: selectedScript,
          agentName: selectedAgent,
          sessionId
        }, 'high')
      } catch (error) {
        console.error('WebSocket session creation failed:', error)
      }
    }
    
    // 开始监控
    if (monitor) {
      monitor.startMonitoring(sessionId)
      monitor.addEventListener(sessionId, (event: TestEvent) => {
        setRealtimeEvents(prev => [...prev.slice(-99), event]) // 保留最近100个事件
        
        // 发送WebSocket事件
        if (enableRealtimeSync && websocketService) {
          websocketService.sendAutomationEvent(
            event.data.step || 'unknown',
            event.type === 'step_complete' ? 'completed' : 'started',
            event.data.context || {},
            event.data
          )
        }
      })
    }

    try {
      // 替换脚本中的占位符
      const processedScript = {
        ...script,
        steps: script.steps.map(step => ({
          ...step,
          value: step.value?.replace('{TARGET_URL}', getTargetUrl(selectedAgent))
        }))
      }

      // 执行测试
      const result = await testEngine.executeScript(processedScript, sessionId)
      setTestResults(prev => [result, ...prev])
      
      // 保存结果到Supabase
      await saveTestResult(result)
      
      alert(`测试完成！成功率: ${result.successRate.toFixed(2)}%`)
    } catch (error) {
      console.error("Test execution failed:", error)
      alert("测试执行失败: " + (error instanceof Error ? error.message : "未知错误"))
    } finally {
      setIsTestRunning(false)
      setCurrentSession("")
      
      // 停止监控
      if (monitor) {
        monitor.stopMonitoring(sessionId)
      }
    }
  }

  const pauseTest = async () => {
    if (!testEngine || !currentSession) return
    
    if (isTestPaused) {
      await testEngine.resumeExecution(currentSession)
      setIsTestPaused(false)
    } else {
      await testEngine.pauseExecution(currentSession)
      setIsTestPaused(true)
    }
  }

  const stopTest = async () => {
    if (!testEngine || !currentSession) return
    
    await testEngine.stopExecution(currentSession)
    setIsTestRunning(false)
    setIsTestPaused(false)
    setCurrentSession("")
    
    if (monitor) {
      monitor.stopMonitoring(currentSession)
    }
  }

  const getTargetUrl = (agent: string): string => {
    const urls: Record<string, string> = {
      'MGX': 'https://mgx.com',
      'Replit': 'https://replit.com',
      'GitHub Copilot': 'https://github.com/features/copilot',
      'Cursor': 'https://cursor.sh',
      'Codeium': 'https://codeium.com'
    }
    return urls[agent] || 'https://example.com'
  }

  const saveTestResult = async (result: TestResult) => {
    if (!supabaseUrl || !supabaseKey) return

    try {
      const evaluationData = {
        project_id: selectedProject,
        test_case_id: selectedTestCase,
        agent_name: selectedAgent,
        evaluator_name: "Automated Test",
        evidence_urls: result.evidence.map(e => e.url).filter(Boolean),
        core_delivery_capability: result.scores.core_delivery_capability,
        cognition_planning_capability: result.scores.cognition_planning_capability,
        interaction_communication_capability: result.scores.interaction_communication_capability,
        efficiency_resourcefulness_capability: result.scores.efficiency_resourcefulness_capability,
        engineering_scalability_capability: result.scores.engineering_scalability_capability,
        overall_notes: `自动化测试结果 - 成功率: ${result.successRate.toFixed(2)}%, 耗时: ${result.duration}ms`
      }

      await fetch(`${supabaseUrl}/rest/v1/evaluations`, {
        method: "POST",
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(evaluationData)
      })
    } catch (error) {
      console.error("Error saving test result:", error)
    }
  }

  const takeScreenshot = async (type: 'visible' | 'full' = 'visible') => {
    if (!supabaseUrl || !supabaseKey) {
      alert("请先配置Supabase连接信息")
      return
    }

    if (!selectedProject || !selectedTestCase || !selectedAgent) {
      alert("请先选择项目、测试用例和Agent")
      return
    }

    setIsLoading(true)
    try {
      // Use Chrome extension API to capture screenshot
      let dataUrl: string
      
      if (type === 'full') {
        // Capture full page
        dataUrl = await chrome.tabs.captureVisibleTab(null, {
          format: "png",
          quality: 100
        })
      } else {
        // Capture visible area
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        dataUrl = await chrome.tabs.captureVisibleTab(null, {
          format: "png",
          quality: 100
        })
      }

      // Convert data URL to blob
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      
      // Generate filename with metadata
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `screenshot-${selectedAgent}-${timestamp}.png`
      
      // Upload to Supabase Storage
      const formData = new FormData()
      formData.append("file", blob, fileName)
      
      const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/agentbench-evidence/${fileName}`, {
        method: "POST",
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: formData
      })

      if (uploadResponse.ok) {
        const result = await uploadResponse.json()
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/agentbench-evidence/${fileName}`
        
        // Add metadata to URL for better organization
        const metadataUrl = `${publicUrl}?agent=${encodeURIComponent(selectedAgent)}&project=${encodeURIComponent(selectedProject)}&testCase=${encodeURIComponent(selectedTestCase)}`
        
        setEvidenceUrls(prev => [...prev, metadataUrl])
        
        // Save to evaluations table
        await saveEvidenceToEvaluation(metadataUrl)
        
        // Send sync notification
        const syncManager = getSyncManager()
        if (syncManager) {
          await syncManager.sendScreenshotNotification(metadataUrl, {
            projectId: selectedProject,
            testCaseId: selectedTestCase,
            agentName: selectedAgent
          })
        }
        
        // Send WebSocket event if enabled
        if (websocketService && enableRealtimeSync) {
          websocketService.sendTestEvent('screenshot_captured', {
            url: metadataUrl,
            type,
            agent: selectedAgent,
            timestamp: new Date().toISOString()
          }, 'medium')
        }
        
        alert(`${type === 'full' ? '完整页面' : '可见区域'}截图保存成功！`)
      } else {
        const errorData = await uploadResponse.json()
        console.error("Upload failed:", errorData)
        alert("上传失败，请检查Supabase配置")
      }
    } catch (error) {
      console.error("Error taking screenshot:", error)
      alert("截图失败，请重试")
    } finally {
      setIsLoading(false)
    }
  }

  const startRecording = async () => {
    if (!supabaseUrl || !supabaseKey) {
      alert("请先配置Supabase连接信息")
      return
    }

    if (!selectedProject || !selectedTestCase || !selectedAgent) {
      alert("请先选择项目、测试用例和Agent")
      return
    }

    try {
      // Request access to record screen
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: false
      })

      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      })

      const chunks: Blob[] = []
      setRecordedChunks(chunks)

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      recorder.onstop = async () => {
        // Combine all chunks into a single blob
        const blob = new Blob(chunks, { type: 'video/webm' })
        
        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const fileName = `recording-${selectedAgent}-${timestamp}.webm`
        
        // Upload to Supabase Storage
        const formData = new FormData()
        formData.append("file", blob, fileName)
        
        const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/agentbench-evidence/${fileName}`, {
          method: "POST",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: formData
        })

        if (uploadResponse.ok) {
          const result = await uploadResponse.json()
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/agentbench-evidence/${fileName}`
          
          // Add metadata to URL
          const metadataUrl = `${publicUrl}?agent=${encodeURIComponent(selectedAgent)}&project=${encodeURIComponent(selectedProject)}&testCase=${encodeURIComponent(selectedTestCase)}&type=recording`
          
          setEvidenceUrls(prev => [...prev, metadataUrl])
          
          // Save to evaluations table
          await saveEvidenceToEvaluation(metadataUrl)
          
          // Send WebSocket event if enabled
          if (websocketService && enableRealtimeSync) {
            websocketService.sendTestEvent('recording_completed', {
              url: metadataUrl,
              duration: chunks.length * 1000, // approximate duration
              agent: selectedAgent,
              timestamp: new Date().toISOString()
            }, 'high')
          }
          
          alert("屏幕录制保存成功！")
        } else {
          const errorData = await uploadResponse.json()
          console.error("Upload failed:", errorData)
          alert("录制上传失败，请检查Supabase配置")
        }
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
      setRecordedChunks(chunks)

      // Stop recording when user stops sharing
      stream.getVideoTracks()[0].onended = () => {
        stopRecording()
      }

    } catch (error) {
      console.error("Error starting recording:", error)
      alert("开始录制失败，请确保授予屏幕录制权限")
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
      mediaRecorder.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
      setMediaRecorder(null)
    }
  }

  const saveEvidenceToEvaluation = async (evidenceUrl: string) => {
    if (!selectedProject || !selectedTestCase || !selectedAgent) return

    try {
      // First check if evaluation already exists
      const existingEvalResponse = await fetch(
        `${supabaseUrl}/rest/v1/evaluations?project_id=eq.${selectedProject}&test_case_id=eq.${selectedTestCase}&agent_name=eq.${selectedAgent}`,
        {
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json"
          }
        }
      )

      if (existingEvalResponse.ok) {
        const existingEvaluations = await existingEvalResponse.json()
        
        if (existingEvaluations.length > 0) {
          // Update existing evaluation
          const existingEval = existingEvaluations[0]
          const updatedEvidenceUrls = existingEval.evidence_urls 
            ? [...existingEval.evidence_urls, evidenceUrl] 
            : [evidenceUrl]

          await fetch(`${supabaseUrl}/rest/v1/evaluations?id=eq.${existingEval.id}`, {
            method: "PATCH",
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              evidence_urls: updatedEvidenceUrls,
              evaluator_name: "Extension User"
            })
          })
        } else {
          // Create new evaluation
          const evaluationData = {
            project_id: selectedProject,
            test_case_id: selectedTestCase,
            agent_name: selectedAgent,
            evidence_urls: [evidenceUrl],
            evaluator_name: "Extension User",
            // Initialize with empty capability scores
            core_delivery_capability: {},
            cognition_planning_capability: {},
            interaction_communication_capability: {},
            efficiency_resourcefulness_capability: {},
            engineering_scalability_capability: {},
            overall_notes: ""
          }

          await fetch(`${supabaseUrl}/rest/v1/evaluations`, {
            method: "POST",
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=minimal"
            },
            body: JSON.stringify(evaluationData)
          })
        }
      }
    } catch (error) {
      console.error("Error saving evidence:", error)
    }
  }

  useEffect(() => {
    if (supabaseUrl && supabaseKey) {
      fetchProjects()
    }
  }, [supabaseUrl, supabaseKey])

  useEffect(() => {
    if (selectedProject) {
      fetchTestCases()
    }
  }, [selectedProject])

  const selectedProjectData = projects.find(p => p.id === selectedProject)

  return (
    <div className="w-96 p-4 space-y-4">
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900">AgentBench Assistant</h1>
        <p className="text-sm text-gray-600">AI Agent评测助手 - 自动化版</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">手动评测</TabsTrigger>
          <TabsTrigger value="automated">自动化评测</TabsTrigger>
        </TabsList>

      {/* Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            配置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Supabase URL</label>
            <input
              type="text"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Supabase Key</label>
            <input
              type="password"
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">GLM API Key</label>
            <input
              type="password"
              value={glmApiKey}
              onChange={(e) => setGlmApiKey(e.target.value)}
              placeholder="智谱AI API密钥"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">WebSocket URL</label>
            <input
              type="text"
              value={websocketUrl}
              onChange={(e) => setWebsocketUrl(e.target.value)}
              placeholder="ws://localhost:3001"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">WebSocket Token</label>
            <input
              type="password"
              value={websocketToken}
              onChange={(e) => setWebsocketToken(e.target.value)}
              placeholder="WebSocket认证令牌"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Wifi className={`w-4 h-4 ${isSyncEnabled ? 'text-green-500' : 'text-gray-400'}`} />
            <span className={isSyncEnabled ? 'text-green-600' : 'text-gray-500'}>
              {isSyncEnabled ? '同步已启用' : '同步已禁用'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Activity className={`w-4 h-4 ${websocketStatus === 'connected' ? 'text-green-500' : 'text-gray-400'}`} />
            <span className={websocketStatus === 'connected' ? 'text-green-600' : 'text-gray-500'}>
              WebSocket: {websocketStatus === 'connected' ? '已连接' : websocketStatus === 'connecting' ? '连接中' : '未连接'}
            </span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={autoConfigureFromApp}
              className="flex-1"
            >
              自动配置
            </Button>
            <Button onClick={saveConfiguration} className="flex-1">
              保存配置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Project Selection */}
      <Card>
        <CardHeader>
          <CardTitle>选择评测项目</CardTitle>
          <CardDescription>选择要关联的评测项目</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger>
              <SelectValue placeholder="选择项目" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Test Case Selection */}
      {selectedProject && (
        <Card>
          <CardHeader>
            <CardTitle>选择测试用例</CardTitle>
            <CardDescription>选择当前评测的测试用例</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedTestCase} onValueChange={setSelectedTestCase}>
              <SelectTrigger>
                <SelectValue placeholder="选择测试用例" />
              </SelectTrigger>
              <SelectContent>
                {testCases.map((testCase) => (
                  <SelectItem key={testCase.id} value={testCase.id}>
                    {testCase.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Agent Selection */}
      {selectedProject && selectedTestCase && selectedProjectData && (
        <Card>
          <CardHeader>
            <CardTitle>选择Agent</CardTitle>
            <CardDescription>选择正在评测的Agent</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger>
                <SelectValue placeholder="选择Agent" />
              </SelectTrigger>
              <SelectContent>
                {selectedProjectData.targets.map((agent) => (
                  <SelectItem key={agent} value={agent}>
                    {agent}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Evidence Collection */}
      {selectedProject && selectedTestCase && selectedAgent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              证据收集
            </CardTitle>
            <CardDescription>捕获截图和录制屏幕作为评测证据</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Screenshot Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={() => takeScreenshot('visible')} 
                  disabled={isLoading || isRecording}
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <Camera className="w-4 h-4" />
                  截取可见区域
                </Button>
                <Button 
                  onClick={() => takeScreenshot('full')} 
                  disabled={isLoading || isRecording}
                  className="flex items-center gap-2"
                  size="sm"
                >
                  <Camera className="w-4 h-4" />
                  截取完整页面
                </Button>
              </div>

              {/* Screen Recording */}
              <div className="border-t pt-3">
                <Button 
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isLoading}
                  className={`w-full flex items-center gap-2 ${
                    isRecording ? 'bg-red-500 hover:bg-red-600' : ''
                  }`}
                >
                  {isRecording ? (
                    <>
                      <StopCircle className="w-4 h-4" />
                      停止录制
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4" />
                      开始屏幕录制
                    </>
                  )}
                </Button>
                {isRecording && (
                  <div className="text-center text-sm text-red-600 mt-2">
                    ● 正在录制屏幕...
                  </div>
                )}
              </div>

              {/* Evidence List */}
              {evidenceUrls.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <h4 className="text-sm font-medium">已保存的证据 ({evidenceUrls.length}):</h4>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {evidenceUrls.map((url, index) => {
                      const isVideo = url.includes('type=recording') || url.includes('.webm')
                      return (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          {isVideo ? (
                            <Video className="w-6 h-6 text-blue-500" />
                          ) : (
                            <Camera className="w-6 h-6 text-green-500" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">
                              {isVideo ? '屏幕录制' : '截图'} {index + 1}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {new URL(url).searchParams.get('agent') || 'Unknown'}
                            </div>
                          </div>
                          <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs text-blue-600 hover:underline"
                          >
                            查看
                          </a>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

        <TabsContent value="manual" className="space-y-4">
          <div className="text-center py-8">
            <Camera className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">手动评测模式</h3>
            <p className="text-sm text-gray-600">
              请在上方的配置区域选择项目、测试用例和Agent，然后使用证据收集功能进行评测。
            </p>
          </div>
        </TabsContent>

        <TabsContent value="automated" className="space-y-4">
          {/* Automated Testing Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Robot className="w-4 h-4" />
                自动化测试
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Test Script Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">选择测试脚本</label>
                <Select value={selectedScript} onValueChange={setSelectedScript}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择测试脚本" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_TEST_SCRIPTS.map((script) => (
                      <SelectItem key={script.id} value={script.id}>
                        {script.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Agent Selection for Automated Test */}
              <div>
                <label className="block text-sm font-medium mb-2">选择目标Agent</label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择目标Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MGX">MGX</SelectItem>
                    <SelectItem value="Replit">Replit</SelectItem>
                    <SelectItem value="GitHub Copilot">GitHub Copilot</SelectItem>
                    <SelectItem value="Cursor">Cursor</SelectItem>
                    <SelectItem value="Codeium">Codeium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Real-time Sync Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="realtime-sync"
                  checked={enableRealtimeSync}
                  onChange={(e) => setEnableRealtimeSync(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="realtime-sync" className="text-sm font-medium">
                  启用实时同步
                </label>
                <MessageSquare className={`w-4 h-4 ${enableRealtimeSync ? 'text-blue-500' : 'text-gray-400'}`} />
              </div>

              {/* Session Information */}
              {activeSession && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">实时会话: {activeSession.substring(0, 8)}...</span>
                  </div>
                  {sessionParticipants.length > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      参与者: {sessionParticipants.length} 人
                    </div>
                  )}
                </div>
              )}

              {/* Test Control */}
              <div className="flex gap-2">
                <Button 
                  onClick={startAutomatedTest}
                  disabled={isTestRunning || !selectedScript || !selectedAgent}
                  className="flex-1 flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  {isTestRunning ? '测试中...' : '开始测试'}
                </Button>
                
                {isTestRunning && (
                  <>
                    <Button 
                      onClick={pauseTest}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {isTestPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                      {isTestPaused ? '继续' : '暂停'}
                    </Button>
                    
                    <Button 
                      onClick={stopTest}
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      <Square className="w-4 h-4" />
                      停止
                    </Button>
                  </>
                )}
              </div>

              {/* Test Progress */}
              {isTestRunning && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>测试进度</span>
                    <span>{testProgress.current} / {testProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(testProgress.current / testProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Real-time Events */}
              {realtimeEvents.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    本地事件
                  </h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {realtimeEvents.slice(-10).map((event, index) => (
                      <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                        <div className="flex justify-between">
                          <span className="font-medium">{event.type}</span>
                          <span className="text-gray-500">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-gray-600 truncate">
                          {JSON.stringify(event.data).substring(0, 50)}...
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remote Events */}
              {remoteEvents.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    远程事件
                  </h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {remoteEvents.slice(-10).map((event, index) => (
                      <div key={index} className="text-xs p-2 bg-blue-50 rounded">
                        <div className="flex justify-between">
                          <span className="font-medium">{event.type}</span>
                          <span className="text-gray-500">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-gray-600 truncate">
                          {JSON.stringify(event.data).substring(0, 50)}...
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Results */}
          {testResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  测试结果
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {testResults.slice(0, 3).map((result, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{result.scriptId}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          result.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {result.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>成功率: {result.successRate.toFixed(2)}%</div>
                        <div>耗时: {result.duration}ms</div>
                        <div>步骤: {result.completedSteps}/{result.totalSteps}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Link to Main App */}
      <Card>
        <CardContent className="pt-6">
          <Button 
            variant="outline" 
            className="w-full flex items-center gap-2"
            onClick={() => {
              chrome.tabs.create({ url: 'http://localhost:3000' })
            }}
          >
            <Link className="w-4 h-4" />
            打开主应用
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default IndexPopup
