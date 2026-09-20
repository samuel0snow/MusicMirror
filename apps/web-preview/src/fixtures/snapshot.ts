import type {
  AccountModel,
  AestheticCardModel,
  HistoryItem,
  ModuleOverview,
  SnapshotViewModel
  , VariantModel, ChartModel
} from '../types.js';

const SNAPSHOT_ID = '2026-09-20T08:30:00Z';
const VERSION = 'web-preview-1.0';

const sum = (items: ReadonlyArray<number>) => items.reduce((a, b) => a + b, 0);

function rowsFor(base: Array<{ id: string; name: string; count: number }>, _unit: '次' | '首') {
  const total = sum(base.map((row) => row.count));
  return {
    rows: base.map((row, i) => ({
      id: row.id,
      name: row.name,
      count: row.count,
      value: total ? row.count / total : 0,
      display: (total ? (row.count / total) * 100 : 0).toFixed(1) + '%',
      isFirst: i === 0,
    })),
  };
}

function card(
  id: string,
  title: string,
  purpose: string,
  base: {
    status: 'available' | 'partial' | 'unavailable';
    method: string;
    coverage?: number | null;
    facts?: { label: string; value: string }[];
    summaries?: string[];
    limitations?: string[];
    requiredData?: string[];
    chart?: { kind: 'prism' | 'stat' | 'bars'; value?: string; caption?: string; rows?: { id: string; name: string; value: number; display: string }[] };
  },
  enhanced?: {
    status: 'available' | 'partial' | 'unavailable';
    method: string;
    coverage?: number | null;
    facts?: { label: string; value: string }[];
    summaries?: string[];
    limitations?: string[];
    requiredData?: string[];
  },
): AestheticCardModel {
  const make = (v: typeof base): VariantModel => ({
    status: v.status,
    statusText: v.status === 'available' ? '可作出判断' : v.status === 'partial' ? '部分可作出判断' : '资料不足',
    method: v.method,
    coverage: v.coverage ?? null,
    coverageText:
      v.coverage == null
        ? '未提供'
        : (v.coverage * 100).toFixed(1) + '%',
    facts:
      v.facts?.map((f) => ({ ...f })) ??
      [],
    summaries:
      v.summaries?.map((s) => ({ text: s })) ??
      [],
    limitations:
      v.limitations ??
      [],
    requiredData:
      v.requiredData ??
      [],
    chart: (v.chart ?? { kind: 'prism' }) as ChartModel,
  });

  return {
    id,
    title,
    purpose,
    base: make(base),
    enhanced: enhanced ? make(enhanced) : undefined,
  };
}

export function getAccount(): AccountModel {
  return {
    userId: 'demo-user-0421',
    nickname: '演示账号 · 合成数据',
    mode: 'mock',
    bound: false,
    memberSince: '2026-05-12',
    note: '浏览器预览模式，不连接任何真实网易云账号。',
  };
}

