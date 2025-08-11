'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  { name: '项目管理', href: '/projects' },
  { name: '测试用例库', href: '/test-cases' },
  { name: '评测执行', href: '/evaluate' },
  { name: '数据分析', href: '/analysis' },
  { name: '草稿管理', href: '/drafts' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-gray-900 text-white h-screen">
      <div className="p-6">
        <h1 className="text-2xl font-bold">AgentBench</h1>
        <p className="text-gray-400 text-sm mt-1">AI Agent评测平台</p>
      </div>
      
      <nav className="mt-8">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
              pathname === item.href
                ? 'bg-gray-800 text-white border-r-2 border-blue-500'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  )
}