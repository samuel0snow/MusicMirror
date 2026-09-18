# 数据需求与 Enhanced API 能力对照

核对日期：2026-09-18。依据原设计输入图、完成指南、产品规范，以及[指定在线文档](https://docs-neteasecloudmusicapi.focalors.ltd/#/?id=neteasecloudmusicapienhanced)。该站首页通过Docsify加载上游`public/docs/home.md`；本次另直接阅读了[上游文档正文](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced/blob/main/public/docs/home.md)及本机安装的4.40.1模块源码。在线main会变化，项目实际部署版本仍为4.40.1。

## 结论与范围

当前数据足以开展长期播放结构、近期红心结构、歌手/专辑/曲风/语种/年代分布及双模块差异分析。红心加入时间已完成取消再点红心实测，但自动近期红心配置尚未接入；旧导出仍为当时的未知时间。首次收听、实际收听时长、相似歌手、自订歌单行为等是有候选来源的增强项，需要独立验证后再成为算法输入。

本文区分四种状态：**已接入并实测**、**已实测但未接入常规输出**、**文档/源码有候选但未实测**、**本次未找到可靠直接来源**。文档列有接口或npm内有模块，不代表本机只读桥已开放、当前账号有权限、响应完整或字段含义已确定。这里汇总既有实测证据，不宣称今天重新调用了所有候选接口。

三个不同的主动选择信号必须分别保存：

- **红心**：加入“我喜欢的音乐”；当前输入2仅使用此信号。
- **加入自订歌单**：歌曲属于用户选择的歌单；不要求同时点红心。
- **收藏/订阅整张歌单**：歌单级关系，不代表用户逐首选择或喜欢其中所有歌曲。

## 必需数据：两个主模块与辅助对照

| 所需数据及作用 | 上游接口/参数 | 项目字段与状态 | 不可越过的边界 |
| --- | --- | --- | --- |
| 网易云身份与读取授权 | `/login/qr/key`、`/login/qr/create`、`/login/qr/check`、`/login/status` | 二维码登录、服务端Cookie、自有会话已接入并实测 | 微信身份与网易云身份不同；上游Cookie不进入小程序或报告 |
| 输入1：长期Top100及计数 | `/user/record`，`uid`、`type=0` | `songId`、`longPlayCount`；已接入并实测100首 | `allData`不等于完整注册至今事件历史；未上榜不能解释为从未听过 |
| 周播放结构 | `/user/record`，`type=1` | `weekPlayCount`；已接入并实测100首 | 不能从聚合计数还原每次收听时刻 |
| 辅助最近播放及新鲜度 | `/record/recent/song`，当前请求`limit=300` | `appearedInRecent`、unique模式、最近时间；已接入并实测300首 | 本次实际数量不随limit=1/100严格变化；列表出现不代表完整频次 |
| 标准歌曲资料 | `/song/detail`，`ids`逗号分隔；项目每批50个 | 歌名、歌手数组、专辑、作品时长、发行时间；已接入并实测 | `dt`是歌曲长度，不能当实际听歌时长；详情可能缺失 |
| 当前红心集合 | `/likelist`，`uid` | `liked`/`likedVerified`；已接入并实测 | 返回当前ID集合，不能从ID顺序推收藏顺序，也不能恢复红心历史 |
| 输入2：近期红心歌曲ID与加入时间 | `/user/playlist`找本账号红心歌单；`/playlist/detail`取`trackIds.id/at`；与likelist核对 | ID和`at`已实测；当前输入仍通过显式≤50首列表配置，旧快照`likedAt=null` | 手动调序不等于时间排序；取消再点红心会更新at；不是首次喜欢时间 |
| 两组歌曲的曲风、语种、BPM、百科发行时间 | `/song/wiki/info`，`id`；`/song/wiki/summary`用于探测/复核 | `styles/styleIds`、`language`、`bpm`、`wikiPublishTime`、`enrichment`；补全命令已接入并实测 | 基本信息与推荐标签、MV时间、乐谱BPM分开；平台共建标签不等于人工音频测量 |
| 快照、字段覆盖率、数据窗口、算法版本 | 本项目生成，不依赖额外网易云接口 | `snapshotId`、`createdAt`、`collectedAt`、coverage、版本；已保存和导出 | 元数据补全产生的新快照不等于新的用户行为；同日刷新不证明长期变化 |

用户播放记录、最近播放、详情与红心的接口入口见[上游文档正文](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced/blob/main/public/docs/home.md)。已部署实现分别为[user_record](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced/blob/main/module/user_record.js)、[record_recent_song](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced/blob/main/module/record_recent_song.js)、[song_detail](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced/blob/main/module/song_detail.js)、[likelist](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced/blob/main/module/likelist.js)、[playlist_detail](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced/blob/main/module/playlist_detail.js)和[song_wiki_info](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced/blob/main/module/song_wiki_info.js)。响应字段细节与账号行为结论以[本项目实测](metadata-enrichment.md)为证据，不能误称上游文档保证。

### 最近50首与一周内是两个窗口

下一阶段自动输入2按当前红心记录的有效at倒序，不按歌单位置；相同时间可用歌曲ID稳定排序。最近50首和最近7天是不同规则：一周内可能不足50首，也可能超过50首，必须保存选择规则、实际时间范围和数量，不为了凑满50首将旧歌放入一周内。重新点红心可以进入近期集合，解读应为再次主动喜欢，而不是首次发现。

用户已确认两个手动调过位置的样本与at时间排序吻合，并主动完成一首歌有→无→有的实验，证明目标账号/部署版本的at会更新。要接入正式自动来源，仍需不同账号/异常字段/缓存一致性验证。旧快照不能因这次语义确认而追溯覆盖；来源枚举及timeWindow也需要扩展，不能把自动获取的时间冒称user_provided。

## 有候选来源的增强数据

以下接口尚未全部被本机只读桥开放，未验证项不作为当前算法强依赖。

| 需求 | 候选接口与参数 | 当前证据/接入状态 | 建议用途与限制 |
| --- | --- | --- | --- |
| 自订歌单成员、歌单归属 | `/user/playlist?uid=...`分页；`/playlist/detail?id=...`；`/playlist/track/all?id=...&limit=...&offset=...` | 歌单列表/红心详情已实测；自订歌单分析与全量分页未接入 | 单独保存playlistId、创建者、成员、位置及加入时间来源；红心实验不能证明自订歌单at语义 |
| 专辑补充信息 | `/album?id=...`、`/album/detail?id=...` | 本机桥开放album；补缺效果未实测 | 需已有有效专辑ID，不从名称猜ID；专辑标签不可直接当每首歌曲标签 |
| 歌手资料及作品 | `/artist/detail?id=...`、`/artist/album?id=...`、`/artist/top/song?id=...` | 文档/本机模块有候选，未接入实测 | 可补标准资料与作品关系；热门作品列表不是本用户听过的作品列表 |
| 相似歌手图谱 | `/simi/artist?id=...` | 文档/模块有候选，未接入实测 | 辅助艺人生态跨度；平台相似关系不是严格曲风距离 |
| 曲风词表及平台偏好 | `/style/list`、`/style/detail?tagId=...`、`/style/preference` | 文档/模块有候选，未接入实测 | 平台账户偏好与本项目的两个样本分布独立对照；不可混成同一权重 |
| 某曲风关联作品/艺人 | `/style/song`、`/style/album`、`/style/artist`，`tagId`及游标 | 文档/模块有候选，未接入实测 | “曲风→候选列表”不是任意歌曲完整反查接口，未出现不代表无此曲风 |
| 首次收听、音乐记忆 | `/music/first/listen/info?id=...`；百科summary/info的私人记忆块 | 百科探测见过首次收听信息；专用接口、整体覆盖和统计口径未实测 | 实验性firstListenedAt，需核实时间范围与权限；不等于首次红心时间 |
| 实际听歌时长 | `/listen/data/total`、`/listen/data/realtime/report?type=week或month` | 文档提示相关接口可能有VIP权限；模块有候选，未实测 | 先核验响应、时长单位、周期及累计范围；不能替代逐曲权重，不能用dt乘次数伪造 |
| 周/月/年报告 | `/listen/data/report?type=week或month或year&endTime=...`、`/listen/data/year/report` | 文档/模块有候选，未实测 | 可校验窗口与聚合指标；日期边界按上游文档核验，不预设本地自然周等价；未结束年份有支持限制 |
| 更明确窗口的歌曲计数 | `/listen/data/song/play/rank?type=week或month&endTime=...` | 文档描述playCount与Top20；本机模块存在，未实测 | 可作周期对照，不能把Top20合并成完整Top100或全历史 |
| 当日歌曲观察 | `/listen/data/today/song` | 文档/模块有候选，未实测 | 先确定是否事件、去重歌曲还是聚合；没有字段证据前不宣称精确小时行为 |
| 平台流行程度代理 | `/song/red/count?id=...`、详情中候选pop字段等 | 文档有红心人数入口；本项目未验证热度字段 | 不同代理、采集时间及可比样本分开保存；热度低不等于“小众审美”或品味高 |

对应官方项目资料：[回忆坐标模块](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced/blob/main/module/music_first_listen_info.js)、[时长模块](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced/blob/main/module/listen_data_total.js)、[周期报告模块](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced/blob/main/module/listen_data_report.js)、[歌曲周期排行模块](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced/blob/main/module/listen_data_song_play_rank.js)、[相似艺人模块](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced/blob/main/module/simi_artist.js)、[平台曲风偏好模块](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced/blob/main/module/style_preference.js)。文档声称的能力需要在账号和部署版本上逐项验证，不能凭模块注释推测具体响应字段。

## 当前覆盖及真实缺口

当前最近成功导出是百科补全快照，样本来自2026-09-17；不代表今天的实时红心状态。位置由`exports/latest.json`索引指向，详情见[输出目录说明](test-data-layout.md)。

| 字段 | 输入1：100首 | 输入2：50首 | 实际缺口 |
| --- | --- | --- | --- |
| 歌曲ID/名称、歌手、作品时长 | 全部具备 | 全部具备 | 本样本无缺失，不保证所有用户完整 |
| 专辑 | 96 | 49 | 4/1首缺失，保持空值 |
| 曲风 | 99 | 50 | 输入1缺1首；summary复查仍缺 |
| 语种 | 100 | 50 | 本样本具备，保持上游值 |
| BPM | 99 | 49 | 各缺1首，summary复查仍缺 |
| 发行时间（原值或百科补充） | 100 | 50 | 具备，但再版与首次发行需区分，两个来源原值均保留 |
| 当前红心状态 | 100可核验 | 50均验证为红心 | 冻结当时状态，不保证后来仍有红心 |
| 输入2红心加入时间 | 不适用 | 0首写入旧快照 | 源字段已实测；自动配置/正式时间来源契约未接入，旧版null保持不变 |
| 推荐标签 | 81 | 47 | 平台标签非必填，不混入曲风或心理推断 |

### 本次未找到可靠直接来源，或现有来源不支持的需求

- **首次红心、取消红心时间、完整多次红心历史**：现有likelist/playlist详情提供当前状态；单条at已被实测更新。本项目只能记录自己实际观测到的状态变化，采集间隔内的操作可能漏掉。没有发现可恢复既往完整日志的已验证接口。
- **注册至今完整播放事件、逐首实际时长、每次跳过/完播**：Top100、unique最近列表和聚合报告不足以保证这些字段完整；新候选报告也未被验证为事件日志。
- **旋律显著性、人声质感、音色、编曲密度、节奏强度及可靠情绪标签**：当前基本信息有BPM和推荐标签，但没有已验证的上述特征向量。节奏速度不等于节奏强度，“欢快”等标签不等于音频测量或用户情绪。
- **人群百分位和个性/心理原因**：需要本项目建立校准样本及反馈，不是任意一个网易云接口字段。不能仅凭当前账号训练并声称普遍有效。

这是一份本次核对范围内的能力判断，不宣称所有未来接口永久不能提供这些数据。音频/歌词获取接口不是已经完成的特征提取；若后续采用相关分析，应另行确定数据授权、特征来源、覆盖率与准确性验证，不能为填字段扩大当前采集。

## 画像算法与下一步数据计划

1. **先接自动近期红心**：稳定辨认本账号红心歌单；分页获取用户歌单，校验trackIds完整性、与likelist一致性、at合法性与缓存新鲜度；显式区分最近50首/最近7天，来源标注为上游当前记录加入时间。保留手动选择与降级，不将“无权限/字段缺失”当空红心。
2. **用已有字段解释审美结构**：输入1按播放次数，输入2按歌曲等权，合作艺人和多曲风标签分摊；比较歌曲交集、艺人/曲风/语种分布及JSD。有效歌曲数、覆盖率和每维有效权重伴随结果，长期样本之外只称样本之外。
3. **分别验证候选增强**：自订歌单先确定用户是否选择纳入及时间语义；首次收听、时长/周期报告、相似歌手分别做小样本契约与权限验证，成功后保存允许字段投影，不保存完整私人响应。
4. **再决定内容特征模型与校准**：可靠曲风/语种可先用于分布，BPM用于速度偏好；旋律、人声和情绪须取得经过验证的歌曲特征再聚合。新增算法版本不覆盖旧快照，变化结论只用可比观察时点。

每个新增来源至少登记：接口/参数、部署版本、账号权限、字段单位、统计窗口、去重规则、时间含义、采集时间、覆盖率、失败降级及隐私保存范围。先确认输出证据，再决定画像公式；统计可用不等于心理解释成立。

当前本机只读桥仅开放二维码/授权、播放记录、likelist、song/detail、user/playlist、playlist/detail、song/wiki/info、song/wiki/summary及album。其余文档接口没有自动开放；后续逐项加入允许列表，不暴露like、playlist/tracks等写操作。小程序使用自有API，不直连持有Cookie的上游。

相关指导：[产品规范](product-spec.md)、[原完成指南](design/项目完成指南.md)、[字段补全与红心实测](metadata-enrichment.md)、[导出与画像决策](data-export-and-profile.md)、[隐私约束](privacy.md)、[优化路线](roadmap.md)。
