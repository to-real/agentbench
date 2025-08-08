# AgentBench Assistant

Browser extension for AgentBench - AI Agent evaluation platform.

## 功能特性

- 🔗 **Supabase集成**: 连接到AgentBench数据库
- 📸 **截图功能**: 捕获当前页面作为评测证据
- 🔄 **实时同步**: 与主应用进行状态同步
- 📊 **数据管理**: 管理项目、测试用例和评测记录
- 🎯 **智能关联**: 自动关联截图到具体的评测任务

## 安装说明

### 开发模式

1. 安装依赖:
```bash
npm install
```

2. 启动开发模式:
```bash
npm run dev
```

3. 在Chrome中加载插件:
   - 打开Chrome扩展页面 (`chrome://extensions/`)
   - 开启"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目根目录

### 生产模式

1. 构建插件:
```bash
npm run build
```

2. 在Chrome中加载构建的插件:
   - 打开Chrome扩展页面
   - 点击"加载已解压的扩展程序"
   - 选择 `build/chrome-mv3-prod` 目录

## 使用说明

### 1. 配置Supabase连接

- 点击插件图标打开弹窗
- 在"配置"部分输入Supabase URL和API密钥
- 点击"保存配置"

### 2. 选择评测任务

- 从下拉菜单选择评测项目
- 选择对应的测试用例
- 选择正在评测的Agent

### 3. 截图功能

- 导航到要评测的页面
- 点击"截取当前页面"按钮
- 截图会自动保存到Supabase Storage
- 同时创建或更新对应的评测记录

### 4. 查看证据

- 截图完成后会在弹窗中显示预览
- 点击"查看原图"可以查看完整截图
- 所有截图都会关联到当前选择的评测任务

## 技术架构

### 前端技术栈

- **Plasmo**: 浏览器插件开发框架
- **React**: UI组件库
- **TypeScript**: 类型安全
- **Tailwind CSS**: 样式框架
- **shadcn/ui**: UI组件库

### 同步机制

- **Chrome Extension Messaging API**: 高优先级实时同步
- **Supabase Realtime**: 中优先级数据同步
- **localStorage**: 配置持久化
- **WebSocket**: 实时数据推送

### 文件结构

```
agentbench-assistant/
├── popup.tsx              # 主弹窗组件
├── contents.tsx           # 内容脚本
├── background.ts          # 后台脚本
├── components/ui/         # UI组件
├── lib/
│   ├── supabase.ts       # Supabase客户端
│   ├── sync-manager.ts   # 同步管理器
│   └── utils.ts          # 工具函数
├── assets/               # 静态资源
└── build/                # 构建输出
```

## 开发指南

### 添加新功能

1. 在 `popup.tsx` 中添加UI组件
2. 在 `lib/sync-manager.ts` 中添加同步逻辑
3. 在 `background.ts` 中添加后台处理
4. 更新TypeScript类型定义

### 调试技巧

- 使用Chrome开发者工具调试popup和内容脚本
- 使用 `chrome.runtime.getBackgroundPage()` 调试后台脚本
- 查看Console输出了解同步状态

### 测试

运行测试脚本:
```bash
./test-extension.sh
```

## 权限说明

插件需要以下权限:

- `activeTab`: 访问当前活动标签页
- `storage`: 存储配置信息
- `tabs`: 管理标签页
- `scripting`: 注入内容脚本
- `webNavigation`: 监听导航事件

## 故障排除

### 常见问题

1. **截图失败**
   - 检查Supabase配置是否正确
   - 确认网络连接正常
   - 验证权限设置

2. **同步失效**
   - 检查Chrome扩展权限
   - 确认后台脚本运行正常
   - 查看网络连接状态

3. **构建失败**
   - 检查TypeScript错误
   - 确认依赖已安装
   - 清理node_modules重新安装

## 更新日志

### v0.0.1
- 初始版本发布
- 基础截图功能
- Supabase集成
- 状态同步机制

## Plasmo Framework

This is a [Plasmo extension](https://docs.plasmo.com/) project. For more information about Plasmo features, please visit the [official documentation](https://docs.plasmo.com/).
