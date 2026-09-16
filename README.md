# MusicMirror

个人音乐行为观察系统：看见你的音乐偏好是如何形成和变化的。

项目设计依据：[项目完成指南](项目完成指南.md)。目前仅建立目录骨架和模块关系，未实现程序、安装依赖或配置运行环境。

## 目录

```text
MusicMirror/
├── apps/
│   ├── miniapp/src/           # 小程序展示与交互
│   │   ├── pages/            # home / structure / preferences / changes / metric-detail
│   │   ├── components/       # 应用内组件
│   │   ├── services/         # 调用自有后端 API
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

详细职责与依赖见 [架构说明](docs/architecture.md)。空目录使用 `.gitkeep` 保留，后续加入实际文件时可移除占位文件。

技术方向沿用指南中的 Node.js、TypeScript、PostgreSQL、Redis、BullMQ；后端框架和小程序框架在实现阶段确定。当前没有可执行的启动或构建命令。
