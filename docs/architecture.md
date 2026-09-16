# 目录职责与依赖

依据《项目完成指南》第 3、15、16、22 节，将仓库划分为应用、共享包、外部服务、测试和基础设施。根目录保留原始指南与 API 文档入口。

## 数据流

```text
小程序 → 自有 API → 采集任务 → 网易云 API Enhanced
                      ↓
                 原始数据存储
                      ↓
                   标准化
                      ↓
              数学特征 → 六大行为指数
                      ↓
              冻结 Snapshot → 变化检测
                      ↓
                洞察 → 报告 → 小程序
```

原始响应、标准化模型和算法结果分别管理。快照记录算法版本并保存当时的事实，历史快照不随算法升级被覆盖。原始响应保存策略遵循指南第 14、18 节的加密、最小化与 TTL 要求。

## 后端模块

| `apps/api/src/modules/` 子目录 | 职责 |
| --- | --- |
| auth | 登录、会话、用户授权 |
| netease-api | 外部 API 调用、超时、重试、限流、缓存和响应校验 |
| collector | 编排采集、合并歌曲 ID、增量更新 |
| metadata | 歌曲、歌手、专辑及曲风元数据补全 |
| normalization | 将原始响应转换为内部标准化模型 |
| features | 编排数学特征计算，调用 algorithms |
| metrics | 编排六大行为指数计算，调用 algorithms |
| snapshots | 冻结、保存、查询快照及历史序列 |
| insights | 编排变化分析，调用 algorithms 和 insight-engine |
| reports | 汇总事实、分布、指数、置信度与解释，提供前端 API |

`jobs` 负责异步任务入口，业务过程交给上述模块；`database` 负责持久化访问。外部 API 接入模块不包含行为算法。

## 共享包边界

| 包 | 使用方 | 边界 |
| --- | --- | --- |
| contracts | miniapp、api、algorithms、insight-engine、ui-shared | 标准化模型、API 请求响应、校验契约；不依赖应用 |
| algorithms | api、insight-engine | 纯函数计算特征、六大指数、分布、变化、校准；不依赖 HTTP、数据库或应用 |
| insight-engine | api | 基于计算结果生成有证据的洞察和文案；不负责采集或持久化 |
| ui-shared | miniapp | 展示格式化与视觉规范；不承担业务计算 |

六大指数分别是集中度、深听度、广度、探索度、稳定度、收藏—实播一致度。统一归入 `algorithms/src/metrics`，实现阶段再按指数拆文件。

小程序只通过自有后端获取报告和刷新状态；网易云会话与采集逻辑由后端管理。共享包不得反向依赖 `apps`，两个应用不互相导入源码。

`services/netease-api-enhanced` 预留第三方服务的版本与部署接入说明，不复制第三方源码。`infra/docker` 预留 API、PostgreSQL、Redis、第三方服务的部署配置；指南建议的 Compose 文件待部署方案确定后添加。

## 当前阶段

仅建立目录和说明。各目录的 `.gitkeep` 是 Git 占位文件，不包含程序。算法规范、API 契约及隐私文档先保留索引，具体实现与配置留待后续阶段。
