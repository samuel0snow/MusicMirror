import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const pages=[];
function add(id,title,subtitle,kind,headline,caption,rows,action,note,flow){pages.push({id,title,subtitle,kind,headline,caption,rows,action,note,flow});}
add('01','光与回声','MUSICMIRROR / 开始','prism','听见你的审美','你的歌单，比你更了解你的音乐审美', ['长期反复听什么','最近主动喜欢什么','这些选择，如何延续与变化'],'开始探索','先看示例 · 使用合成数据','开始→02；先看示例→10，保持示例标记');
add('02','由你决定，开始连接','授权与隐私','privacy','只读你的音乐选择','连接网易云，生成可核对的审美画像',['读取可见播放与红心状态','保存报告，便于之后比较','不读取密码；可随时解绑或删除'],'同意并连接','先阅读隐私说明　›','阅读→38；同意→03；返回→01，不创建授权');
add('03','扫码连接网易云','授权 / 等待扫码','qr','在网易云中确认','请使用另一设备扫描此处的登录码',['同一手机？查看扫码帮助','此处为二维码占位，不可扫描','离开此页会取消未完成的扫码'],'查看扫码状态','取消连接','扫码→04；过期→05；取消→01；同机帮助→06');
add('04','已扫码，等待确认','授权 / 已扫描','prism','最后一步，在 App 确认','确认后会自动回到音乐输入',['请在网易云中确认本次登录','不需要填写账号密码','确认成功后读取连接状态'],'等待确认…','取消连接','确认→07；超时→05；拒绝或取消→01');
add('05','二维码已过期','授权 / 可恢复','empty','重新生成即可继续','之前的二维码已失效',['不会创建重复绑定','新二维码显示后重新扫码','网络不可用时保留重试入口'],'生成新二维码','返回开始页','重新生成→03；离开→01');
add('06','在同一部手机上连接','扫码帮助','privacy','选择方便的方式','二维码识别能力取决于网易云客户端',['可在电脑展示二维码后扫码','如 App 支持，可保存二维码识别','无法识别时，请使用另一台设备'],'返回登录二维码','示例稿不包含真实登录凭证','返回→03；保存码需相册权限，拒绝不阻止返回；不假设跨App自动跳转');
add('07','两种选择，一面镜子','输入 / 已连接','dual','长期行为 × 主动选择','两个模块独立呈现，再寻找联系',['长期聆听 · 接口可见 Top100','选定红心 · 最多 50 首，按歌曲等权','红心 ≠ 自订歌单 ≠ 订阅歌单'],'选择红心歌曲','也可先分析长期聆听','选择→08；跳过→09，输入2保持未配置');
add('08','选择你的红心歌曲','输入 2 / 编辑','list','已选 3 / 50 首','示例曲目；不会修改网易云红心',['✓ Glass Tide　　时间未知','✓ Afterlight　　 2026.09.10','✓ Blue Orbit　　红心状态待核验'],'保存选择','添加歌曲 ID　＋　　清空选择','添加ID/可选时间；超过50/重复/未来时间→44；保存→09；清空→45；无自动最近50首承诺');
add('09','准备好照见偏好','输入 / 已保存','dual','100 首 + 3 首','保存输入后，分析才会生成新的报告',['长期聆听 · 按播放次数加权','选定红心 · 每首歌曲等权','时间范围未知 · 不称为最近一周'],'看看我到底喜欢什么','编辑红心　›','刷新→11；编辑→08；未配置也允许刷新');
add('10','我的音乐审美','镜像 / 示例数据','orbit','新的歌手，熟悉的曲风','两类选择之间，有持续出现的线索',['01  反复中心 · 前10首占48%','02  共同曲风 · 出现在多个艺人间','03  主动红心 · 30%进入长期样本'],'探索全部 12 张卡片','长期100首 · 红心50首 · 示例','卡片→13—24；输入→07；结构→25；刷新→11；底部四导航');
add('11','正在整理音乐线索','分析 / 进行中','progress','分析正在进行','可离开此页，稍后继续查看',['已提交分析请求','正在获取资料与计算','完成后自动打开本次报告'],'稍后查看','不显示虚构的百分比或逐接口进度','离开→10；返回→12；完成→10；失败→43；上游只提供任务状态');
add('12','接着上次的分析','分析 / 恢复','progress','任务仍在进行','离开页面不会中断已提交的任务',['恢复已有任务，不重新创建','正在检查最新状态','报告完成后可从历史中查看'],'继续查看进度','网络中断？稍后再试','查询原run→11/10/43；超时保留任务；取消状态→47');

