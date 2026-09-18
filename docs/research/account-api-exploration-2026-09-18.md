# 已登录账号只读接口探索：2026-09-18

## 范围与证据

使用账号持有人先前确认的加密授权，先用login/status验证当前账号，再读取音乐画像相关来源。上游版本4.40.1；54次请求、38个不同只读端点，53次HTTP/业务码成功，1次拒绝。成功中包含2个空data对象，所以不能写成“53项数据全部可用”。

歌曲/艺人/专辑用既有样本，自有歌单检查3张（红心歌单与2张自订歌单），歌单/曲风/艺人关联列表使用有限分页。未遍历所有作品与历史时期，未采集音频、完整歌词、私信或好友关系。报告返回的额外好友块、歌单订阅者和百科无关内容已过滤；百科保留允许的基本字段和本用户首次收听/累计播放投影。

本机证据目录：`.data/real-test/explorations/2026-09-18T10-30-56.938Z/`。summary.json列出端点、参数名称、响应码、字段路径/类型/数组长度，不含私人字段值；每个响应投影单独加密保存，completed.json确认请求总数。字段结构仅抽取最多两条数组样本，不证明全部元素结构一致。旧的分析快照和100/50首导出未改写。

## 实际读取结果

| 来源 | 已观察字段/数量 | 能支持的分析与限制 |
| --- | --- | --- |
| login/status、user/level、user/subcount | 已验证身份；level/progress、nowPlayCount/nowLoginCount、创建/订阅歌单等计数 | 身份及活跃上下文；等级计数不是全历史播放事件 |
| artist/sublist、album/sublist | 33个关注艺人、11张订阅专辑；艺人ID、专辑ID、subTime、hasMore | 与常听/红心对照；关注/订阅不是逐曲红心 |
| user/record(type=0/1) | 长期100首、周100首；song、playCount | 原有长期与周结构；仍是截断聚合样本 |
| record/recent/song、album、playlist | 300首歌曲、各20条专辑与歌单样本；list、playTime、total | 最近对象出现情况，不能称完整事件日志 |
| likelist、song/like/check | 309个红心ID；3首样本批量状态返回2个红心ID | 当前喜欢状态；不存在于当前集合不等于从未喜欢 |
| user/playlist、playlist/detail | 29张歌单；3张自有样本trackIds数量309/26/73；成员id、at、位置、创建者 | 红心与自订歌单对照；自订歌单at首次/再次加入含义尚未受控验证 |
| playlist/track/all、playlist/detail/dynamic | 每张取20首详情；动态订阅/播放等字段 | 分页补详情可用，动态播放数不是账号个人逐曲次数 |
| song/detail、album | 3首详情、专辑样本26首，资料/发行时间/时长/权限 | 标准元数据关系；album是普通专辑内容来源 |
| album/detail | HTTP502，桥返回上游业务404 | 模块实际请求数字专辑商品详情，不能作为普通album的通用替代；不是所有专辑均可用 |
| artist/detail、artist/album、artist/top/song、simi/artist | 标准艺人资料、20张专辑样本、50首热门作品、20位相似艺人 | 作品/生态上下文；相似是平台关系，热门列表不是用户听过列表 |
| style/list、detail、song、album、artist | 28个顶层曲风项、标签层级；样本关联歌曲/专辑/艺人各20项 | 词表及关联样本，不是任意歌曲完整反查标签 |
| style/preference | tagPreferenceVos有5项，tagId/tagName/ratio；tags含层级 | 平台推断偏好独立对照；ratio为字符串，窗口和算法不明，不直接代替样本分布 |
| song/red/count | data.count、countDesc | 全平台红心人数代理，不是本账号红心次数或人群审美百分位 |
| song/wiki/info、summary | 已有基本信息；summary样本有FIRST_LISTEN、TOTAL_PLAY | 补全及听歌记忆的两个投影分别存，推荐标签不当曲风 |
| music/first/listen/info | 4首查询：首个样本data={}，其余3首有资料/记忆 | 样本覆盖不完整；非空样本字段详见下一节，空响应保留未知 |
| listen/data/total | data.totalDuration有数值 | 总时长候选已返回，单位/累计范围尚未完全确认 |
| listen/data/today/song | HTTP/业务200，但data={} | 本次不能提供当日歌曲；空对象不等于用户今天没有听歌 |
| listen/data/year/report | displayYear、6个yearItems；year/playNum/playDuration | 年度聚合可返回，不是年度逐次日志 |
| listen/data/report(type=week/month/year) | 周/月/年报告均返回；startTime/endTime、时长、歌曲/艺人/曲风摘要 | 以响应窗口解释，不根据请求type自行假定当前窗口 |
| listen/data/realtime/report(type=week/month) | 日明细分别6/18项；listenDays、playDuration、sleepTdBlock等 | 当前进行中周期与听歌时间分布，睡眠场景字段不是心理状态 |
| listen/data/song/play/rank(type=week/month) | 各20条songItems；songId/artists/playCount；songCount大于样本量 | 明确窗口的Top20，songCount不是全部明细返回数量 |

