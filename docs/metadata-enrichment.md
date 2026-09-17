# 歌曲字段补全

## 来源与语义

`design/API 文档.txt`指向Enhanced API在线文档。歌曲百科接口`/song/wiki/info?id=...`在已部署4.40.1中可用，源码位于[上游模块](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced/blob/main/module/song_wiki_info.js)。本次按真实响应验证以下路径，仅提取`bizCode=songDetailNewSongWiki`内`rnData.blocks`中`blockCode=wikiSubBlockBaseInfoVo`的基本信息。

| 百科基本信息标题 | 输出字段 | 规则 |
| --- | --- | --- |
| 曲风 | styleIds、styles | 保留标签ID及名称，去重；不混入推荐标签 |
| 语种 | language | 保留上游原值，不根据艺人或歌名猜测 |
| BPM | bpm | 有限、正数且≤400；不读取乐谱演奏版BPM |
| 发行时间 | wikiPublishTime | 严格有效日期且不在未来；与原publishTime分别保留，原值缺失才补入 |
| 推荐标签 | recommendationTags | 独立保存；这是平台标签，不作为心理或音频情绪测量 |

百科由平台及共建信息提供，来源可追溯不代表标签已经由人工音乐学标注验证。百科基本信息发行时间不同于MV发布时间；BPM不同于乐谱BPM。本次探测确实出现171与乐谱170的差异，解析器只取歌曲基本信息。

缺失的歌手、专辑不通过百科文本强行补出ID。未知收藏时间仍为null；百科的首次收听时间也不能代替收藏时间。百科接口还有私人听歌记忆、评论及歌词等，本项目只缓存上述允许字段，不保存完整百科响应。

## 运行与保存

```powershell
# 先启动本地只读桥（已开放song/wiki/info、song/wiki/summary、album读取）
npm start --prefix services/netease-api-enhanced
# 从指定已保存快照补全，只改变元数据
npm run enrich:account -- .data/real-test e7176710-d738-4b85-8230-5e8392518e82
npm run export:account -- .data/real-test
```

输入1与输入2并集逐首查询，500ms最小调度间隔，已有请求超时/有限重试规则。公开字段投影在按用户隔离的加密缓存中保存7天，后续常规采集会复用；空百科记为empty，失败保留原详情并记录warning。缓存过期后可重新执行补全命令；常规采集不自动对全部最近播放歌曲进行百科请求。

命令要求数据库恰好一个真实测试账户、无正在采集的任务、当前输入与源快照相符、源原始响应尚未超过24小时TTL。生成新的不可变快照，不覆盖旧快照。保留原采集时间及所有播放/红心字段，另外记录每首百科查询时间、解析器版本、available/empty状态。补全产生的同日快照不能视为用户审美变化。

CSV新增styles、bpm、wikiPublishTime、recommendationTags、enrichment；JSON schemaVersion升级为2，并附字段覆盖数量。旧快照及其导出保持原始证据，新导出放到新的snapshotId目录，使用新链接查看。

## 本次真实结果（2026-09-17）

142首并集查询全部成功，生成新快照`a3b49eec-25ab-4b20-8be8-b506883cb6f0`。保留100/50首的原ID与顺序、长期/周/最近播放计数、红心状态、收藏时间和分析权重；JSON/CSV独立解析逐项匹配，权重各自合计为1。

| 覆盖项 | 输入1（100首） | 输入2（50首） |
| --- | --- | --- |
| 曲风 | 99 | 50 |
| 语种 | 100 | 50 |
| BPM | 99 | 49 |
| 原发行时间或百科补入 | 100 | 50 |
| 百科发行时间独立字段 | 100 | 50 |
| 歌手 | 100 | 50 |
| 专辑 | 96 | 49 |

对仍缺曲风/BPM的3首并集歌曲另查`/song/wiki/summary`，缺失项仍未返回，未用乐谱BPM或其他歌曲标签替代。未知专辑ID不从专辑名称猜测。输入2的收藏时间仍未知，与此前候选集合一致。

新导出保存在`.data/real-test/exports/a3b49eec-25ab-4b20-8be8-b506883cb6f0/`，含input1.csv、input2.csv、modules.json及本次候选选择依据副本input2-provenance.json。33项测试、类型检查、构建和编译产物smoke通过。

真实登录页恢复后另验页面HTTP200、二维码图片生成200、轮询waiting；没有重新扫码成功的证据，不将此次二维码探测当作新登录。数据补全使用先前账号持有人已确认的加密授权。