const cards=[
['center','反复聆听的中心','48%','前 10 首的播放份额','ring',['长期样本 100 首 · 按次数加权','有效曲库 27.4 首 · 均匀规模','代表作品：Glass Tide / Afterlight'],'不是注册以来的完整播放历史','完整播放事件、实际秒数与完成状态'],
['fingerprint','可验证的审美坐标','共同的曲风','跨越歌手，仍然出现的音乐线索','bars',['曲风：电子 42% / 游戏原声 28%','语种：日语 38% / 纯音乐 32%','曲风加权覆盖 86% · 其余未知'],'已知标签内份额；各维度分别显示覆盖','完整事件与同维度元数据'],
['alignment','喜欢与实际聆听','30%','选定红心出现在长期样本中','overlap',['15 / 50 首与长期样本重合','长期按次数，红心按歌曲等权','最近出现仅表示去重样本命中'],'红心不等于播放；不同权重不混为总分','完整播放事件中的红心时长与完成率'],
['continuity','换歌手，还是换审美','对象变了','曲风轴仍保留部分共同点','paired',['新艺人权重 40% · 选定红心','艺人 JSD 0.31 / 曲风 JSD 0.08','曲风覆盖：长期86% / 红心88%'],'分布距离不是显著性，也不是品味评分','同体系音频特征；两个模块均达到覆盖门槛'],
['discovery','新发现，旧歌再喜欢','相遇与红心','首次可见收听和当前红心是两件事','timeline',['首次可见收听 · 2024.05.02','当前红心记录 · 2026.09.10','可核对间隔；无法确认首次喜欢'],'重新红心会更新记录；异常负间隔单列','完整 like / unlike 历史'],
['lifecycle','一首歌，与你的关系','Glass Tide','示例歌曲的关系档案','timeline',['首次可见收听 · 2024.05.02','累计 13 次 / 42 分钟','最多播放日 · 2025.10.02 / 5次'],'累计分钟采用来源值，不以歌曲时长推算','完整播放事件中的周序列与活跃周'],
['timeContext','音乐出现的时间','18—22 点','这首示例歌曲的常听区间','hours',['按歌曲显示区间，不按播放量累加','峰值日期 · 2025.10.02','时区与查询时间可在来源中查看'],'区间不代表逐小时分布，不推断作息心理','完整事件、实际秒数和明确时区'],
['ecology','你的选择生态','选择的不同层次','关注、订阅与歌单，各自保留含义','network',['关注艺人 · 对照已知实播份额','订阅专辑 · 对照作品联系','自有歌单 · 仅分析已提供的样本'],'不把歌单订阅当歌曲红心，不猜场景','完整歌单与用户明确声明的场景'],
['periods','投入，也看内容边界','8 小时 55 分','示例月报 · 2026.08.01—08.31','stack',['音乐 535 分钟','播客 20 分钟 / 有声书 0 分钟','全内容 555 分钟 · 与音乐分开'],'保留原始窗口；不同长度不直接比总量','等长度完整事件窗口'],
['popularity','流行度与独立选择','还不足以判断','缺少同时间、同类别的参照','empty',['不提供“小众分数”','年代和罕见歌名不能代替流行度','补充参照后再展示经验百分位'],'数据不足不等于0，也不表示审美优劣','至少30首匹配参照与同期流行度'],
['acoustic','声音偏好','节拍只是一个线索','已有 BPM，尚不能解释全部声音','range',['BPM：90 / 129 / 160 分位数','纯音乐标签 · 基于可靠元数据','旋律、人声质感与情绪暂不可判断'],'BPM不等于律动；推荐标签不代替音频测量','经过验证、可比较的音频特征'],
['trajectory','持续变化的轨迹','让变化有迹可循','当前仅一次观察，尚不能描述趋势','empty',['同算法版本','同选择方式、权重与时间规则','累积3次后，结合份额观察变化'],'一次双模块差异不能当作历史转向','至少3次同版本同规则且分布非空的画像'],
];
cards.forEach((c,i)=>{let [key,title,head,cap,kind,rows,note,needs]=c;add(String(13+i),title,'审美卡片 / '+String(i+1).padStart(2,'0')+' · 示例数据',kind,head,cap,rows,'查看证据与来源',note,`cardId=${key}；现有数据→本页；增强→27；证据→28；轨迹→33；需要：${needs}`);pages.at(-1).cardId=key;pages.at(-1).required=needs;});

