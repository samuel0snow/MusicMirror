# MusicMirror

审美算法music-aesthetic-2.0已提供12类现有/增强双版本计算。设计、理由与输入要求见[算法设计](docs/aesthetic-algorithm-design.md)，已有真实资料可执行npm run analyze:aesthetic输出本机画像。

**你的歌单，比你更了解你的音乐审美。** 观察长期反复听什么、最近主动喜欢什么，以及两者的延续与变化。

项目依据：[完成指南](docs/design/项目完成指南.md)、[输入设计](docs/design/输入数据设想.png)、[宣传方向](docs/design/项目宣传点.md)。当前提供后端与微信原生按钮调用层；GUI后续制作，已有真实扫码、基础采集、百科补全与红心行为验证。阅读入口见[文档导航](docs/README.md)。

## 启动

需要 Node.js >=22.13（本机验证版本见推进记录）。在仓库根目录执行：

```powershell
npm ci --proxy=http://127.0.0.1 --https-proxy=http://127.0.0.1
Copy-Item .env.example .env
npm run dev
```

默认 `http://127.0.0.1:3000`，使用mock数据，无需真实账号、数据库服务或Docker。SQLite与本地密钥保存在 `.data/`，已忽略提交。先调用 `POST /auth/demo` 获取token，再触发分析；完整命令见 [本地运行指南](docs/development.md)。

```powershell
npm run check
npm run build
npm start
```

`check`包含类型检查、数学/契约/集成/按钮端到端测试、构建与编译产物启动验证。`start`运行构建产物，需在仓库根目录启动。默认仅监听本机；请勿同时对同一DATA_DIR运行多个API进程。

## 两个模块

- **长期听歌结构**：长期Top100按播放加权，提供事实、六大指数、核心集合、快照和变化。
- **近期收藏偏好**：最多50首指定红心歌曲按歌曲等权，提供独立分布及与长期样本的对照。收藏时间未知时不推断一周内收藏，最近播放仅作辅助行为数据。

## 目录

```text
MusicMirror/
├── apps/
│   ├── miniapp/miniprogram/   # 微信原生请求与按钮处理（没有视觉页面）
│   │   ├── pages/            # home / structure / preferences / changes / metric-detail
│   │   ├── components/       # 应用内组件
│   │   ├── services/         # wx.request、自有会话、轮询与错误
│   │   ├── controllers/      # GUI按钮事件处理器
│   │   ├── stores/           # 页面状态与会话状态
│   │   └── assets/           # 图片等静态资源
│   └── api/src/              # 后端服务与采集编排
│       ├── modules/          # 业务模块，详见架构说明
│       ├── common/           # 公共错误处理、日志与安全边界
│       ├── config/           # 环境配置
│       ├── database/         # 数据访问与存储适配
│       └── jobs/             # 队列任务入口与调度
├── packages/
│   ├── contracts/src/        # models / api / schemas：共享数据契约
│   ├── algorithms/src/       # features / metrics / distributions / changes / calibration
│   ├── insight-engine/src/   # rules / templates：洞察规则与文案
│   └── ui-shared/src/        # tokens / formatters：展示规范与格式化
├── services/
│   └── netease-api-enhanced/ # 第三方 API 自部署接入边界
├── docs/                    # 架构、算法、接口、隐私说明
├── tests/
│   ├── fixtures/            # raw / normalized：脱敏测试数据
│   ├── algorithms/          # 数学特征与行为指数测试
│   ├── integration/         # 采集、存储、任务流程测试
│   ├── contracts/           # 外部接口与内部契约校验
│   └── e2e/                 # 小程序与后端端到端验证
└── infra/
    ├── docker/              # 后续部署与容器编排配置
    └── migrations/          # 数据库迁移
```

详细职责见 [架构](docs/architecture.md)、[产品指导](docs/product-spec.md)、[API契约](docs/api-contract.md)、[微信接入](docs/miniapp-integration.md)。目录中仍保留后续GUI/增强模块的占位，不代表已实现这些功能。

当前技术：TypeScript、Fastify、Zod、SQLite和持久化单进程队列。PostgreSQL、Redis/BullMQ、容器化及审美特征增强的建议见 [后续优化](docs/roadmap.md)。实现记录和验证结果见 [推进记录](docs/progress.md)，数据规则见 [隐私说明](docs/privacy.md)。
