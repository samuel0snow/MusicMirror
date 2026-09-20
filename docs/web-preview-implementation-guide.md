# MusicMirror 交互式 Web Preview 建设指导

> 文档用途：交给能力较弱、上下文较短的 Agent，按阶段建设浏览器中的小程序界面镜像。
>
> 本项目不是正式 Web 产品，不替代微信小程序，不处理真实网易云凭证。它用于在浏览器中快速查看、修改和评审界面，并模拟按钮、表单、弹窗、加载、失败、空状态及页面跳转。

## 1. 最终目标

在仓库中新建 `apps/web-preview`。完成后，开发者在仓库根目录执行：

```powershell
npm run dev:web
```

浏览器应打开一个桌面评审界面，其中包含：

- 中央 390 × 844 像素的手机预览画布；
- 与现有微信小程序一致的 17 个页面；
- 页面内可用的按钮、表单、标签切换、返回和底部导航；
- 亮色、暗色和跟随系统三种外观；
- 加载、失败、空数据、正常数据等可切换状态；
- 涉及登录、分享、导出、删除等微信能力时，使用明确标注的浏览器模拟行为；
- 右侧或顶部的 Preview 控制栏，可切换页面、场景、主题及屏幕尺寸；
- 浏览器刷新后仍可恢复当前演示状态；
- 不启动后端也能完整审阅全部界面。

Web Preview 的视觉和产品语义以现有小程序为准。不要借此重新设计产品，不要编造新的指标、接口或业务能力。

## 2. 现有权威来源

实现前必须阅读下列文件，发生冲突时按此顺序判断：

1. 页面实际结构与行为：`apps/miniapp/miniprogram/pages/**`
2. 全局视觉样式：`apps/miniapp/miniprogram/app.wxss`
3. 公共组件：`apps/miniapp/miniprogram/components/**`
4. 页面生命周期与行为约束：`apps/miniapp/miniprogram/services/page.js`
5. 展示格式化规则：`apps/miniapp/miniprogram/services/presenter.js`
6. 页面和底部导航清单：`apps/miniapp/miniprogram/app.json`
7. 设计变量：`docs/ui-design/musicmirror-v1/tokens.json`
8. 视觉设计说明：`docs/ui-design/musicmirror-v1/README.md`
9. API 与产品语义：`docs/api-contract.md`、`docs/product-spec.md`
10. 隐私边界：`docs/privacy.md`

`docs/ui-design/musicmirror-v1/index.html` 只是静态设计稿索引。不要修改它，也不要将它误认为 Web Preview。

## 3. 明确边界

### 3.1 必须实现

- 复刻 17 个现有页面及三个公共组件。
- 模拟主要点击路径，并能从欢迎页走到报告、历史、设置等页面。
- 每个有数据请求的页面至少支持 `loading`、`error`、`empty`、`ready` 四类场景；不适用的场景可在场景注册表中明确省略。
- 所有演示数据必须标注为“演示账号”或“合成数据”。
- 所有数字都来自固定 fixture，不允许使用 `Math.random()`。
- 移动端画布内的内容、滚动和安全区表现应接近微信开发者工具。
- 桌面控制栏不能混入手机截图或被误认为产品 UI。
- 关键交互具有自动测试。

### 3.2 暂不实现

- 真实微信登录、`wx.login` 或真实二维码轮询；
- 真实网易云账号、Cookie、token 或私人导出数据；
- 真实图片保存、文件分享、系统相册授权；
- 生产部署、SEO、服务端渲染和多用户系统；
- 将小程序迁移到 Taro、uni-app 或其他跨端框架；
- 自动把 WXML 转换成 HTML 的复杂编译器；
- 修改现有小程序行为来迁就 Web Preview；
- 增加现有产品没有的审美指标或页面。

### 3.3 可选的后续能力

