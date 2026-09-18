# 本地启动与全链路验证

## 新版审美算法计算

执行npm run analyze:aesthetic读取已有双输入快照和本机完整记忆覆盖资料，生成12类现有/增强双版本结果，不需要重新登录。输出见.data/real-test/analyses/aesthetic-v2/latest.json所指目录。可选增强输入用npm run analyze:aesthetic -- .data/real-test <增强JSON文件>传入，结构与设计理由见[审美算法设计](aesthetic-algorithm-design.md)。当前后端仍使用旧六指数，新引擎可以通过designAesthetic库函数调用。

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

## 真实账号模式

自行运行受信任的 Enhanced API 服务，然后配置：

```dotenv
PROVIDER_MODE=netease
ALLOW_DEMO_AUTH=false
NETEASE_BASE_URL=http://127.0.0.1:3001
```

优先二维码授权：设置`ENABLE_TEST_PAGE=true`与独立`DATA_DIR=.data/real-test`，启动后打开`http://127.0.0.1:3000/dev/real-account`扫码确认。已有有效浏览器会话会读取报告。API或上游进程停止时页面/扫码不可用，服务状态需要现场health检查，不把历史“已启动”当作当前事实。

上游初次安装使用代理：`npm ci --prefix services/netease-api-enhanced --omit=dev --ignore-scripts --proxy=http://127.0.0.1:7897 --https-proxy=http://127.0.0.1:7897`；在单独终端执行`npm start --prefix services/netease-api-enhanced`。根目录另启API，不能对同一数据目录同时开两个API。

备用绑定可通过 `/auth/connect` 的JSON body传cookie；后端先验证登录，派发自有token。不要在命令历史、代码、测试或问题截图中保存真实Cookie。没有账号绑定时刷新会明确失败，绝不自动退回mock。

来源适配见 [services接入说明](../services/netease-api-enhanced/README.md)。真实扫码、基础采集、百科、红心时间已有实验；自动化回归仍使用合成数据，真实兼容性范围见[最新账号探索](research/account-api-exploration-2026-09-18.md)。

## 数据整理、导出与研究

`npm run data:organize`整理历史散落文件；`npm run export:account`导出最近已保存快照；`npm run enrich:account -- .data/real-test <snapshotId>`补百科字段，受原始响应TTL限制。具体语义见[目录说明](test-data-layout.md)与[补全指南](metadata-enrichment.md)。

研究时在上游终端设置`READ_ONLY_EXPLORATION=true`再启动桥，根目录执行`npm run explore:account`。输出在`.data/real-test/explorations/<时间>/`，逐接口响应投影加密保存，summary记录响应状态与抽样字段结构；不是新的画像快照。独立研究文件需自行管理保留/清理，探索不等于全部字段已纳入正式采集。
