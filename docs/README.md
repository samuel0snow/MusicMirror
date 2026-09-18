# MusicMirror 文档导航

## 推荐阅读顺序

1. [产品规范](product-spec.md)：两个模块的目标、红心与歌单的区别。
2. [数据需求与接口能力](data-requirements-and-api.md)：需要什么、当前接入什么、候选来源与解释边界。
3. [最新账号探索](research/account-api-exploration-2026-09-18.md)、[时长核验](research/listening-duration-verification-2026-09-18.md)及[142首覆盖率](research/song-memory-coverage-2026-09-18.md)：真实字段、统计口径与批量覆盖，客户端确认单独登记。
4. [算法规范](algorithm-spec.md)：当前数学层、六指数、权重及版本。
5. [开发指南](development.md)：运行、登录、导出、探索与验证。

## 文件职责

| 类别 | 文件 | 负责内容 |
| --- | --- | --- |
| 产品与后续计划 | [product-spec](product-spec.md)、[roadmap](roadmap.md) | 当前产品规则与未完成工作 |
| 数据来源 | [data-requirements-and-api](data-requirements-and-api.md) | 当前来源能力清单；新实验结果从research引用 |
| 数据处理与保存 | [metadata-enrichment](metadata-enrichment.md)、[test-data-layout](test-data-layout.md)、[privacy](privacy.md) | 字段映射、快照/输出用途、权限与生命周期 |
| 实现契约 | [architecture](architecture.md)、[api-contract](api-contract.md)、[miniapp-integration](miniapp-integration.md)、[algorithm-spec](algorithm-spec.md) | 实际实现、接口与客户端调用、数学规则 |
| 运行 | [development](development.md) | 当前启动与复现命令；历史文件不承担启动说明 |
| 实验 | [research](research/account-api-exploration-2026-09-18.md) | 某次账号/版本的结果与局限，不能宣称所有用户都相同 |
| 历史 | [progress](progress.md)、[首次真实测试](history/real-account-test-2026-09-17.md)、[首轮导出与画像决策](history/input-export-and-profile-2026-09-17.md) | 按日期保留推进证据，当时的待验证描述可能已被新实验替代 |
| 原始设计 | [完成指南](design/项目完成指南.md)、[输入图](design/输入数据设想.png)、[宣传点](design/项目宣传点.md)、[API入口](<design/API 文档.txt>) | 原始需求与创意；接口约定/验收状态以当前规范为准 |

## 维护约定

当前状态只在负责该主题的规范中维护；日期实验细节放research，已过时的一次性准备记录归history。新增结果更新能力清单及导航，不把同一套启动说明重复写进每份实验记录。原始design文件保留原稿，不为适配实现追溯改写需求。

私人歌曲列表、账号ID、凭证及接口响应在`.data`内；docs仅保存可复查的字段结构、聚合覆盖和结论。研究响应加密，但独立文件不受SQLite TTL或账户删除自动清理，使用者需管理本机研究文件。
