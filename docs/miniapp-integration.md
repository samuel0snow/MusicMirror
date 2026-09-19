# 微信原生 GUI 接入

当前已实现 `apps/miniapp/miniprogram/services/client.js` 和 `controllers/actions.js`，尚未实现视觉页面。[独立UI设计与全流程图片](ui-design/README.md)可作为后续页面实现参考。调用层使用CommonJS和微信wx.request，不依赖Node、浏览器fetch或根目录外的TS源码。

未来页面脚本可按以下方式接入（示例，不是已创建的GUI）：

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

按需要为每个动作添加同名转发方法后，将未来按钮bindtap设为该方法。不要动态改写Page注册机制。页面通过setData获取busy/error/report等状态，错误由处理器记录并返回null；底层client方法则抛出带code/statusCode的错误。

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

GUI阶段再添加app入口、页面WXML/WXSS/JSON和project.config.json（miniprogramRoot指向miniprogram/）。开发者工具本地联调需按其设置允许本机请求；真机把baseUrl改成可达的服务地址。正式环境使用HTTPS与微信合法请求域名，不携带网易云Cookie调用报告接口。

二维码key/create/check已接通，卸载处理器取消未完成的扫码。当前可使用本机诊断页完成首次测试，正式微信页面的图片展示与轮询生命周期仍需GUI阶段接入。