只有在离线 Preview 验收通过后，才能考虑增加“连接本地 API”模式。真实 API 模式必须默认为关闭，并与 fixture 模式明显区分。本指导的首轮建设不包含该能力。

## 4. 技术选择

固定使用以下组合，执行 Agent 不要自行替换技术栈：

- Vite
- React
- TypeScript
- 原生 CSS
- Vitest + Testing Library
- hash 路由（自行实现一个很小的路由层，不安装 React Router）
- React Context + `useReducer`（不安装 Redux、Zustand 等状态库）

选择 hash 路由是为了让 Preview 可由静态服务器直接打开，刷新时不要求服务器配置 fallback。

不要引入 UI 组件库、CSS-in-JS、Tailwind、图表库或图标库。当前小程序里的柱图、棱镜和统计值都可以用 HTML/CSS/SVG 完成。

## 5. 目标目录

严格采用以下结构。若文件确实不需要，可以省略叶子文件，但不要发明平行架构。

```text
apps/web-preview/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── app.css
    ├── types.ts
    ├── components/
    │   ├── AppHeader.tsx
    │   ├── AppState.tsx
    │   ├── Chart.tsx
    │   ├── BottomTabs.tsx
    │   ├── ConfirmDialog.tsx
    │   ├── Toast.tsx
    │   ├── PhoneFrame.tsx
    │   └── PreviewControls.tsx
    ├── pages/
    │   ├── WelcomePage.tsx
    │   ├── HomePage.tsx
    │   ├── ExplorePage.tsx
    │   ├── StructurePage.tsx
    │   ├── PreferencesPage.tsx
    │   ├── HistoryPage.tsx
    │   ├── AccountPage.tsx
    │   ├── LoginPage.tsx
    │   ├── InputsPage.tsx
    │   ├── RunPage.tsx
    │   ├── CardPage.tsx
    │   ├── EvidencePage.tsx
    │   ├── ComparePage.tsx
    │   ├── TrendsPage.tsx
    │   ├── PrivacyPage.tsx
    │   ├── SharePage.tsx
    │   └── ExportPage.tsx
    ├── preview/
    │   ├── PreviewProvider.tsx
    │   ├── reducer.ts
    │   ├── routes.ts
    │   ├── scenarios.ts
    │   ├── simulator.ts
    │   └── storage.ts
    ├── fixtures/
    │   ├── account.ts
    │   ├── snapshot.ts
    │   ├── history.ts
    │   └── index.ts
    ├── shared/
    │   ├── formatters.ts
    │   ├── presenter.ts
    │   └── tokens.ts
    └── tests/
        ├── navigation.test.tsx
        ├── scenarios.test.tsx
        ├── account-actions.test.tsx
        └── presenter-parity.test.ts
```

## 6. 根目录改动

将 `apps/web-preview` 加入根 `package.json` 的 workspaces。新增脚本：

```json
{
  "scripts": {
    "dev:web": "npm run dev --workspace @musicmirror/web-preview",
    "build:web": "npm run build --workspace @musicmirror/web-preview",
    "test:web": "npm run test --workspace @musicmirror/web-preview"
  }
}
```

`apps/web-preview/package.json` 的包名固定为 `@musicmirror/web-preview`。不要改变根项目的 `dev`、`build`、`test`、`check` 现有含义，除非在最后一个独立阶段明确将 Web 检查追加到 `check`，并已经确认不会破坏原有测试。

首轮建议锁定当前安装时得到的稳定版本，不要主动升级仓库已有依赖。

## 7. 视觉实现规则

### 7.1 单位换算

小程序设计基准宽度为 750rpx，设计稿和手机预览宽度为 390px。因此：

```text
1rpx ≈ 0.52px（在 390px 预览宽度下）
```

转换时优先使用设计 token 中已经给出的像素值。例如：

- 页面水平边距：24px；
- 卡片圆角：24px；
- 主按钮高度：50px；
- 页面标题：约 25px；
- 正文：16px；
- 次要文字：13px；
- 最小点击区域：44px。

