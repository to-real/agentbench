import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card"
import { Button } from "./components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select"
import { Camera, Upload, Settings, Link, Wifi } from "lucide-react"
import { initializeSyncManager, getSyncManager } from "./lib/sync-manager"
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

  useEffect(() => {
    // Load saved configuration
    const savedUrl = localStorage.getItem("supabaseUrl")
    const savedKey = localStorage.getItem("supabaseKey")
    if (savedUrl) setSupabaseUrl(savedUrl)
    if (savedKey) setSupabaseKey(savedKey)
    
    // Initialize sync manager if configuration is available
    if (savedUrl && savedKey) {
      const syncManager = initializeSyncManager(savedUrl, savedKey)
      syncManager.initializeRealtime().then(() => {
        setIsSyncEnabled(true)
      }).catch(() => {
        setIsSyncEnabled(false)
      })
    }
  }, [])

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
    alert("Configuration saved!")
  }

  const takeScreenshot = async () => {
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
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      
      const dataUrl = await chrome.tabs.captureVisibleTab(null, {
        format: "png",
        quality: 100
      })

      // Convert data URL to blob
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      
      // Upload to Supabase Storage
      const fileName = `screenshot-${Date.now()}.png`
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
        setEvidenceUrls(prev => [...prev, publicUrl])
        
        // Save to evaluations table
        await saveEvidenceToEvaluation(publicUrl)
        
        // Send sync notification
        const syncManager = getSyncManager()
        if (syncManager) {
          await syncManager.sendScreenshotNotification(publicUrl, {
            projectId: selectedProject,
            testCaseId: selectedTestCase,
            agentName: selectedAgent
          })
        }
        
        alert("截图保存成功！")
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
        <p className="text-sm text-gray-600">AI Agent评测助手</p>
      </div>

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
          <div className="flex items-center gap-2 text-sm">
            <Wifi className={`w-4 h-4 ${isSyncEnabled ? 'text-green-500' : 'text-gray-400'}`} />
            <span className={isSyncEnabled ? 'text-green-600' : 'text-gray-500'}>
              {isSyncEnabled ? '同步已启用' : '同步已禁用'}
            </span>
          </div>
          <Button onClick={saveConfiguration} className="w-full">
            保存配置
          </Button>
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

      {/* Screenshot Function */}
      {selectedProject && selectedTestCase && selectedAgent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              截图功能
            </CardTitle>
            <CardDescription>捕获当前页面作为评测证据</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button 
                onClick={takeScreenshot} 
                disabled={isLoading}
                className="w-full flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                截取当前页面
              </Button>
              
              {evidenceUrls.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">已保存的证据:</h4>
                  {evidenceUrls.map((url, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <img src={url} alt={`Evidence ${index + 1}`} className="w-16 h-12 object-cover rounded" />
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                        查看原图
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
