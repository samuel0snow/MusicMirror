# 本地 API 搭建与微信云开发迁移

本文按“先在微信开发者工具跑通本地 API，再进行真机联调，最后迁移微信云开发”的顺序维护。当前阶段使用 Fastify + SQLite，页面只依赖 `services/client.js`，以后迁移时不改页面数据结构。

## 1. 开发者工具模拟器（当前推荐）

要求 Node.js >= 22.13。在仓库根目录执行：

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

看到 `MusicMirror API listening at http://127.0.0.1:3000 (mock)` 后，先在浏览器打开 `http://127.0.0.1:3000/health`，应返回：

```json
{"status":"ok","providerMode":"mock","demoAvailable":true}
```

然后在微信开发者工具中导入 `apps/miniapp`，不要导入内部的 `miniprogram` 目录。项目配置已将 `miniprogramRoot` 指向 `miniprogram/`，并在本地开发配置中关闭请求域名校验。编译后进入欢迎页，点击“演示模式”即可完成：演示登录 -> 配置红心输入 -> 启动分析 -> 查看报告。

欢迎页的“开始探索”也会识别后端数据源：本地 `mock` 模式显示“使用本地演示数据继续”，只有 `netease` 模式才显示隐私确认和二维码授权。这样测试页面时不会误调用真实账号二维码接口。

本地地址集中在 `apps/miniapp/miniprogram/config.js`，默认值与后端一致，均为 `http://127.0.0.1:3000`。如果欢迎页显示“无法连接服务”，依次检查 API 终端是否仍在运行、`/health` 是否可访问、端口是否被其他程序占用，然后清除缓存并重新编译。

## 2. 真机局域网联调

`127.0.0.1` 在手机上指向手机本身，因此真机不能使用模拟器地址。让电脑和手机连接同一可信局域网，然后在仓库根目录执行：

```powershell
npm run dev:lan
ipconfig
```

找到电脑当前网卡的 IPv4，例如 `192.168.1.20`。在开发者工具控制台设置一次临时地址并重启小程序：

```js
wx.setStorageSync('musicmirror.apiBaseUrl', 'http://192.168.1.20:3000')
```

Windows 防火墙需要允许 Node.js 的专用网络入站访问。先用手机浏览器访问上述 `/health`；浏览器也无法访问时先处理局域网或防火墙，不要继续排查页面。

微信对真机请求域名、HTTPS 和调试模式有额外限制。若当前测试号/开发工具版本不允许局域网 HTTP，请使用可信 HTTPS 隧道，把隧道地址写入同一个 storage key。不要把公开隧道用于真实网易云 Cookie。恢复模拟器默认地址：

```js
wx.removeStorageSync('musicmirror.apiBaseUrl')
```

## 3. 本地数据与安全边界

- 默认 `PROVIDER_MODE=mock`，不请求真实网易云账号，适合页面流程测试。
- SQLite 数据和自动生成的加密密钥保存在 `.data/`，不提交 Git。
- 真实账号模式只把网易云凭据交给自有后端；小程序持有的是 MusicMirror 自有会话 token。
- `DATA_DIR` 同一时间只允许一个 API 进程使用。
- 本地测试可把 `REFRESH_COOLDOWN_MS=0`，生产环境不要照搬。

接口契约见 [api-contract.md](api-contract.md)，完整后端启动和真实账号说明见 [development.md](development.md)。

## 4. 迁移到微信云开发的计划

当前不要改页面。迁移时保留 HTTP 路径、请求体、响应体和错误结构，只替换运行基础设施及小程序传输层。

| 当前本地实现 | 云开发目标 | 迁移动作 |
| --- | --- | --- |
| Fastify HTTP API | 云托管容器，或薄云函数网关 | 优先把现有 Node 服务整体部署到云托管，避免把每条路由拆成云函数 |
| SQLite `.data/musicmirror.sqlite` | 云数据库或托管关系数据库 | 先抽象 `Store` 接口，再实现云端存储；不要把 SQLite 文件放进无状态实例 |
| `.data/encryption.key` | 云端密钥/环境变量 | 使用环境变量或密钥管理，禁止随代码和镜像提交 |
| 进程内 `JobQueue` | 云托管常驻工作器或云任务/消息队列 | 保留 `runId`、轮询状态和幂等键语义 |
| `wx.request(baseUrl + path)` | 云托管调用或云函数调用适配器 | 在 `services/client.js` 下增加 transport，不改页面调用的方法名 |
| 本地 `.env` | 云环境变量 | 分环境配置 provider、上游地址、超时、冷却和密钥 |

推荐迁移顺序：

1. 冻结并继续用现有 `docs/api-contract.md` 和集成测试作为兼容基线。
2. 把数据库访问从具体 `Store` 类抽成接口，新增云端实现并做数据迁移脚本。
3. 将 Fastify 服务容器化部署到云托管，配置 HTTPS、环境变量、日志和健康检查。
4. 在小程序客户端增加云端 transport；保留本地 HTTP transport，便于离线开发和自动化测试。
5. 在云端验证登录、刷新任务、快照、历史、导出、解绑和删除全链路。
6. 最后开启正式请求域名/云环境配置，关闭 demo 登录和所有测试入口。

## 5. 每阶段验收

本地提交前：

```powershell
npm run typecheck
npm test
npm run build
npm run smoke
```

开发者工具还需人工确认欢迎页可显示演示入口、登录后页面不会回跳、分析进度能完成、报告页能读取快照。云开发阶段必须重复同一套 API 集成测试，并新增云数据库事务、任务重试、实例重启和并发幂等测试。