不要机械地把所有 rpx 字面量复制成 px。先使用 `tokens.json`，缺失时再按比例换算。

### 7.2 CSS 变量

在 `app.css` 中建立语义变量，至少包括：

```css
--mm-bg
--mm-bg-end
--mm-surface
--mm-ink
--mm-muted
--mm-stroke
--mm-accent
--mm-cyan
--mm-danger
--mm-radius-card
--mm-radius-button
--mm-safe-bottom
```

亮暗主题的色值从 `tokens.json` 取得，不得产生第三套自定义色板。长期行为始终是紫色语义，主动红心始终是青色语义；颜色必须同时配文字，不能作为唯一信息来源。

### 7.3 画布和滚动

- 桌面端将手机画布固定为 390 × 844；内容在画布内部滚动。
- 小屏浏览器允许画布缩放到视口宽度，但内部设计坐标仍按 390px 计算。
- 顶部模拟状态栏和微信胶囊占位，但不要伪造真实系统信息。
- 主导航页面显示底部四项导航；二级页面隐藏底部导航并显示返回按钮。
- 底部操作不得被安全区遮挡。
- `prefers-reduced-motion: reduce` 时关闭位移和装饰动画。

### 7.4 图表

只实现现有三种基础展示：

- `prism`：CSS 棱镜和轨道装饰；
- `stat`：大数值和说明；
- `bars`：名称、比例条和显示值。

比例条宽度必须裁剪到 0–100%。未知值显示“—”及原因，不显示为 0。不得用装饰图形暗示不存在的精确量。

## 8. 页面与路由清单

路由字符串与小程序路径保持一一对应，但使用 hash：

| 小程序页面 | Web hash | 是否主导航 | 核心交互 |
| --- | --- | --- | --- |
| welcome | `#/welcome` | 否 | 查看授权说明、进入登录、使用演示账号 |
| home | `#/home` | 是 | 空态、报告总览、跳转分析与卡片 |
| explore | `#/explore` | 是 | 12卡/长期/红心切换、维度切换 |
| structure | `#/structure` | 否 | 长期结构维度切换 |
| preferences | `#/preferences` | 否 | 红心结构与歌曲状态 |
| history | `#/history` | 是 | 选择两份报告、比较、加载更多 |
| account | `#/account` | 是 | 主题、解绑、退出、删除 |
| login | `#/login` | 否 | 模拟二维码状态、取消、过期重试 |
| inputs | `#/inputs` | 否 | 添加、去重、删除、保存歌曲 ID |
| run | `#/run` | 否 | queued/processing/completed/failed/cancelled |
| card | `#/card?id=center&snapshotId=...` | 否 | base/enhanced 切换、查看证据 |
| evidence | `#/evidence?...` | 否 | 明细分页、来源、分享、导出 |
| compare | `#/compare?from=...&to=...` | 否 | 可比与不可比状态 |
| trends | `#/trends` | 否 | 30天/90天/全部、少于三点降级 |
| privacy | `#/privacy` | 否 | 只读说明与危险操作入口 |
| share | `#/share?snapshotId=...` | 否 | 字段勾选、生成模拟预览、下载模拟 |
| export | `#/export?snapshotId=...` | 否 | JSON/input1/input2、模拟下载与删除 |

默认入口为 `#/welcome`。已经存在模拟会话时，允许 Preview 控制器直接跳到任意页面，但产品内部跳转仍应遵守正常流程。

## 9. Preview 状态模型

在 `types.ts` 中定义明确类型，不允许大面积使用 `any`：

