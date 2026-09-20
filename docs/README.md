# MusicMirror 文档导航

从这里查找产品规则、数据来源、12类审美算法、运行方法及独立 UI 设计稿。整理日期：2026-09-19。

## 当前状态

- 两个独立输入：**长期可见 Top100**（播放次数加权）与**用户选定最多50首红心**（歌曲等权）。红心、加入自订歌单、订阅歌单是不同操作。
- 新快照使用 **music-aesthetic-2.0 的12类审美卡片**，每类提供现有数据与增强分析；输入不足明确标注，旧六指数仅用于历史报告。
- 后端与微信请求/按钮调用层已实现，真实账号接口核验有记录；研究资料不等于全部接入常规刷新。
- **UI已有独立48屏设计稿，尚未接入小程序前端**；图片中的合成数字不作为真实账号结论。

## 按任务查找

| 我想…… | 先看 | 接着看 |
| --- | --- | --- |
| 了解产品定位与双输入 | [产品规范](product-spec.md) | [原始设计导航](design/README.md) |
| 查看界面图片与源稿 | [UI设计导航](ui-design/README.md) | [浏览48屏](ui-design/musicmirror-v1/index.html)、[流程矩阵](ui-design/musicmirror-v1/FLOW-COVERAGE.md) |
| 知道需要什么数据、缺什么 | [数据需求与API能力](data-requirements-and-api.md) | [研究记录索引](research/README.md) |
| 理解12张卡片怎么算 | [审美算法设计](aesthetic-algorithm-design.md) | [字段补全](metadata-enrichment.md) |
| 启动、登录、导出或验证 | [开发指南](development.md) | [测试数据目录](test-data-layout.md) |
| 接入微信小程序页面 | [小程序接入](miniapp-integration.md) | [API契约](api-contract.md)、[UI交互规范](ui-design/musicmirror-v1/README.md) |
| 修改后端或数据流 | [系统架构](architecture.md) | [API契约](api-contract.md)、[隐私规则](privacy.md) |
| 核实红心时间、播放时长 | [研究索引](research/README.md) | [红心操作与百科补全](metadata-enrichment.md) |
| 了解解绑、删除与文件保留 | [隐私规则](privacy.md) | [输出目录与生命周期](test-data-layout.md) |
| 决定数据库、容器化等后续工作 | [路线图](roadmap.md) | [推进记录](progress.md) |
| 追溯旧方案与阶段结果 | [历史归档](history/README.md) | [推进记录](progress.md) |

## 推荐阅读路线

**初次了解**：产品规范 → 数据能力 → 审美算法 → UI设计。

**开发联调**：开发指南 → 系统架构 → API契约 → 小程序接入 → 隐私规则。

**数据核验**：数据能力 → 研究记录 → 字段补全 → 测试数据目录。

## 目录与职责

根目录保留现行主题规范，实验、历史与设计分别放入子目录。

```text
docs/
├── README.md                         总导航
├── product-spec.md                   定位、双输入、术语与边界
├── aesthetic-algorithm-design.md     12类卡片、公式与增强条件
├── data-requirements-and-api.md      数据需求、来源与接入状态
├── metadata-enrichment.md            字段解析、补全与红心语义
├── architecture.md                   数据流、模块和包边界
├── api-contract.md                   请求、响应、状态与错误
├── miniapp-integration.md            微信请求与按钮处理器
├── development.md                    启动、登录、命令与验证
├── local-api-and-cloud-migration.md  网络与API完整操作与迁移
├── privacy.md                        授权、保存、解绑与删除
├── test-data-layout.md               本机数据、导出与研究目录
├── roadmap.md                        优化方向与迁移条件
├── progress.md                       按日期记录的项目进展
├── algorithm-spec.md                 旧路径跳转，正文已归档
├── design/README.md                  原始需求与创意材料索引
├── research/README.md                账号、时长、记忆核验索引
├── history/README.md                 旧算法与阶段记录索引
└── ui-design/README.md               视觉方案及版本索引
    └── musicmirror-v1/               48屏SVG、8张PNG、规范与流程
```

## 文档状态与阅读优先级

| 类别 | 如何使用 |
| --- | --- |
| 现行主题规范 | 各自领域的当前规则；运行行为需结合代码与测试核对 |
| research实验记录 | 特定账号、版本、时间和样本的观察；“已实测”不等于“常规采集已接入” |
| history与progress | 追溯当时判断；过去的“下一步”“尚未验证”不代表当前状态 |
| design原始材料 | 保存需求来源；旧六指数、人格化创意等以现行规范边界为准 |
| ui-design视觉方案 | 描述界面外观与操作；独立于前端实现，合成数据不是接口证据 |

## 维护约定

1. 一个主题由一份规范负责；其他文件引用链接，避免复制状态清单和启动步骤。
2. 新实验按日期放入research，注明版本、样本范围、查询时间与确认程度；结论同步到负责该字段的规范。
3. 过时规范正文移入history并修正相对链接；已有外部引用的路径保留简短跳转。
4. 原始设计保留原文，视觉方案按版本保存，不追溯改写实验或历史报告。
5. 新增或移动文件时更新本页及分目录README，检查本地链接；重要阶段变化记录到progress。
6. docs不保存私人歌曲清单、凭证或原始账号响应；私人产物存于忽略提交的`.data/`。账户删除不会自动清理独立导出，详见隐私规则。
