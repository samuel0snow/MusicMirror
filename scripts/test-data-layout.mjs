import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const reviewFiles = ['collection-time-review.json', 'recollection-investigation.json', 'grin-unlike-observation.json', 'grin-relike-observation.json'];
export const inputFiles = ['input2-selection.json', 'input2-provenance.json'];
export const probeFiles = ['info-probe.json', 'summary-probe.json'];
export const diagnosticScripts = ['configure-input2.ts', 'inspect.ts', 'probe-fields.ts', 'validate.ts'];
export const qrFiles = ['login-qr.png', 'qr-attempt.json'];

export function ensureTestDataLayout(dataDir) {
  for (const dir of ['exports', 'explorations', 'reviews/red-heart-time', 'reviews/song-memory-coverage', 'inputs/recent-red-heart', 'diagnostics/wiki', 'diagnostics/scripts', 'temporary/qr'])
    mkdirSync(join(dataDir, dir), { recursive: true });
  writeFileSync(join(dataDir, 'README.md'), `# 本机真实测试数据

- musicmirror.sqlite / -wal / -shm、encryption.key：运行时数据库与密钥，必须保持位置，不手动拆分。
- exports/<snapshotId>/：某一条已保存分析快照的双输入导出。snapshotId 是 UUID，不是账号、歌单编号或时间。
- exports/latest.json：最后一次成功导出的索引；createdAt 是快照创建时间，exportedAt 是导出时间。
- explorations/<查询时间>/：只读研究的加密投影、结构摘要和完成标记，不是分析快照。
- reviews/red-heart-time/：实时红心时间/顺序核验，可能在快照之后发生，不属于旧快照。
- reviews/song-memory-coverage/<查询时间>/：按导出双模块歌曲去重的听歌记忆覆盖率；summary为聚合，响应投影加密保存。
- inputs/recent-red-heart/：本轮选择列表与选择依据。
- diagnostics/wiki/：临时百科响应探测。
- diagnostics/scripts/：本轮开发诊断脚本，不是产品入口。
- temporary/qr/：临时二维码资料，历史文件不代表当前有效登录。

exports 中的 UUID 目录保留旧快照，避免新核验覆盖历史证据；每个目录的 manifest.json 说明快照、采集与导出时间、数量及文件用途。
这些文件包含私人偏好数据，不提交 Git。导出、核验及探测文件不受数据库 TTL 或账户删除自动管理，需要按需清理。
`);
}