## 首次收听与红心字段的进一步理解

非空data包含songInfoDto、musicFirstListenDto、musicTotalPlayDto、musicLikeSongDto等：

- `musicFirstListenDto.listenTime`为毫秒数，并有date/time/season/period文本；两个样本与百科summary FIRST_LISTEN.timestamp一致。
- `musicTotalPlayDto.playCount`、`duration`提供另一个累计播放口径；duration单位及累计区间仍需确认，不能替代longPlayCount或与其他来源相加。
- `musicLikeSongDto.like`、`collect`同时存在，可见红心与另一个集合状态是独立字段；collect具体涵盖哪些收藏/歌单行为尚未受控验证，不能仅凭字段名映射为自订歌单成员。
- `musicLikeSongDto.redTimeStamp`在两个红心样本上与trackIds.at一致；昨天取消后重新点红心的受控样本也返回新at对应的redTimeStamp。它不能用作首次喜欢时间。
- `musicPlayMostDto`、`musicMinoritySongDto`、`musicFrequentListenDto`在本次非空样本中是null，字段名不能作为功能已可用的证据。

首次收听时间是上游记录可见的首次，不保证用户一生中或其他平台的首次。三首非空样本不足以证明全部100/50首均可用，下一步应批量补全并登记覆盖率，而非给缺失歌曲编时间。

## 周期和时长的关键边界

本次不填endTime，周report/rank返回北京时间2026-09-06 00:00至09-12 00:00；月report/rank返回2026-08-01 00:00至08-31 00:00。realtime周/月则从09-13/09-01起，到查询时刻。端点可能分别面向已完成周期与进行中周期，在线文档的“当前周/月”不能直接替代实际窗口。结束端是否包含当日仍需核验，不把边界补成09-01。

进一步按内容类型核对后，两处差异已解释：周report音乐每日duration之和98，podcastDuration之和30，audiobookDuration为0，总计128与distribution.playDuration一致；实时月音乐564、播客29、有声书0，总计593与汇总一致。音乐时长和全内容收听时长应分开，不能把播客并入音乐画像权重。周报文本明确出现“共收听96分钟”，月报文本出现“听了238分”，支持对应日时长按分钟解释；仍等待客户端对照。totalDuration、年度playDuration、首听duration、sections内数值不能据此全局统一单位。

周/月报告有topStyleBlock、topAgeBlock，月报告有topLanguageBlock；这些是摘要或少数样本，不是完整曲风/语言分布。topEmotionBlock为null，仍不支持宣称已取得可靠情绪特征。平台报告中人群比较文案也不是本项目校准后的百分位。

## 接入建议与复现

后续客户端核验：周报2小时8分钟、8月8小时55分钟与汇总128、535一致，对应周/月汇总按分钟计。周报差异来自30分钟播客。2025年度客户端202小时、1954首，与年度playDuration按秒换算后的202小时31分4秒及playNum=1954相符；年度时长仅核验到整小时显示精度，计数是否去重仍未知。累计客户端675小时51分钟与totalDuration按秒换算后的675小时51分38秒相符，累计范围和内容类型未确认。单曲字段单位仍独立待验，详见[时长核验](listening-duration-verification-2026-09-18.md)。

优先候选为：自动近期红心、firstListenedAt及来源覆盖、关注/订阅与实播差异、相似艺人辅助图谱、明确响应窗口的Top20周期对照。实际时长先解决单位、不同块口径与内容类型差异；平台偏好只作独立信号，暂不改写现有六指数。

```powershell
# 在services/netease-api-enhanced目录的终端启用额外只读端点
$env:READ_ONLY_EXPLORATION='true'
node start.cjs
# 仓库根目录另一终端
npm run explore:account
```

桥默认不开放探索扩展，flag仅加入列明的只读模块，未调用like/playlist修改接口。常规脚本安排53次请求，本轮另补1次受控红心歌曲的首听查询，共54次。探索脚本每次新建时间目录、逐请求保存结果、25秒请求上限及500ms间隔；不重复登录，不自动无限重试，不自动触发分析刷新。失败/空字段不意味着整个端点永远不可用。

私有投影加密文件须配合本机encryption.key读取；它们不受SQLite24小时TTL或账户删除自动管理。docs不提交私人ID、歌名列表或凭证。当前来源清单见[数据能力](../data-requirements-and-api.md)，运行指南见[开发指南](../development.md)，设计与历史入口见[导航](../README.md)。
