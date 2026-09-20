# 微信原生 GUI 接入

当前已实现原生视觉页面（`apps/miniapp/miniprogram/pages`）、应用内组件（`components`）、调用层（`services/client.js`）和按钮处理器（`controllers/actions.js`），按[独立UI设计与全流程图片](ui-design/README.md)的页面与状态落地。调用层使用CommonJS和微信wx.request，不依赖Node、浏览器fetch或根目录外的TS源码。

以下示例说明 `controllers/actions.js` 这一按钮处理器层的用法，保留用于测试与兼容；已创建的页面统一使用 `services/page.js` 的 `createPage`。

```js
const { createClient } = require('../../services/client');
const { createActions, initialState } = require('../../controllers/actions');
Page({
  data: initialState(),
  onLoad() {
    this.actions = createActions(this, createClient({ wx, baseUrl: 'http://127.0.0.1:3000' }));
  },
  onRefreshAnalysis() { return this.actions.onRefreshAnalysis(); },
  onLoadLongTerm() { return this.actions.onLoadLongTerm(); },
  onLoadRecentFavorites() { return this.actions.onLoadRecentFavorites(); },
  onUnload() { this.actions.onUnload(); }
});
```

按需要为每个动作添加同名转发方法后，将按钮bindtap设为该方法。不要动态改写Page注册机制。页面通过setData获取busy/error/report等状态，错误由处理器记录并返回null；底层client方法则抛出带code/statusCode的错误。

| 处理器 | 参数 / 状态 |
| --- | --- |
| onDemoLogin / onLoadAccount | 无；account、bound |
| onCreateLoginQr | 无；loginQr.image、expiresAt、pollIntervalMs、status |
| onCheckLoginQr | 按pollIntervalMs调用；成功自动保存自有token并更新account；pollToken不进入页面data |
| onBindAccount | 备用入口event.detail.cookie；常规登录优先二维码 |
| onLoadFavoriteInput | 无；favoriteItems |
| onSaveRecentFavorites | event.detail.items或page.data.favoriteItems；数组项songId、可选likedAt |
| onRefreshAnalysis / onResumeAnalysis | 刷新保存runId、轮询状态、获取report；恢复读取已有runId |
| onLoadOverview / onLoadLongTerm / onLoadRecentFavorites | 总览及两个独立模块 |
| onLoadStructure / onLoadPreferences | 结构与偏好视图 |
| onOpenCard | dataset.cardId（12类审美卡片ID之一） |
| onLoadHistory | dataset.limit、dataset.offset，可省略 |
| onOpenSnapshot | dataset.snapshotId |
| onCompareSnapshots | dataset.from、dataset.to |
| onLoadTrends | dataset.days=30/90/all |
| onUnbindAccount / onDeleteData / onLogout | GUI根据产品流程触发；删除清理页面状态和token |
| onUnload | 停止页面轮询写回，不取消后端任务，可稍后查询 |

收藏编辑只更新输入，不改历史报告；之后点击刷新生成新快照。报告需按basis注明权重、显示sampleSize和warnings；value=null显示reason。

app入口、页面WXML/WXSS/JSON与project.config.json已实现（`miniprogramRoot`指向`miniprogram/`）。开发者工具本地联调需按其设置允许本机请求；真机把baseUrl改成可达的服务地址。正式环境使用HTTPS与微信合法请求域名，不携带网易云Cookie调用报告接口。

本地地址由`miniprogram/config.js`集中管理，默认`http://127.0.0.1:3000`。临时切换真机或隧道地址时可在开发者工具控制台执行`wx.setStorageSync('musicmirror.apiBaseUrl', 'https://你的地址')`并重启小程序，不需要修改提交到仓库的配置；恢复默认值使用`wx.removeStorageSync('musicmirror.apiBaseUrl')`。完整步骤及云开发适配边界见[本地 API 与云开发迁移](local-api-and-cloud-migration.md)。

二维码key/create/check已接通，登录页展示二维码并按pollIntervalMs轮询，离开页面时取消未完成的扫码。可用本机诊断页完成首次测试，再在微信开发者工具中做视觉与真机联调。`node scripts/check-miniapp.mjs`会校验页面清单、JavaScript语法并调用wcc/wcsc编译WXML/WXSS。