add('25','我的长期结构','探索 / 输入 1','bars','100 首可见样本','播放次数加权，查看作品如何构成中心',['歌曲　/　歌手　/　专辑','Top10 份额 48% · 有效曲库27.4','合作艺人分摊一首作品的权重'],'查看代表作品','样本范围与加权说明　›','维度切换刷新列表；歌曲→18；证据→28；无风格数据隐藏该维度');
add('26','我的主动偏好','探索 / 输入 2','paired','50 首主动选择','每首等权，与长期听歌并列观察',['曲风　/　语种　/　年代','艺人权重：新艺人40%','红心时间范围未知 · 状态可核验'],'编辑选定红心','保存后需刷新；旧报告保持原输入','编辑→08；风格列表；长期对照→15；未配置→45');
add('27','增强分析，需要什么','卡片 / 增强状态','empty','当前资料还不够','先说明缺少什么，再决定是否补充',['完整播放记录 · 尚未提供','音频特征 · 尚未验证','参照或场景 · 按卡片分别说明'],'返回现有数据','仅说明条件；当前没有自动补齐入口','根据卡片requiredData替换列表；已有增强→展示对应事实；无数据不收费解锁');
add('28','每一句，都有依据','证据 / 来源','list','前10首，占48%','以下数字仅用于展示设计结构',['输入：长期100首 / 次数权重','采集：09.19 14:30 / 计算14:32','元数据覆盖86% / 独立查询14:31'],'查看计算说明','样本明细 · 解释边界 · 算法版本','明细→歌曲列表；说明→29；返回原卡片；来源时间不混同');
add('29','如何得到这条结论','证据 / 方法','privacy','分布，不是评分','例：Top10份额 = 前10首次数 / 总次数',['只在可见长期样本中计算','缺失字段单独展示，不自动补零','music-aesthetic-2.0 · 版本固定'],'返回卡片','覆盖率是数据充分度，不是正确概率','返回原卡片；每张卡由method/limitations提供专属说明');
add('30','留住每一次镜像','变化 / 历史','timeline','你的审美，有了时间轴','选择两次报告，看看具体变化',['09.19　12张卡片 · 当前版本','09.05　12张卡片 · 当前版本','08.22　历史报告 · 可查看'],'选择两次进行比较','历史报告保持当时的输入与版本','点日期→31；多选两条→32；分页加载；不同版本→46');
add('31','那时，你这样听歌','历史 / 只读快照','orbit','2026 年 9 月 5 日','历史记录 · 不随当前红心输入改变',['采集时间与报告版本可展开','保留当时100首 / 50首选择','旧版报告保留原解释方式'],'与另一份报告比较','返回历史列表','旧版本显示历史标识与当时指标；不伪装成12卡；比较→32/46');
add('32','两次选择，具体差在哪里','变化 / 两份报告','paired','曲风份额发生变化','示例：09.05 → 09.19 · 可比口径',['电子份额 34% → 42%','选定重合 26% → 30%（+4百分点）','代表作品：新增2首 / 移出1首'],'查看变化的作品','JSD只描述距离；不自动断言方向','展开具体作品；卡片可用状态变化另列；更换日期→30');
add('33','一份持续变化的自画像','变化 / 趋势','trajectory','三个时点，开始连成线','30 天　 /　 90 天　 /　 全部',['08.22　→　09.05　→　09.19','同版本、同规则的3次观察','沿着标签份额，查看变化方向'],'查看相邻报告','不足3次时显示积累进度，不画趋势线','窗口切换；点观察→31；不足3次→34');
add('34','下一次，再多一条线索','变化 / 样本不足','empty','已有 2 / 3 次可比画像','再积累一次，才有足够时点描述趋势',['可先比较现有两次报告','规则变化的报告单独保留','无需反复刷新制造相同快照'],'比较已有报告','等待下一次真实变化','比较→32；刷新→11；无变化→47');
add('35','分享你愿意展示的部分','分享 / 概念功能','orbit','新的歌手，熟悉的曲风','分享预览 · 示例数据',['✓ 保留样本范围与数据日期','○ 显示昵称与歌曲列表（默认关）','✓ 保留结论边界和示例标记'],'保存分享图片','保存后由你决定是否发送','未来功能：选择字段→预览→系统保存；拒绝相册权限可重试；不自动发送');
add('36','把报告留在自己手中','导出 / 概念功能','list','选择导出内容','保存前确认将包含哪些个人偏好',['完整 JSON · 含12类卡片结果','输入1 CSV · 长期歌曲特征','输入2 CSV · 选定红心特征'],'确认并导出','已导出的文件需自行管理与删除','现有CLI能力的UI方案，尚无下载API；完成显示文件去向；失败保留选择');
add('37','我的连接与资料','我的 / 账户','privacy','音乐由你，资料也由你','当前连接 · 示例账号',['输入管理与最近一次报告','外观：跟随系统 / 浅色 / 深色','隐私、导出与连接管理'],'查看隐私与数据','退出登录　›','输入→07；历史→30；隐私→38；导出→36；退出→42');
add('38','清楚知道，保存了什么','隐私 / 数据说明','privacy','可查看，也可撤回','连接与删除有不同的影响',['播放与红心：用于画像和对照','认证凭据：加密保存在服务端','原始响应24小时 / 公共缓存30天'],'管理连接与数据','导出文件不随账户删除自动消失','管理→39/40；保留策略与隐私文档同步；不承诺立即擦除所有备份');
add('39','解除网易云连接？','账户 / 解绑确认','privacy','报告将继续保留','之后重新连接，才能获取新资料',['停止正在进行的采集','清除服务端授权凭据与私有缓存','保留已生成的历史报告'],'确认解绑','取消，保留连接','确认→未绑定37，可看历史；失败保留当前状态；取消→37');
add('40','删除全部项目数据？','账户 / 删除确认','empty','这项操作无法撤回','删除 MusicMirror 中的用户关联资料',['删除报告、输入、任务与会话','网易云原始音乐资料不受影响','已下载或分享的副本需自行删除'],'确认删除全部数据','取消，保留数据','危险操作二次确认；成功→41；失败显示原因并可重试');
add('41','项目数据已删除','账户 / 删除完成','prism','这一面镜子，已清空','账户关联、报告与会话已移除',['已停止未完成的采集','旧登录会话不再有效','请自行管理之前导出的文件'],'返回开始页','公共歌曲资料不含你的用户关联','返回→01；不得在后台继续写回删除账号数据');
add('42','退出这次登录？','账户 / 退出确认','privacy','绑定与报告仍保留','下次验证登录后，可以继续查看',['仅结束当前会话','不等同于解除网易云绑定','不删除已生成的报告'],'确认退出','取消，继续浏览','确认→01；取消→37；不与解绑或删除混用');
add('43','这次没能完成分析','异常 / 网络或任务失败','empty','资料还没有准备好','已保存的报告仍然可以查看',['网络中断：稍后恢复原任务','采集失败：显示安全原因，可重试','登录失效：重新连接后再分析'],'重试或恢复','查看上次报告','网络→12；任务失败→11；401→03；不显示上游敏感原文');
add('44','请检查红心输入','异常 / 输入与采集冲突','list','保留输入，修改即可','输入问题在对应行下方说明',['歌曲ID重复：移除重复项','红心时间不能在未来','采集中暂不能保存新的选择'],'返回修改','当前最多支持50首选定红心','400→08行级提示；409→12并保留草稿；存储失败不假装成功');
add('45','红心模块，留给你的选择','空状态 / 输入 2','empty','尚未选定红心歌曲','长期聆听仍可以独立生成报告',['未配置：从未保存过输入','已清空：你主动移除了所有选择','两种状态都不以最近播放代替'],'选择红心歌曲','先查看长期聆听','选择→08；长期→25；清空需保存并刷新才影响新报告');
add('46','这两份报告口径不同','异常 / 不可比较','empty','分别查看，更准确','版本或选择规则不同，无法直接相减',['保留两份报告各自的结论','不画误导性的趋势连接线','选择同版本、同规则的报告再比'],'重新选择报告','分别查看两份报告','返回→30；分开→31；不以旧六指数换算12卡');
add('47','已经是这次的最新结果','分析 / 无变化与冷却','progress','资料没有变化','沿用已有报告，不创建重复记录',['相同请求返回同一个分析任务','刷新过于频繁时提示稍后再试','任务取消时显示未生成新报告'],'查看已有报告','稍后再刷新','unchanged→原快照；429按服务端等待提示；cancelled允许返回或稍后重试');
add('48','只展示能够确认的部分','质量 / 缺失与零值','bars','未知，不是零','每个维度保留自己的数据边界',['已知0次：显示0；未获取：显示—','部分可用：显示覆盖与缺失原因','云盘或元数据缺失：保留歌曲ID'],'查看来源与缺失项','不为填满页面猜测曲风或心理','partial显示已知事实；unavailable显示所需数据；过期来源标注时间');

