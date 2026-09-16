# 本地启动与全链路验证

## 环境

Node.js >=22.13、npm。在仓库根目录运行。依赖安装使用代理，不更改全局npm设置：

```powershell
npm ci --proxy=http://127.0.0.1:7897 --https-proxy=http://127.0.0.1:7897
Copy-Item .env.example .env
npm run dev
```

默认mock、127.0.0.1:3000；没有真实账号请求，没有Docker/PostgreSQL/Redis依赖。SQLite自动创建 `.data/musicmirror.sqlite`，密钥自动创建 `.data/encryption.key`。Node内置SQLite在部分版本会输出实验性提示，后续生产运行时选择见roadmap。

已有.env时按需修改，不需要重新覆盖。启动必须在根目录，以找到迁移文件和.env；同一个DATA_DIR只运行一个实例。

## PowerShell 演示链路

在另一个终端执行：

```powershell
$apiBase = 'http://127.0.0.1:3000'
$login = Invoke-RestMethod -Method Post -Uri "$apiBase/auth/demo"
$apiHeaders = @{ Authorization = "Bearer $($login.token)" }
$favoriteBody = @{ items = @(@{ songId = '121' }, @{ songId = '123' }) } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method Put -Uri "$apiBase/inputs/recent-favorites" -Headers $apiHeaders -ContentType 'application/json' -Body $favoriteBody
$run = Invoke-RestMethod -Method Post -Uri "$apiBase/analysis/refresh" -Headers $apiHeaders -ContentType 'application/json' -Body '{}'
do {
  Start-Sleep -Milliseconds 500
  $state = Invoke-RestMethod -Uri "$apiBase/analysis/runs/$($run.runId)" -Headers $apiHeaders
} while ($state.status -in @('queued', 'processing'))
$state
Invoke-RestMethod -Uri "$apiBase/analysis/modules/long-term" -Headers $apiHeaders
Invoke-RestMethod -Uri "$apiBase/analysis/modules/recent-favorites" -Headers $apiHeaders
Invoke-RestMethod -Uri "$apiBase/analysis/history" -Headers $apiHeaders
```

演示每次登录创建独立账号；后续请求复用token。默认刷新60秒冷却；需要快速本地调试时在.env设 `REFRESH_COOLDOWN_MS=0` 后重启。数据没变时不产生重复快照；更改收藏输入可产生不同快照。测试fixture也支持改变长期分布，以验证三点趋势。

## 构建与验证

```powershell
npm run check
npm run build
npm start
```

测试包含纯算法、假上游协议、持久化/恢复/删除、以及微信按钮通过本地真实HTTP的端到端验证。`check`最后还运行`npm run smoke`：用临时数据库启动编译产物并完成登录、分析、双模块查询与删除，退出后清理临时数据。它不等于微信开发者工具视觉预览或真实账号兼容性测试。源码运行用tsx，编译后运行dist；不要同时启动二者占用同一端口/数据目录。

## 切换真实适配器（留待后续账号验证）

自行运行受信任的 Enhanced API 服务，然后配置：

```dotenv
PROVIDER_MODE=netease
ALLOW_DEMO_AUTH=false
NETEASE_BASE_URL=http://127.0.0.1:3001
```

重启后通过 `/auth/connect` 的JSON body传cookie；后端先验证登录，派发自有token。不要在命令历史、代码、测试或问题截图中保存真实Cookie。没有账号绑定时刷新会明确失败，绝不自动退回mock。

来源适配见 [services接入说明](../services/netease-api-enhanced/README.md)。本次仅阅读公开文档并用本地合成协议验证；真实字段、权限和收藏时间需要后续核验。