```ts
type ThemeChoice = 'system' | 'light' | 'dark';
type ResolvedTheme = 'light' | 'dark';
type PageStatus = 'loading' | 'error' | 'empty' | 'ready';
type RunStatus = 'idle' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
type QrStatus = 'idle' | 'waiting' | 'scanned' | 'expired' | 'authenticated' | 'cancelled';

interface PreviewState {
  route: string;
  themeChoice: ThemeChoice;
  pageStatus: PageStatus;
  scenarioId: string;
  authenticated: boolean;
  bound: boolean;
  accountMode: 'mock';
  runStatus: RunStatus;
  qrStatus: QrStatus;
  selectedFavorites: string[];
  selectedHistory: string[];
  toast: string | null;
  dialog: PreviewDialog | null;
}
```

所有状态变化通过 reducer action 完成。局部的标签选择、输入框文本等纯页面状态可以使用组件内 `useState`，但账号、主题、当前场景、报告、任务状态和导航状态必须集中管理。

## 10. 模拟器设计

`simulator.ts` 提供 Promise 风格操作，模拟真实异步行为：

```ts
interface PreviewSimulator {
  demoLogin(): Promise<void>;
  createQr(): Promise<void>;
  advanceQr(): Promise<void>;
  saveInputs(ids: string[]): Promise<void>;
  startRun(): Promise<void>;
  unbind(): Promise<void>;
  logout(): Promise<void>;
  deleteData(): Promise<void>;
  generatePoster(): Promise<string>;
  exportFile(format: 'json' | 'input1' | 'input2'): Promise<PreviewFile>;
}
```

规则：

- 模拟延迟固定为较短值，例如 250ms；测试中使用 fake timers。
- Preview 控制栏可将下一次操作设为失败。
- 失败必须进入与小程序类似的错误展示，并允许重试。
- 登录二维码不可真实扫描，二维码区域必须标注“演示二维码，不可扫描”。
- “保存图片”在浏览器中生成 fixture 预览或触发本地测试文件下载，但提示它是模拟行为。
- “分享”只打开预览或显示 toast，不调用系统分享联系人。
- “导出”只能导出演示 fixture，文件内容不得包含 token、Cookie、账号 ID。
- 删除演示数据前仍需确认；确认后清理 localStorage 并回到欢迎页。
- 解绑保留历史报告；退出仅清除会话；删除清除全部 Preview 状态。这三个动作不能混用。

## 11. 场景注册表

`scenarios.ts` 使用声明式对象，不要将测试场景散落在页面组件中。至少提供：

| 场景 ID | 说明 |
| --- | --- |
| `first-visit` | 未登录首次访问 |
| `qr-waiting` | 二维码等待扫码 |
| `qr-scanned` | 已扫码等待确认 |
| `qr-expired` | 二维码过期 |
| `home-empty` | 已登录但没有报告 |
| `report-ready` | 有完整 base 报告 |
| `enhanced-unavailable` | 增强资料不足 |
| `favorites-empty` | 红心输入为空 |
| `run-processing` | 分析进行中 |
| `run-failed` | 分析失败，可重试 |
| `history-empty` | 没有历史报告 |
| `history-three-points` | 三次可比报告，可看趋势 |
| `compare-incompatible` | 两份报告口径不同 |
| `partial-coverage` | 部分维度缺失 |
| `dark-report` | 深色主题报告 |

每个场景必须完整重置状态，不能依赖前一个场景残留。场景切换后 URL 和 localStorage 状态应同步。

## 12. Fixture 规则

- 优先从现有测试 fixture 的公开、合成数据结构构造展示数据。
- 不读取 `.data/`，不复制真实账号导出，不提交昵称、账号 ID、Cookie 或 token。
- 固定使用容易识别的合成歌名、歌手名和时间。
- 至少包含 12 张审美卡片、两类输入、三份历史快照和一个不可比快照。
- 同一 ID 在快照、历史、比较、趋势和证据页中必须一致。
- 百分比使用 0–1 数值，在 presenter 层格式化；不要在 fixture 中预先写成字符串。
- 必须同时有真实 `0`、`null/unknown`、`partial`、`unavailable` 样例。
- fixture 顶层加注释，声明全部为合成数据。