const groups=['开始与授权','双输入与分析','审美卡片 01—06','审美卡片 07—12','探索与可解释性','历史、变化与分享','账户与数据自主','异常、恢复与边界'];
function render(p){
const dark=['13','18','24','31','35'].includes(p.id), ink=dark?'#F5F3FF':'#202438', muted=dark?'#B9BED3':'#626980', panel=dark?'#20263D':'#FFFFFF', stroke=dark?'#39405B':'#DFE3EF', purple=dark?'#C4B1FF':'#6550B9',cyan=dark?'#70D9E9':'#087D91';
let out=[];const rect=(x,y,w,h,r,fill,border='none')=>out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${border}"/>`);
const text=(x,y,s,size=15,color=ink,weight=400)=>out.push(`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}">${esc(s)}</text>`);
const line=(x1,y1,x2,y2,c=stroke,w=1)=>out.push(`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${c}" stroke-width="${w}" fill="none"/>`);
const circle=(x,y,r,fill,border='none',sw=1)=>out.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${border}" stroke-width="${sw}"/>`);
const wrap=(s,max=23)=>{const rows=[];let row='',n=0;for(const ch of s){const v=/[\x00-\xff]/.test(ch)?0.55:1;if(n+v>max){rows.push(row);row='';n=0;}row+=ch;n+=v;}if(row)rows.push(row);return rows;};
out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844" role="img" aria-label="${esc(p.title)}"><defs><linearGradient id="bg${p.id}" x2="1" y2="1"><stop stop-color="${dark?'#111629':'#F9FAFE'}"/><stop offset="1" stop-color="${dark?'#232039':'#EFECFA'}"/></linearGradient><linearGradient id="pr${p.id}" x2="1" y2="1"><stop stop-color="#A48AE9" stop-opacity=".8"/><stop offset="1" stop-color="#77D8E5" stop-opacity=".4"/></linearGradient></defs><g font-family="Microsoft YaHei, PingFang SC, sans-serif">`);
rect(0,0,390,844,28,`url(#bg${p.id})`);text(24,30,'9:41',13,ink,600);text(308,30,'▮▮  ▰',12,ink);text(24,68,'‹',29);text(55,65,'MusicMirror',14,muted,600);rect(292,45,76,31,16,panel,stroke);text(306,66,'•••  ⊙',16,ink);text(24,105,p.subtitle,11,muted,600);text(24,142,p.title,22,ink,650);
if(p.cardId){rect(24,164,342,38,12,dark?'#292F49':'#E8E6F3');rect(28,168,164,30,9,panel);text(69,189,'现有数据',13,ink,600);text(229,189,'增强分析',13,muted);}
else {text(24,178,'光与回声  /  设计示例',11,muted);}
rect(24,218,342,240,24,panel,stroke);
const cy=336;
if(p.kind==='prism'||p.kind==='privacy'){
out.push(`<path d="M196 237L255 305L211 401L133 346Z" fill="url(#pr${p.id})" stroke="${purple}" stroke-opacity=".3"/><path d="M196 237L184 323L255 305M184 323L211 401M184 323L133 346" fill="none" stroke="${dark?'#ECE6FF':'#FFF'}" stroke-width="2"/><ellipse cx="194" cy="343" rx="102" ry="25" transform="rotate(-20 194 343)" fill="none" stroke="${cyan}" stroke-opacity=".45"/>`);
if(p.kind==='privacy'){rect(173,304,45,42,10,panel,purple);out.push(`<path d="M184 303v-8a11 11 0 0 1 22 0v8" stroke="${purple}" stroke-width="3" fill="none"/>`);circle(196,323,3,purple);}
}else if(p.kind==='qr'){
rect(110,243,170,153,16,dark?'#30364D':'#EEEAF8',stroke);for(const [x,y] of [[127,258],[225,258],[127,341]]){rect(x,y,36,36,4,'none',purple);rect(x+9,y+9,18,18,2,purple);}text(168,327,'示意',18,purple,600);text(118,427,'登录码占位 · 不可扫描',12,muted);
}else if(p.kind==='ring'){
circle(195,322,67,'none',stroke,18);out.push(`<circle cx="195" cy="322" r="67" fill="none" stroke="${purple}" stroke-width="18" stroke-dasharray="202 421" transform="rotate(-90 195 322)" stroke-linecap="round"/>`);text(149,335,'48%',40,ink,600);text(150,426,'前10首 / Top100',12,muted);
}else if(['overlap','orbit','dual'].includes(p.kind)){
circle(161,319,64,`url(#pr${p.id})`,purple);circle(236,330,64,'none',cyan,2);out.push(`<ellipse cx="196" cy="322" rx="127" ry="35" transform="rotate(-22 196 322)" fill="none" stroke="${stroke}"/>`);text(69,418,'长期聆听',13,purple,600);text(255,418,'主动红心',13,cyan,600);
}else if(p.kind==='list'){
const labels=p.id==='36'?['完整报告 · JSON','长期输入 · CSV','选定红心 · CSV']:p.id==='28'?['样本与权重','采集与计算时间','字段覆盖与来源']:p.id==='44'?['重复歌曲ID','未来红心时间','暂时无法保存']:['Glass Tide','Afterlight','Blue Orbit'];
labels.forEach((s,i)=>{let y=244+i*62;rect(42,y,306,50,12,dark?'#2C334B':'#F4F2FA');text(57,y+31,String(i+1).padStart(2,'0'),13,purple,600);text(88,y+31,s,15,ink,500);text(327,y+31,'›',18,muted);});text(44,437,p.id==='08'?'＋ 添加歌曲 ID 与可选时间':'选择一项，查看详细信息',12,muted);
}else if(p.id==='48'){
[['已知为零','0'],['尚未获取','—'],['部分可用','62%']].forEach(([label,value],i)=>{const y=272+i*55;text(49,y,label,15,muted);text(273,y,value,23,ink,600);line(46,y+17,339,y+17);});
}else if(['bars','paired','stack'].includes(p.kind)){
let labels=p.kind==='stack'?['音乐','播客','有声书']:p.id==='25'?['作品01','作品02','作品03']:['电子','原声','其他'];
const values=p.kind==='stack'?[535/555,20/555,0]:[.42,.28,.30];
labels.forEach((label,i)=>{let y=268+i*53;const share=p.id==='25'?[.12,.08,.06][i]:values[i];text(45,y+12,label,13,muted);rect(109,y,178,9,4,stroke);rect(109,y,178*share,9,4,purple);text(294,y+11,p.kind==='stack'?['535','20','0'][i]:p.id==='25'?['12%','8%','6%'][i]:['42%','28%','30%'][i],11,muted);if(p.kind==='paired')rect(109,y+14,178*[.34,.36,.30][i],7,3,cyan);});text(46,432,p.id==='32'?'紫：09.19　青：09.05 · 长期次数权重':p.kind==='paired'?'紫：长期次数权重　青：红心等权':p.kind==='stack'?'原始时长 / 分钟 · 全内容555分钟':p.id==='25'?'前三首示例 · 长期样本内播放份额':'已知曲风内份额；覆盖率另行显示',11,muted);
}else if(['timeline','trajectory','progress'].includes(p.kind)){
if(p.kind==='timeline'){line(58,257,58,402,purple,2);(p.id==='30'?['09.19 · 当前报告','09.05 · 过去的镜像','08.22 · 最初的观察']:['初次相遇','持续聆听','主动选择']).forEach((s,i)=>{circle(58,268+i*58,6,panel,purple,2);text(81,274+i*58,s,16,ink,500);});}
else{line(68,384,321,384,stroke);out.push(`<path d="M72 349L190 304L311 273" stroke="${purple}" stroke-width="3" fill="none" ${p.kind==='progress'?'stroke-dasharray="5 8"':''}/>`);[[72,349],[190,304],[311,273]].forEach(([x,y],i)=>{circle(x,y,7,panel,purple,3);if(p.kind==='trajectory')text(x-12,y-17,['28%','34%','42%'][i],13,ink);});text(58,419,p.kind==='progress'?'已提交　　　处理中　　　完成':'08.22　　　 09.05　　　09.19',11,muted);if(p.kind==='trajectory')text(49,248,'电子 · 已知曲风内份额',12,muted);}
}else if(p.kind==='hours'){
for(let i=0;i<12;i++)rect(50+i*25,282,16,85,8,i>=9&&i<11?cyan:stroke);text(46,402,'00　　　 06　　　 12　　　 18—22',12,muted);text(76,428,'单曲常听区间 · 非小时频率',12,muted);
}else if(p.kind==='network'){
[[101,280],[282,270],[88,369],[289,376]].forEach(([x,y])=>{line(195,327,x,y,stroke,2);circle(x,y,21,`url(#pr${p.id})`);});circle(195,327,35,'none',purple,2);text(180,333,'音乐',14,ink);text(69,247,'关注',12,muted);text(269,242,'专辑',12,muted);text(63,423,'自有歌单',12,muted);text(263,423,'红心',12,muted);
}else if(p.kind==='range'){
line(70,322,319,322,stroke,10);line(108,322,273,322,purple,10);[108,197,273].forEach(x=>circle(x,322,8,panel,purple,3));text(90,367,'90',20,ink,600);text(176,367,'129',20,ink,600);text(252,367,'160',20,ink,600);text(61,417,'加权25分位　/　中位数　/　75分位',11,muted);
}else{
circle(195,314,54,'none',stroke,2);out.push(`<path d="M166 340L217 283M175 277L226 351" fill="none" stroke="${purple}" stroke-opacity=".4"/>`);text(164,327,'—',40,muted);text(85,420,['05','40','43','45','46'].includes(p.id)?'状态已说明，可选择下一步操作':'保留问题，不补造答案',13,muted);
}
text(24,496,p.headline,25,ink,650);wrap(p.caption,24).forEach((s,i)=>text(24,524+i*19,s,13,muted));
let yy=557;p.rows.forEach((s,i)=>{const lines=wrap(s,23);circle(30,yy+5,3,i===1?cyan:purple);lines.forEach((v,j)=>text(42,yy+10+j*17,v,13,ink));yy+=Math.max(35,lines.length*17+11);});
rect(24,680,342,50,16,p.id==='40'?'#AE354B':dark?'#D2C4FA':'#25263D');text(45,711,p.action,16,p.id==='40'?'#FFFFFF':dark?'#201A36':'#FFFFFF',600);text(329,711,'→',20,p.id==='40'?'#FFFFFF':dark?'#201A36':'#FFFFFF');
wrap(p.note,27).slice(0,2).forEach((s,i)=>text(24,752+i*16,s,11,muted));
const num=Number(p.id),hideNav=num<=6||(num>=39&&num<=42);const active=num===46?2:num===48?1:num>=43?0:num>=37?3:num>=30&&num<=34?2:num>=13&&num<=29?1:0;
if(!hideNav){line(24,788,366,788,stroke);['镜像','探索','变化','我的'].forEach((s,i)=>text(45+i*90,813,s,12,i===active?purple:muted,i===active?650:400));}rect(140,832,110,4,2,ink);out.push('</g></svg>');return out.join('');}

