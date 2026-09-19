# MusicMirror 全栈架构

依据 [项目完成指南](design/项目完成指南.md)、[两类输入](design/输入数据设想.png) 和 [宣传方向](design/项目宣传点.md)。产品边界见 [product-spec.md](product-spec.md)，优化建议见 [roadmap.md](roadmap.md)。原始设计文档保留在 docs/design。

## 数据流

```text
未来 GUI → 小程序按钮处理器 → wx.request → 自有 API → 持久化采集任务 → mock / 网易云 API Enhanced
                      ↓
                 原始数据存储
                      ↓
                   标准化
                      ↓
       ┌──────────────┴────────────────┐
       ↓                               ↓
长期 Top100：播放加权          近期红心集合：歌曲等权
长期重复聆听结构               近期主动审美选择
       └──────────────┬────────────────┘
                      ↓
        特征与关系 → 12类审美卡片（base/enhanced）
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
| metrics | 历史六指数兼容；新快照不再执行 |
| snapshots | 冻结、保存、查询快照及历史序列 |
| insights | 编排变化分析，调用 algorithms 和 insight-engine |
| reports | 汇总审美卡片、事实、覆盖、限制与双版本，提供前端 API |

`jobs` 负责异步任务入口，业务过程交给上述模块；`database` 负责持久化访问。外部 API 接入模块不包含行为算法。

## 共享包边界

| 包 | 使用方 | 边界 |
| --- | --- | --- |
| contracts | miniapp、api、algorithms、insight-engine、ui-shared | 标准化模型、API 请求响应、校验契约；不依赖应用 |
| algorithms | api、insight-engine | 纯函数计算分布、关系、12类双版本卡片及变化；保留历史六指数读取代码，不依赖 HTTP、数据库或应用 |
| insight-engine | api | 基于计算结果生成有证据的洞察和文案；不负责采集或持久化 |
| ui-shared | miniapp | 展示格式化与视觉规范；不承担业务计算 |

新算法位于`packages/algorithms/src/aesthetic`：输入契约、数学层、阈值、12类编排和快照适配分开。collector直接运行新引擎；旧六指数代码仅供历史快照/旧测试兼容，不进入新快照计算。API路由在app.ts，单卡通过`/analysis/card/:cardId`读取；insight-engine使用卡片summary生成洞察。

小程序只通过自有后端获取报告和刷新状态；网易云会话与采集逻辑由后端管理。共享包不得反向依赖 `apps`，两个应用不互相导入源码。

`services/netease-api-enhanced` 预留第三方服务的版本与部署接入说明，不复制第三方源码。`infra/docker` 预留 API、PostgreSQL、Redis、第三方服务的部署配置；指南建议的 Compose 文件待部署方案确定后添加。

## 当前阶段

后端与微信调用层已实现，并完成过真实扫码、采集及字段核验；验证范围见[研究记录](research/README.md)。[独立UI设计稿](ui-design/README.md)已交付，尚未接入小程序页面。技术栈为Fastify + TypeScript + Zod、Node.js >=22.13；SQLite提供持久化和事务，单进程任务工作器的状态存入数据库，重启恢复未完成任务。PostgreSQL、Redis、Docker仍属于后续部署选项。

微信原生调用代码位于 `apps/miniapp/miniprogram/services` 与 `controllers`，不直接跨根目录导入共享 TS 包，通过 HTTP JSON 契约通信。页面注册、WXML/WXSS 和开发者工具配置由 GUI 阶段制作。

`Snapshot.modules` 始终包含 longTermListening / recentFavorites 两个模块。最近播放是探索与稳定的辅助来源，不能替代近期收藏。收藏输入不可用时返回明确空态；未知收藏时间不推断一周内收藏。

刷新按用户去重；采集中不允许修改收藏输入。解绑/删除取消并等待采集后再清理，避免数据被后台任务写回。快照保存和任务完成在一个事务内，标准化数据、收藏输入、可用性及版本相同则复用最新快照，时间戳本身不制造重复快照。

当前仅支持一个 API 进程使用一个数据目录。实现进度及最终验证见 [progress.md](progress.md)，本文件定义目标而不是验收声明。