export function getSnapshot(): SnapshotViewModel {
  const cards: AestheticCardModel[] = [
    card(
      'center',
      '反复播放的中心',
      '长期播放最集中的歌曲构成你的听觉中心。',
      {
        status: 'available',
        method: '长期 Top100 加权累计',
        coverage: 0.329,
        facts: [
          { label: '长期样本', value: '100 首' },
          { label: '播放总次数', value: '12,480 次' },
          { label: '前 10 首播放次数', value: '4,112 次' },
          { label: '反复率', value: '32.9%' },
        ],
        summaries: [
          '反复播放的中心球呈现出明显集中趋势，前 10 首承担了大约三分之一的可见播放。',
          '中心曲目以「示例 0421」「示例 1903」为代表。',
        ],
        limitations: ['仅覆盖接口可见的长期 Top100。', '不包含完整历史音频。'],
        chart: { kind: 'stat', value: '32.9%', caption: '前10首在可见长期样本内的播放份额' },
      },
      {
        status: 'partial',
        method: '完整播放事件 + 实际秒数',
        coverage: 0.712,
        facts: [
          { label: '完整播放事件', value: '712/1000 天' },
          { label: '实际秒数完成率', value: '62.4%' },
          { label: '重听率', value: '18.2%' },
        ],
        summaries: ['增强分析使用完整事件与秒数完成率替换播放次数，结果与基础版基本一致。'],
        limitations: ['需要更长周期的完整事件采样。', '音频秒数来源尚未覆盖全部采样。'],
      },
    ),
    card(
      'fingerprint',
      '可验证的审美坐标',
      '各维度的可验证坐标，标注覆盖程度。',
      {
        status: 'available',
        method: '长期样本各维度加权',
        coverage: 0.48,
        facts: [
          { label: '歌手维度覆盖', value: '68 位' },
          { label: '专辑维度覆盖', value: '127 张' },
          { label: '曲风加权覆盖', value: '38.5%' },
          { label: '语种维度', value: '4 种' },
          { label: '年代维度', value: '1980–2026' },
        ],
        summaries: ['歌手与专辑维度的坐标已经有接近一半的样本可以验证。', '曲风、语种、年代坐标按覆盖程度分开展示。'],
        limitations: ['缺失标签的样本被排除；列表按覆盖程度排序。'],
        chart: {
          kind: 'bars',
          caption: '已知曲风内份额 · 加权覆盖 38.5%',
          rows: [
            { id: 'rock', name: '摇滚', value: 0.24, display: '24.0%' },
            { id: 'folk', name: '民谣', value: 0.18, display: '18.0%' },
            { id: 'pop', name: '流行', value: 0.15, display: '15.0%' },
            { id: 'electronic', name: '电子', value: 0.12, display: '12.0%' },
            { id: 'jazz', name: '爵士', value: 0.09, display: '9.0%' },
          ],
        },
      },
      {
        status: 'partial',
        method: '完整标签库 + 分维度覆盖',
        coverage: 0.68,
        facts: [
          { label: '已覆盖维度', value: '3 / 5' },
          { label: '缺失标签', value: '曲风 · 年代 · 语种' },
          { label: '可验证样本', value: '68%' },
        ],
        summaries: ['增强分析补齐了缺失标签的维度；覆盖率提高。'],
        limitations: ['需要授权标注来源与完整的元数据。'],
      },
    ),
    card(
      'alignment',
      '喜欢与播放的重叠',
      '选定红心与长期播放如何重叠。',
      {
        status: 'available',
        method: '红心集合 × 长期 Top100',
        coverage: 0.24,
        facts: [
          { label: '选定红心', value: '37 首' },
          { label: '出现在长期样本', value: '9 首' },
          { label: '重叠比例', value: '24.3%' },
          { label: '红心未播放', value: '18 首' },
        ],
        summaries: ['只有约四分之一的红心出现在长期中心中：你喜欢用重复播放表达喜爱。', '重叠之外的首 37 首红心继续保持单独观察。'],
        limitations: ['红心列表不包含接口外内容；未分享的收藏不计入。'],
        chart: { kind: 'stat', value: '24.3%', caption: '选定红心在长期中心中的重叠' },
      },
      {
        status: 'available',
        method: '红心历史 + 播放时长',
        coverage: 0.44,
        facts: [
          { label: '红心中有完整播放', value: '12 首' },
          { label: '取消红心后仍在播放', value: '3 首' },
          { label: '新红心（近30天）', value: '5 首' },
        ],
        summaries: ['增强分析能够分辨「现在喜欢但过去很少播放」的行为模式。'],
        limitations: ['需要红心历史时间线与播放时长事件。'],
      },
    ),
    card(
      'continuity',
      '换歌手，还是换审美',
      '比较最近记录与历史样本，区分歌单变化与审美变化。',
      {
        status: 'partial',
        method: '新旧采样比较 + 曲风距离',
        coverage: 0.42,
        facts: [
          { label: '历史采样', value: '2026-05 与 2026-07' },
          { label: '更新后采样', value: '2026-09-14' },
          { label: '歌手重叠度', value: '42.0%' },
          { label: '曲风距离', value: '0.18' },
        ],
        summaries: ['歌手名单变化主要来自新歌手，而不是完全更换审美方向。', '曲风距离较小，说明当前与历史方向一脉相承。'],
        limitations: ['历史采样与当前采样不是同一天；时间差被记录。'],
        chart: { kind: 'stat', value: '0.18', caption: '相邻采样之间的曲风距离' },
      },
      {
        status: 'unavailable',
        method: '逐日事件时间线 + 传播路径',
        coverage: null,
        facts: [],
        summaries: ['缺少逐日事件时间线，无法计算传播路径。'],
        limitations: ['需要同规则、同选择条件的更多采样点。'],
      },
    ),
    card(
      'discovery',
      '新发现与旧歌',
      '近段时间首次出现的新歌与再次出现的旧歌。',
      {
        status: 'available',
        method: '长期 Top100 与最近播放对比',
        coverage: 0.3,
        facts: [
          { label: '近30天首次播放', value: '14 首' },
          { label: '新歌手占比', value: '21.4%' },
          { label: '恢复播放的旧歌', value: '6 首' },
        ],
        summaries: ['新歌主要源于歌手类似的历史喜好，没有跳向完全陌生领域。'],
        limitations: ['「首次」只基于接口可见范围。'],
        chart: { kind: 'stat', value: '14 首', caption: '近30天首次听到的歌曲数' },
      },
      {
        status: 'partial',
        method: '完整事件 + 取消红心历史',
        coverage: 0.52,
        facts: [
          { label: '取消后重新红心', value: '2 首' },
          { label: '探索性播放占比', value: '9.4%' },
        ],
        summaries: ['重新红心的歌曲说明旧歌有被重新发现的过程。'],
        limitations: ['需要历史偏好事件的窗口。'],
      },
    ),
    card(
      'lifecycle',
      '一首歌，与你的关系',
      '观察单首歌被反复播放、暂停再回归的过程。',
      {
        status: 'available',
        method: '单个歌曲互动时间线',
        coverage: 0.5,
        facts: [
          { label: '示例歌曲', value: '1903' },
          {
            label: '播放节奏',
            value: '6 月· 12 次播放 · 0 次完成',
          },
          { label: '互动条目', value: '3 条' },
        ],
        summaries: ['这首歌在 6 月份高频出现，最近一个周期再次回归。'],
        limitations: ['需要该歌在接口范围内。'],
        chart: { kind: 'stat', value: '3 年 24 天', caption: '从首次见到当前的最长相识时长' },
      },
      {
        status: 'unavailable',
        method: '完整事件 + 行为序列',
        coverage: null,
        facts: [],
        summaries: ['缺少行为序列，无法回溯完整关系。'],
        limitations: ['需要完整播放事件。'],
      },
    ),
    card(
      'timeContext',
      '时间，也在参与选择',
      '按照时间窗口观察播放行为的变化。',
      {
        status: 'available',
        method: '19:00–22:00 时段采样',
        coverage: 0.55,
        facts: [
          { label: '晚间播放占比', value: '58.0%' },
          { label: '周末活跃度', value: '+18%' },
          { label: '单曲循环时段', value: '21:00–23:00' },
        ],
        summaries: ['晚间是主要听歌时段；周末更愿意听新歌。'],
        limitations: ['时段使用北京时间；不开设时区换算。'],
        chart: { kind: 'bars', caption: '时段内播放占比', rows: [
          { id: 'morning', name: '06–12', value: 0.12, display: '12.0%' },
          { id: 'afternoon', name: '12–19', value: 0.3, display: '30.0%' },
          { id: 'evening', name: '19–23', value: 0.42, display: '42.0%' },
          { id: 'night', name: '23–06', value: 0.16, display: '16.0%' },
        ] },
      },
      {
        status: 'unavailable',
        method: '包含“听到一半退出”的完整事件',
        coverage: null,
        facts: [],
        summaries: ['缺少完整事件中的退出位置，无法计算退出率。'],
        limitations: ['需要实际秒数数据。'],
      },
    ),
    card(
      'ecology',
      '选择的生态',
      '分析主动选择背后的场景：歌单、缓存、收藏。',
      {
        status: 'available',
        method: '来源场景采样',
        coverage: 0.4,
        facts: [
          { label: '自建歌单命中', value: '26.0%' },
          { label: '订阅歌单命中', value: '31.0%' },
          { label: '单曲红心', value: '29.0%' },
          { label: '其他来源', value: '14.0%' },
        ],
        summaries: ['你的听歌场景以自建与订阅歌单为主。'],
        limitations: ['仅对接口可见范围进行来源归类。'],
        chart: { kind: 'bars', caption: '听歌来源', rows: [
          { id: 'own', name: '自建歌单', value: 0.26, display: '26.0%' },
          { id: 'sub', name: '订阅歌单', value: 0.31, display: '31.0%' },
          { id: 'heart', name: '单曲红心', value: 0.29, display: '29.0%' },
          { id: 'other', name: '其他', value: 0.14, display: '14.0%' },
        ] },
      },
      {
        status: 'unavailable',
        method: '完整歌单与红心的对照',
        coverage: null,
        facts: [],
        summaries: ['需要完整歌单对象，无法完成更细的场景归因。'],
        limitations: ['需要本地上报的歌单场景。'],
      },
    ),
    card(
      'periods',
      '周期，让我重新喜欢',
      '按周期聚合播放记录，观察最近周期的趋势。',
      {
        status: 'available',
        method: '30 天聚合 + 趋势计算',
        coverage: 0.35,
        facts: [
          { label: '最近 30 天播放', value: '3,204 次' },
          { label: '周环比', value: '+6.4%' },
          { label: '活跃周数', value: '8/9' },
        ],
        summaries: ['最近 30 天集中在工作日与周末交替的节奏中。'],
        limitations: ['聚合周期不能与更早的周期缺失相比。'],
        chart: { kind: 'bars', caption: '最近周期趋势', rows: [
          { id: 'w1', name: '第1周', value: 0.72, display: '72.0%' },
          { id: 'w2', name: '第2周', value: 0.8, display: '80.0%' },
          { id: 'w3', name: '第3周', value: 0.64, display: '64.0%' },
          { id: 'w4', name: '第4周', value: 0.9, display: '90.0%' },
        ] },
      },
      {
        status: 'unavailable',
        method: '逐周完整事件聚合',
        coverage: null,
        facts: [],
        summaries: ['缺少逐周完整事件，无法展示每周趋势。'],
        limitations: ['需要更长周期的记录。'],
      },
    ),
    card(
      'popularity',
      '流行度与独立选择',
      '你的喜好是否跟随热度，或者保持独立。',
      {
        status: 'available',
        method: '与同期可比较歌曲的热度比较',
        coverage: 0.6,
        facts: [
          { label: '热门曲目占比', value: '35.0%' },
          { label: '独立选择占比', value: '65.0%' },
        ],
        summaries: ['你的选择更偏向独立，多数播放来自非热门曲目。'],
        limitations: ['热度参考基于演示样本；不作真实排名。'],
        chart: { kind: 'stat', value: '65.0%', caption: '非热门曲目播放占比' },
      },
      {
        status: 'unavailable',
        method: '完整流行度排名对照',
        coverage: null,
        facts: [],
        summaries: ['缺少完整排行与周期热度快照。'],
        limitations: ['需要真实排行榜来源。'],
      },
    ),
    card(
      'acoustic',
      '声音偏好',
      '从音频特征理解你喜欢的声音。',
      {
        status: 'available',
        method: '已验证音频特征采样',
        coverage: 0.2,
        facts: [
          { label: '节奏均值', value: '112 BPM' },
          { label: '声学能量', value: '中低' },
          { label: '人声清晰度', value: '中高' },
        ],
        summaries: ['你偏爱中速、人声靠前的作品；声学能量偏中低。'],
        limitations: ['仅覆盖可验证的音频特征；不推断人格。'],
        chart: { kind: 'bars', caption: '声学维度', rows: [
          { id: 'tempo', name: '节奏', value: 0.62, display: '62.0%' },
          { id: 'energy', name: '能量', value: 0.38, display: '38.0%' },
          { id: 'vocal', name: '人声', value: 0.74, display: '74.0%' },
        ] },
      },
      {
        status: 'unavailable',
        method: '完整音频特征库',
        coverage: null,
        facts: [],
        summaries: ['缺少完整的音频特征库，无法给出增强版声学图。'],
        limitations: ['需要完整音频特征来源。'],
      },
    ),
    card(
      'trajectory',
      '持续变化的轨迹',
      '将不同时间的镜像连接成轨迹。',
      {
        status: 'available',
        method: '同版本、同规则镜像对比',
        coverage: 0.75,
        facts: [
          { label: '可比镜像', value: '3 个' },
          { label: '变化方向', value: '稳定，小幅靠近新风格' },
          { label: '最近变化', value: '+0.06 节奏偏移' },
        ],
        limitations: ['轨迹只描述可观察到的时间窗口。'],
        chart: { kind: 'stat', value: '稳定', caption: '当前轨迹判断' },
      },
      {
        status: 'unavailable',
        method: '同一规则时间序列',
        coverage: null,
        facts: [],
        summaries: ['需要至少三个同规则镜像。'],
        limitations: ['历史镜像不足或规则不一致。'],
      },
    ),
  ];

  return {
    snapshotId: SNAPSHOT_ID,
    createdAt: '2026.09.20 08:30',
    algorithmVersion: VERSION,
    legacy: false,
    warnings: ['演示样本：所有数字来自固定的合成数据集。'],
    summary: {
      text: '长期播放习惯表明，你反复接近同一批作品，同时持续探索少量新歌；两者共同构成当前审美窗口。',
    },
    modules: {
      longTermListening: {
        title: '长期聆听',
        basis: 'play_count',
        sampleSizeValue: 100,
        stats: [
          { label: '长期样本', value: '100 首' },
          { label: '播放次数', value: '12,480 次' },
          { label: '前 10 首占比', value: '32.9%' },
        ],
        warnings: ['长期样本仅来自接口能看到的 Top100。'],
        chart: { kind: 'bars', caption: '前 10 首在长期样本内的占比', rows: [
          { id: 'top10', name: '前 10 首', value: 0.329, display: '32.9%' },
          { id: 'rest', name: '其余 90 首', value: 0.671, display: '67.1%' },
        ] },
      },
      recentFavorites: {
        title: '选定红心',
        basis: 'song_count',
        status: 'available',
        sampleSizeValue: 37,
        timeWindowLabel: '用户提供的红心时间',
        songs: [
          { id: '0421', name: '示例歌曲 0421', likedAt: '2026.09.14 20:10' },
          { id: '1903', name: '示例歌曲 1903', likedAt: null },
          { id: '0712', name: '示例歌曲 0712', likedAt: '2026.09.01 08:00' },
        ],
        stats: [
          { label: '选定红心', value: '37 首' },
          { label: '红心时间已知', value: '19 首' },
          { label: '红心时间未知', value: '18 首' },
        ],
        warnings: [],
        chart: { kind: 'bars', caption: '红心时间已知程度', rows: [
          { id: 'known', name: '已知', value: 0.51, display: '51.4%' },
          { id: 'unknown', name: '未知', value: 0.49, display: '48.6%' },
        ] },
      },
    },
    cards,
  };
}

