# API 与 GUI 动作契约

本地默认 `http://127.0.0.1:3000`。除了health与登录入口，均使用 `Authorization: Bearer <自有token>`。JSON错误统一为 `{error:{code,message}}`，不含Cookie或上游原文。

| GUI动作 | API | 返回/行为 |
| --- | --- | --- |
| 服务检查 | GET /health | status、providerMode |
| 演示登录 | POST /auth/demo | token、account；真实模式关闭 |
| 绑定 | POST /auth/connect `{cookie}` | 校验后返回自有token、account |
| 生成登录二维码 | POST /auth/qr | loginId、pollToken、qrImage、expiresAt、pollIntervalMs |
| 检查扫码状态 | POST /auth/qr/check `{loginId,pollToken}` | waiting/scanned/expired/authenticated；成功返回自有token和account |
| 取消扫码 | POST /auth/qr/cancel `{loginId,pollToken}` | 使短期登录会话失效 |
| 授权状态 | GET /auth/me | account、bound |
| 退出 | POST /auth/logout | 撤销当前会话 |
| 编辑近期收藏 | PUT /inputs/recent-favorites `{items:[{songId,likedAt?}]}` | selection、requiresRefresh，最多50首 |
| 读取输入 | GET /inputs/recent-favorites | selection或null |
| 看看我到底喜欢什么/刷新 | POST /analysis/refresh `{idempotencyKey?}` | 202、runId、status |
| 进度/恢复等待 | GET /analysis/runs/:id | queued/processing/completed/failed/cancelled |
| 总览 | GET /analysis/latest | 完整Snapshot，主结果为aesthetic.cards十二类双版本，含modules双输入兼容视图 |
| 长期结构 | GET /analysis/modules/long-term | snapshotId、createdAt、长期模块 |
| 近期收藏 | GET /analysis/modules/recent-favorites | snapshotId、createdAt、收藏模块 |
| 我的结构 | GET /analysis/structure | facts、songs、artists、albums、核心集合 |
| 我的偏好 | GET /analysis/preferences | 收藏模块及可靠风格/语言/年代分布、覆盖率 |
| 历史 | GET /analysis/history?limit=20&offset=0 | items、limit、offset、hasMore；limit≤100 |
| 某次快照 | GET /analysis/snapshot/:id | 不可变快照 |
| 审美卡片 | GET /analysis/card/:cardId | 单张卡片的base/enhanced、facts、summaries、coverage、limitations、requiredData |
| 旧指数详情 | GET /analysis/metric/:metricKey | 仅历史快照兼容；新快照返回410 LEGACY_METRIC_REPLACED |
| 对比 | GET /analysis/compare?from=ID&to=ID | 同版本同选择规则的曲风JSD、选定重合变化、代表歌曲进出及卡片状态变化 |
| 变化/趋势 | GET /analysis/trends?days=30 | days可为30/90/all；至少3个同版本同选择规则新快照才返回aesthetic趋势 |
| 解绑 | DELETE /auth/binding | 取消采集、清理Cookie和私有缓存，保留报告 |
| 删除全部 | DELETE /account/data | 取消采集，删除用户关联数据及会话 |

cardId：center/fingerprint/alignment/continuity/discovery/lifecycle/timeContext/ecology/periods/popularity/acoustic/trajectory。快照/任务ID为UUID，歌曲ID为数字字符串。输入错误400，认证失败401，未找到/越权404，旧接口被替换410，采集中修改输入409，冷却429。

## 任务、幂等和快照

刷新先持久化任务再返回，按runId轮询，completed后读取snapshotId。运行中重复刷新返回同一任务；同用户同idempotencyKey返回原任务。默认60秒冷却，重复数据completed且unchanged=true，复用快照。失败返回安全error，可稍后重试。

收藏输入保存后需刷新进入新快照，旧快照仍保持原输入。卡片数据不足时status=partial/unavailable，并列出requiredData和limitations。版本或选择规则不同不生成审美对比/趋势。

## 双模块输出

主结果`aesthetic`：algorithmVersion、provenance、quality、cards、warnings。每张card均有base和enhanced两个Variant。`modules.longTermListening`继续提供输入事实/分布兼容视图；新快照indexes全部null、metrics明确指向卡片，不再执行旧六指数。

`modules.recentFavorites`：title、basis=song_count、status、selectionSource、timeWindow、sampleSize、songs、distributions、longTermOverlapRate、newArtistRate、artistJsd、metadataCoverage、observations、warnings。

收藏分布使用通用聚合字段playShare/playCount，在basis=song_count下分别表示等权份额/歌曲贡献，GUI必须展示为歌曲权重，不是播放次数。没配置不能填最近播放，未知likedAt保持null。

微信请求/按钮接法见 [miniapp-integration.md](miniapp-integration.md)。本次不创建页面，当前调用目录不作为可预览GUI交付。

首次真实账号测试增加默认关闭的本机诊断页：ENABLE_TEST_PAGE=true时访问 `/dev/real-account`，用于扫码与采集验证，不是产品GUI。二维码120秒过期，上游轮询最短2秒；查询凭证放POST body，成功结果保留30秒供同一请求方恢复，不重复生成token。Cookie不回传。