mkdirSync(join(root,'screens'),{recursive:true});mkdirSync(join(root,'boards'),{recursive:true});
for(const p of pages)writeFileSync(join(root,'screens',`S${p.id}.svg`),render(p));
for(let g=0;g<8;g++){
const group=pages.slice(g*6,g*6+6);let content=`<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="2020" viewBox="0 0 1320 2020"><rect width="1320" height="2020" fill="#E9EAF3"/><g font-family="Microsoft YaHei,sans-serif"><text x="44" y="55" font-size="15" fill="#6550B9" letter-spacing="3">MUSICMIRROR / 光与回声 / ${String(g+1).padStart(2,'0')}</text><text x="44" y="103" font-size="32" fill="#202438" font-weight="600">${groups[g]}</text><text x="44" y="133" font-size="13" fill="#626980">独立视觉设计稿 · 微信小程序 390 × 844 · 合成示例数据 · 非运行界面</text></g>`;
group.forEach((p,j)=>{let x=44+(j%3)*421,y=185+Math.floor(j/3)*910;content+=`<text x="${x}" y="${y-13}" font-family="Microsoft YaHei,sans-serif" font-size="13" fill="#626980">S${p.id} / ${esc(p.title)}</text>`+render(p).replace('<svg xmlns=',`<svg x="${x}" y="${y}" xmlns=`);});
content+='</svg>';writeFileSync(join(root,'boards',`board-${g+1}.svg`),content);
writeFileSync(join(root,'boards',`board-${g+1}.html`),`<!doctype html><meta charset="utf-8"><style>*{margin:0}body{width:1320px;height:2020px;overflow:hidden}svg{display:block}</style>${content}`);
}
writeFileSync(join(root,'screens.json'),JSON.stringify({version:'1.0',data:'synthetic design examples; no account values',pages},null,2));
writeFileSync(join(root,'FLOW-COVERAGE.md'),'# 页面与流程覆盖清单\n\n所有页面均有独立可编辑 SVG；画板 PNG 按每六页编组。数字均为合成示例。\n\n| 画面 | 页面 | 动作、状态与去向 |\n| --- | --- | --- |\n'+pages.map(p=>`| [S${p.id}](screens/S${p.id}.svg) | ${p.title} | ${p.flow} |`).join('\n')+'\n');
writeFileSync(join(root,'index.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MusicMirror · 光与回声设计稿</title><style>body{margin:0;background:#f4f4fa;color:#202438;font-family:"Microsoft YaHei",sans-serif}main{max-width:1320px;margin:auto;padding:40px 24px}h1{font-size:42px}p{line-height:1.8;color:#626980}a{color:#6550b9}img{width:100%;height:auto;border-radius:20px;margin:18px 0 44px}nav{display:flex;gap:18px;flex-wrap:wrap}section{margin:40px 0}h2{font-size:28px}.screens{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:22px}.screens img{margin:0}footer{padding:40px 0}</style><main><p>MUSICMIRROR / DESIGN STUDY 01</p><h1>光与回声</h1><p>48 个页面与状态 · 12 类审美卡片 · 微信小程序全流程视觉提案<br>独立设计交付，不连接账号或后端。全部数值为合成示例。</p><nav><a href="README.md">设计说明</a><a href="FLOW-COVERAGE.md">流程矩阵</a><a href="tokens.json">设计变量</a><a href="#screens">全部可编辑画面</a></nav><section><h2>视觉方向</h2><p>生成式概念图用于材质与气氛参考；界面措辞和数据口径以以下可编辑画板为准。</p><img src="concepts/visual-direction.png" alt="水晶、淡紫与青色的视觉概念"></section>${groups.map((g,i)=>`<section><h2>0${i+1} / ${g}</h2><a href="boards/board-${i+1}.png">PNG 图片</a> · <a href="boards/board-${i+1}.svg">可编辑 SVG</a><img src="boards/board-${i+1}.svg" alt="${g}六屏设计画板"></section>`).join('')}<section id="screens"><h2>48 个独立画面</h2><div class="screens">${pages.map(p=>`<a href="screens/S${p.id}.svg"><p>S${p.id} ${p.title}</p><img src="screens/S${p.id}.svg" alt="${p.title}" loading="lazy"></a>`).join('')}</div></section><footer>静态设计审阅索引 · 无业务逻辑、无登录、无网络请求</footer></main></html>`);
console.log(`Generated ${pages.length} editable screens and 8 boards.`);