## 13. Presenter 与格式化

Web 不要直接导入小程序的 CommonJS 文件，也不要让小程序反向依赖 Vite 源码。首轮在 Web 内实现类型安全的等价 presenter，并用测试保持关键行为一致。

必须覆盖的等价行为：

- `pct(null)` 返回 `—`；
- `pct(0)` 返回 `0.0%`；
- 非法日期返回 `未知`；
- bars 最多显示 10 行，宽度限制为 0–100；
- unknown 与真实 0 不混淆；
- `overview` 只展示前三条洞察；
- card 的 base/enhanced 状态、coverage、method、limitations 和 requiredData 不丢失；
- 日期显示结果在固定时区测试中稳定。

若未来需要真正共享 presenter，应单独规划迁移到 `packages/ui-shared`，并保持小程序可构建；不要在本任务中顺手做大规模重构。

## 14. 公共组件契约

### `AppHeader`

- 接收 `title`、`back` 和 `onBack`；
- 主导航页不显示返回按钮；
- 返回时优先使用预览历史栈，无历史则回到对应主页面；
- 保留状态栏与胶囊的视觉占位。

### `AppState`

- `loading` 显示加载提示并设置 `aria-busy=true`；
- `error` 显示错误消息和“重试”；
- `empty` 的业务文案由页面提供；
- 不要让 loading 和 ready 内容同时可交互。

### `Chart`

- 接收 `kind`、`value`、`caption`、`rows`；
- 柱图包含可读文本，不能只靠宽度传达信息；
- 对空 rows 显示“暂无可确认的数据”。

### `BottomTabs`

- 固定四项：镜像、探索、变化、我的；
- 分别跳转 `home`、`explore`、`history`、`account`；
- 当前项有文字和样式双重选中提示；
- 不在二级页面显示。

### `ConfirmDialog`

- 使用真正的 dialog 语义或可访问的等价实现；
- 支持 Escape 取消和焦点回收；
- 危险操作按钮必须使用危险色并写清影响；
- 自动化测试不得依赖浏览器原生 `window.confirm`。

### `PreviewControls`

- 位于手机画布之外；
- 可切换页面、场景、主题、390 × 844/较窄/较宽视口；
- 提供“重置演示”按钮；
- 提供“下一次操作失败”开关；
- 生产手机 UI 中不得引用这个控制器。

## 15. 关键产品规则

实现过程中必须遵守：

1. 长期 Top100 是播放次数加权；选定红心最多 50 首并按歌曲等权。
2. 红心时间未知时写“红心时间范围未知”，不能写“最近一周”。
3. 最近播放不能冒充红心输入。
4. 覆盖率是数据充分程度，不是结论正确概率。
5. unknown 显示“—”和原因；真实零显示 `0`。
6. 历史快照不可变；刷新不覆盖旧快照。
7. 两次可比报告才能比较；至少三次同口径报告才描述趋势。
8. 退出、解绑、删除是三个不同动作。
9. 分享默认不选昵称和歌曲名单。
10. 导出不包含 Cookie、token、用户账号 ID。
11. 增强分析资料不足时列出所需资料，不显示伪造图表。
12. 所有 Preview 数字和身份明确标注为合成演示。

## 16. 分阶段执行计划

每一阶段独立提交或至少独立检查。低级 Agent 一次只执行一个阶段，不要一次性生成全部 17 页。

### 阶段 0：只读核对

任务：

- 阅读第 2 节列出的权威文件；
- 列出 17 页面、三个公共组件和四个主导航；
- 确认工作区是否已有未提交改动；
- 不修改任何文件。

完成条件：输出核对结果，没有代码变更。

### 阶段 1：脚手架和空壳

任务：

- 创建 `apps/web-preview`；
- 配置 Vite、React、TypeScript 和测试；
- 修改根 workspace 和脚本；
- 创建 PhoneFrame、PreviewControls 和空路由页面；
- 保证 17 个 hash 路由均能显示正确页面名。

