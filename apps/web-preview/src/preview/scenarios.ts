import type { PageId } from './routes.js';

export interface Scenario {
  id: string;
  label: string;
  hint: string;
  expectedOutput: string;
}

export type ScenarioGroup = ReadonlyArray<Scenario>;

export const PAGE_SCENARIOS: Readonly<Record<PageId, ScenarioGroup>> = {
  welcome: [
    {
      id: 'guest',
      label: '访客 · 未登录',
      hint: '首次打开，未连接任何账号',
      expectedOutput: '展示本声明与两个入口：开始探索、先看示例。',
    },
    {
      id: 'session',
      label: '已有会话 · 可继续',
      hint: '本地已有演示会话',
      expectedOutput: '出现“继续查看我的镜像”按钮。',
    },
  ],

  login: [
    {
      id: 'qr-idle',
      label: '二维码空闲',
      hint: '尚未生成二维码',
      expectedOutput: '提示即将生成并展示 120 秒有效期的二维码。',
    },
    {
      id: 'qr-waiting',
      label: '等待扫码',
      hint: '二维码已生成',
      expectedOutput: '显示演示二维码图，注明“演示二维码，不可扫描”。',
    },
    {
      id: 'qr-scanned',
      label: '已扫码，等待确认',
      hint: '网易云已扫码',
      expectedOutput: '提示在网易云 App 中确认本次登录。',
    },
    {
      id: 'qr-expired',
      label: '二维码已过期',
      hint: '超过有效期',
      expectedOutput: '显示过期状态与“重新生成”入口。',
    },
    {
      id: 'qr-authenticated',
      label: '已在 App 确认',
      hint: '网易云确认成功',
      expectedOutput: '进入读档流程，随后跳转到配置输入页。',
    },
    {
      id: 'qr-cancelled',
      label: '已取消登录',
      hint: '用户在网易云取消',
      expectedOutput: '返回空闲状态，等待重新扫码。',
    },
  ],

  home: [
    {
      id: 'ready',
      label: '就绪 · 最近报告',
      hint: '已有完整报告',
      expectedOutput: '显示报告时间、长期样本与选定红心两个数字。',
    },
    {
      id: 'loading',
      label: '读取中',
      hint: '正在读取报告',
      expectedOutput: '居中加载提示，不显示任何数据。',
    },
    {
      id: 'error',
      label: '读取失败',
      hint: '加载报告失败',
      expectedOutput: '错误卡片与“重新查看”按钮。',
    },
    {
      id: 'empty',
      label: '尚无报告',
      hint: '首次登录尚未分析',
      expectedOutput: '显示空白卡片，没有任何伪造数字。',
    },
  ],

  explore: [
    {
      id: 'cards',
      label: '12 张卡片',
      hint: '默认卡片视图',
      expectedOutput: '列出全部 12 张审美卡片，不可用的卡片带资料不足标记。',
    },
    {
      id: 'long',
      label: '长期结构',
      hint: '切换至“长期”',
      expectedOutput: '展示歌手、专辑、曲风、语种、年代各维度占比。',
    },
    {
      id: 'heart',
      label: '主动偏好',
      hint: '切换至“红心”',
      expectedOutput: '展示选定红心及相关分布。',
    },
  ],

  structure: [
    {
      id: 'ready',
      label: '有长期样本',
      hint: '仅使用长期 Top100',
      expectedOutput: '展示样本数、播放加权占比与完整列表入口。',
    },
    {
      id: 'partial',
      label: '部分维度缺失',
      hint: '部分元数据不可用',
      expectedOutput: '缺失维度明确标注不可用原因，不显示 0。',
    },
  ],

  preferences: [
    {
      id: 'available',
      label: '红心可用',
      hint: '选定红心可分析',
      expectedOutput: '展示等权红心维度分布。',
    },
    {
      id: 'unavailable',
      label: '红心未配置',
      hint: '尚未选择红心',
      expectedOutput: '显示空状态卡片并引导配置输入。',
    },
  ],

  history: [
    {
      id: 'none',
      label: '零份报告',
      hint: '没有历史记录',
      expectedOutput: '显示“还没有历史记录”空状态。',
    },
    {
      id: 'single',
      label: '一份报告',
      hint: '刚产生第一次报告',
      expectedOutput: '仅显示一条报告。',
    },
    {
      id: 'many',
      label: '多份报告',
      hint: '超过三份',
      expectedOutput: '显示完整历史列表。',
    },
  ],

  card: [
    {
      id: 'base',
      label: '现有数据',
      hint: '卡片基础版本',
      expectedOutput: '使用基础事实与默认图表类型。',
    },
    {
      id: 'enhanced',
      label: '增强分析',
      hint: '卡片增强版本',
      expectedOutput: '切换为更精确的单位与更多事实来源。',
    },
    {
      id: 'unavailable',
      label: '资料不足',
      hint: '输入不满足卡片门限',
      expectedOutput: '显示所需资料列表，不渲染图表。',
    },
  ],

  evidence: [
    {
      id: 'detail',
      label: '证据明细',
      hint: '展开证据列表',
      expectedOutput: '逐条展示来源、时间与计算方式。',
    },
    {
      id: 'expired',
      label: '数据过期',
      hint: '来源数据已过期',
      expectedOutput: '来源时间保持原样并标注过期，不冒充新数据。',
    },
  ],

  compare: [
    {
      id: 'comparable',
      label: '可比',
      hint: '两报告同版本同规则',
      expectedOutput: '展示事实差异，不做跨口径比较。',
    },
    {
      id: 'incompatible',
      label: '不可比',
      hint: '版本不同',
      expectedOutput: '显示不可比原因，不生成差异数字。',
    },
  ],

  trends: [
    {
      id: 'sufficient',
      label: '三次以上',
      hint: '三次可比报告',
      expectedOutput: '相邻差异与说明。少于三次时不出现趋势。',
    },
    {
      id: 'insufficient',
      label: '少于三次',
      hint: '不足三次不可比报告',
      expectedOutput: '显示“至少三次可比观察”的说明。',
    },
  ],

  account: [{ id: 'ready', label: '账户与外观', hint: '演示账号已连接', expectedOutput: '可切换主题，并区分解绑、退出和删除。' }],
  inputs: [{ id: 'ready', label: '已选择红心', hint: '演示输入可编辑', expectedOutput: '支持添加、去重、删除与保存。' }, { id: 'empty', label: '尚未选择', hint: '红心输入为空', expectedOutput: '显示空输入并允许添加歌曲 ID。' }],
  run: [{ id: 'processing', label: '分析中', hint: '任务正在处理', expectedOutput: '显示进行中状态。' }, { id: 'completed', label: '已完成', hint: '生成新镜像', expectedOutput: '可打开本次报告。' }, { id: 'failed', label: '失败', hint: '任务失败', expectedOutput: '显示原因并允许重试。' }],

  privacy: [
    {
      id: 'informed',
      label: '已被告知',
      hint: '隐私说明已展示',
      expectedOutput: '列出所读取数据、留存时间与撤回方式。',
    },
  ],

  share: [
    {
      id: 'preview',
      label: '分享预览',
      hint: '生成预览图',
      expectedOutput: '预览图仅含所选字段，不含导入曲目列表等任何隐藏；默认不加昵称与歌曲名单。',
    },
  ],

  export: [
    {
      id: 'json',
      label: 'JSON 导出',
      hint: '包含报告全部事实与来源',
      expectedOutput: '导出 JSON，不含 Cookie、token、账号ID。',
    },
    {
      id: 'input-csv',
      label: '输入 CSV 导出',
      hint: '输入1与输入2',
      expectedOutput: '导出 CSV，仅含输入标识事实。',
    },
  ],
};

export const PAGE_DEFAULT_SCENARIO: Readonly<Record<PageId, string>> = {
  welcome: 'guest',
  login: 'qr-idle',
  home: 'ready',
  explore: 'cards',
  structure: 'ready',
  preferences: 'available',
  history: 'many',
  card: 'base',
  evidence: 'detail',
  compare: 'comparable',
  trends: 'trends-30',
  privacy: 'informed',
  share: 'preview',
  export: 'json',
  account: 'ready',
  inputs: 'ready',
  run: 'processing',
};
