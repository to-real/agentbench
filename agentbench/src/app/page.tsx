export default function Home() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          欢迎使用 AgentBench
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          AI Agent 评测与基准测试平台
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">项目管理</h2>
            <p className="text-gray-600 mb-4">创建和管理评测项目，定义需要评测的AI Agent。</p>
            <div className="text-sm text-blue-600">→ 开始创建项目</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">测试用例库</h2>
            <p className="text-gray-600 mb-4">维护标准化的测试用例库，确保评测的一致性。</p>
            <div className="text-sm text-blue-600">→ 管理测试用例</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">评测执行</h2>
            <p className="text-gray-600 mb-4">执行评测任务，记录AI Agent在各维度的表现。</p>
            <div className="text-sm text-blue-600">→ 开始评测</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">数据分析</h2>
            <p className="text-gray-600 mb-4">可视化分析评测结果，对比不同Agent的表现。</p>
            <div className="text-sm text-blue-600">→ 查看分析</div>
          </div>
        </div>
        
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">下一步操作</h3>
          <ul className="text-blue-800 space-y-1">
            <li>• 在 Supabase 中执行数据库架构文件 (supabase-schema.sql)</li>
            <li>• 配置环境变量 (.env.local)</li>
            <li>• 开始使用各个功能模块</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