完成条件：

```powershell
npm run build:web
npm run test:web
```

均通过，且没有修改 `apps/miniapp`。

### 阶段 2：设计系统和公共组件

任务：

- 从 token 建立主题 CSS 变量；
- 移植 `app.wxss` 的通用语义类；
- 完成 Header、State、Chart、BottomTabs、Dialog、Toast；
- 支持亮/暗/系统和 reduced motion；
- 为公共组件写测试。

完成条件：组件展厅或临时页面能展示所有组件状态；键盘可以操作按钮、标签和对话框。

### 阶段 3：Preview 状态、路由和模拟器

任务：

- 实现 reducer、hash 路由、history stack、storage；
- 实现声明式场景注册表；
- 实现确定性 fixture 和异步模拟器；
- 完成“首次访问 → 演示登录 → 首页”的路径。

完成条件：刷新后恢复主题和当前场景；重置后回到首次访问；失败开关只影响下一次模拟操作。

### 阶段 4：三个代表页面

按顺序实现：

1. `HomePage`：覆盖 empty/loading/error/ready；
2. `CardPage`：覆盖 base/enhanced/unavailable/证据跳转；
3. `InputsPage`：覆盖输入、去重、删除、最多 50 首、保存和失败。

视觉对照同名 WXML/WXSS，不参考记忆手写。

完成条件：三页主要交互测试通过；390px 截图与小程序结构无明显遗漏。

### 阶段 5：核心浏览路径

实现：`welcome`、`login`、`run`、`explore`、`structure`、`preferences`。

完成条件：可以完整走通：

```text
欢迎 → 演示登录/二维码模拟 → 配置输入 → 分析 → 首页 → 探索 → 卡片 → 证据
```

### 阶段 6：历史和证据路径

实现：`history`、`compare`、`trends`、`evidence`。

完成条件：覆盖零份、一份、两份、三份历史，以及可比/不可比、趋势可用/不可用。

### 阶段 7：账户与输出路径

实现：`account`、`privacy`、`share`、`export`。

完成条件：主题即时切换；解绑/退出/删除的确认文案和结果不同；导出文件仅含 fixture 安全字段。

### 阶段 8：整体验收

任务：

- 删除临时占位内容和无用代码；
- 运行全部 Web 与仓库现有检查；
- 手工检查 17 页 × 亮暗主题；
- 检查 320px、390px、430px 三种宽度；
- 检查键盘导航和 reduced motion；
- 在 `docs/README.md` 和根 README 增加 Preview 入口；
- 在 `docs/progress.md` 追加实际完成记录，不改写旧记录。

完成条件：第 18 节所有命令通过，且交付说明列出仍未实现的边界。

## 17. 每个 Agent 的固定工作模板

给执行 Agent 的任务必须包含以下内容：

```text
你只执行《docs/web-preview-implementation-guide.md》的阶段 N。
先完整阅读该阶段以及第 2、3、15、18、19 节。
开始前运行 git status --short，保留所有已有改动。
只修改该阶段允许的文件，不重构 apps/miniapp，不读取 .data。
实现后运行该阶段的验证命令。
最后报告：修改文件、实现内容、测试结果、未完成项。
如果现有代码与指导冲突，停止扩大范围，记录冲突，不自行改产品规则。
```

若一个阶段工作量仍过大，应按“一个公共组件”或“一个页面族”继续拆分，不要让多个 Agent 同时编辑同一文件。尤其避免同时编辑：

- 根 `package.json`；
- `App.tsx`；
- `app.css`；
- `PreviewProvider.tsx`；
- `fixtures/snapshot.ts`。

## 18. 验证命令

每个阶段至少运行与改动相关的命令。最终验收运行：

```powershell
npm run typecheck
npm test
npm run build
npm run test:web
npm run build:web
```