export function getHistory(): HistoryItem[] {
  return [
    {
      snapshotId: SNAPSHOT_ID,
      createdAt: '2026.09.20 08:30',
      version: VERSION,
      rule: 'w5-2026, same-selection',
      mode: 'auto',
      note: '最新镜像',
    },
    {
      snapshotId: '2026-09-14T08:00:00Z',
      createdAt: '2026.09.14 08:00',
      version: VERSION,
      rule: 'w5-2026, same-selection',
      mode: 'auto',
      note: '一周前的镜像',
    },
    {
      snapshotId: '2026-07-01T09:00:00Z',
      createdAt: '2026.07.01 09:00',
      version: VERSION,
      rule: 'w5-2026, same-selection',
      mode: 'auto',
      note: '更早的历史镜像',
    },
    {
      snapshotId: '2026-05-12T10:00:00Z',
      createdAt: '2026.05.12 10:00',
      version: VERSION,
      rule: 'legacy-rule',
      mode: 'legacy',
      note: '旧版报告，无 12 类卡片',
    },
  ];
}

export function getBaseOverview(): ModuleOverview {
  const s = getSnapshot();
  return {
    snapshotId: s.snapshotId,
    created: s.createdAt,
    collected: s.createdAt,
    version: s.algorithmVersion,
    legacy: s.legacy,
    warnings: s.warnings,
    cards: s.cards,
    modules: s.modules,
  };
}

export function firstRowSummary(base: Array<{ id: string; name: string; count: number }>) {
  return rowsFor(base, '次').rows[0];
}
