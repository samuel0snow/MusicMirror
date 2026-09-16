# Enhanced API 接入边界

上游项目：[NeteaseCloudMusicApiEnhanced/api-enhanced](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced)，文档：[官方项目文档](https://docs-neteasecloudmusicapi.focalors.ltd/)。本仓库不复制其源码，不连接不受信任的公开代理服务。

后端通过NETEASE_BASE_URL连接你自行部署的服务；本阶段mock可独立运行，因此无需立即安装上游或Docker。

当前适配：`/login/status`、`/user/record`（type=0长期、type=1周）、`/record/recent/song`、`/likelist`、`/song/detail`。POST body传Cookie，URL附唯一timestamp，避免上游按相同URL缓存时混淆不同请求。用户私有缓存以内部用户ID隔离，歌曲详情50个一批、30天缓存。

校验失败返回UPSTREAM_SCHEMA_CHANGED；401/403/301停止认证重试；临时错误最多额外重试3次，默认1/2/4秒退避。个人来源缺失降级为null及warning，不伪造空喜欢列表。长期和近期均不可用、且无输入2时任务失败；收藏输入已指定时可独立生成收藏模块，长期明确不可用。

真实最近播放按unique来源处理，不能假定为完整播放事件。红心时间/顺序未验证，因此输入2当前使用显式选择；自动近期红心来源留待后续测试。

测试中的账号、Cookie、歌曲和响应均为合成数据。上游公开文档于本次构建中核对过，但没有执行真实账号请求。真实部署版本仍需后续契约验证。