如果最终将 Web 检查合并进根 `check`，再运行：

```powershell
npm run check
```

不要因为本机没有微信开发者工具而跳过所有验证。Web Preview 自身的构建与测试不应依赖微信开发者工具。

建议另加以下静态检查：

- fixture 中不存在 `cookie`、`token`、真实用户 ID；
- 17 个路由全部注册；
- 4 个主导航与 `app.json` 一致；
- 12 张卡片 ID 唯一；
- 所有按钮具有可读名称；
- 图片具有 alt，纯装饰图标使用空 alt 或隐藏语义；
- `npm run build:web` 后没有 TypeScript 错误。

## 19. 禁止事项

执行 Agent 不得：

- 读取、展示、复制或提交 `.data/` 中的任何内容；
- 调用真实网易云服务或生成真实二维码；
- 修改算法、API 数据口径或隐私规则；
- 删除现有测试来使检查通过；
- 使用 `any` 绕过大面积类型问题；
- 将 WXML/WXSS 文件直接改名为 HTML/CSS 后声称完成；
- 使用随机数据导致截图和测试不稳定；
- 将 loading/error/empty 只做成控制栏文字而不体现在手机画布；
- 在演示 UI 中声称真实登录、真实保存或真实分享成功；
- 把 Preview 控制栏放进小程序产品界面；
- 顺手重构后端、小程序或算法；
- 用新设计覆盖当前已有视觉和文案；
- 在没有测试的情况下实现危险操作。

## 20. 最终验收清单

### 工程

- [ ] `apps/web-preview` 是根 workspace。
- [ ] `npm run dev:web` 可启动。
- [ ] `npm run build:web` 可构建。
- [ ] `npm run test:web` 全部通过。
- [ ] 原有小程序和后端检查没有回归。

### 页面

- [ ] 17 个页面全部可从控制栏访问。
- [ ] 产品内正常导航路径可走通。
- [ ] 四个主导航页面显示 BottomTabs。
- [ ] 二级页面显示返回按钮且不显示 BottomTabs。
- [ ] 页面刷新不会进入空白页。

### 状态

- [ ] loading、error、empty、ready 可审阅。
- [ ] 二维码 waiting/scanned/expired/authenticated/cancelled 可审阅。
- [ ] 分析 queued/processing/completed/failed/cancelled 可审阅。
- [ ] 增强不可用、部分覆盖、未知值和真实零均有样例。
- [ ] 历史少于三次时不展示伪趋势。

### 视觉与可用性

- [ ] 亮暗主题与小程序色彩语义一致。
- [ ] 390 × 844 下主要布局与小程序一致。
- [ ] 320–430px 宽度下无水平溢出。
- [ ] 长文、错误信息和大字号不会被截断。
- [ ] 键盘可完成导航、表单、标签和弹窗操作。
- [ ] reduced motion 生效。

### 安全与语义

- [ ] 所有数据明确标注为演示或合成。
- [ ] 没有真实凭证、身份或私人导出数据。
- [ ] 退出、解绑、删除语义不同。
- [ ] 分享与导出默认保护昵称和歌曲名单。
- [ ] unknown、0、partial、unavailable 没有混淆。

## 21. 完成定义

只有同时满足以下条件，才能宣称 Web Preview 完成：

1. 17 个页面均存在且可访问；
2. 核心用户路径可交互，而不是静态截图集合；
3. 主要异步状态和错误状态可由控制栏稳定复现；
4. 小程序专属能力具有清晰、安全的模拟反馈；
5. 所有数据为确定性的合成 fixture；
6. 自动测试和生产构建通过；
7. 未破坏现有小程序、后端、算法与隐私边界；
8. 文档说明如何启动、如何切换场景，以及哪些能力仍是模拟。

完成后，这个项目应当成为“浏览器里的可交互产品样机和视觉回归基线”，而不是第二个悄悄分叉的 MusicMirror 产品。
