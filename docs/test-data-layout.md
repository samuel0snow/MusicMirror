# 真实测试数据目录

此前一次性诊断脚本将核验JSON放在数据根目录，而正式导出脚本写入exports，缺少统一约定。现在按用途整理；数据库、密钥保持原位，文件未删除。

```text
.data/real-test/
├── README.md                         # 本机目录说明
├── musicmirror.sqlite*               # 运行数据库及WAL/SHM
├── encryption.key                    # 数据库相关加密密钥
├── exports/
│   ├── latest.json                   # 最近成功导出的目录、时间与数量
│   └── <snapshotId>/                 # 一条分析快照的导出
│       ├── manifest.json             # 快照时间、采集时间、导出时间与数量
│       ├── modules.json
│       ├── input1.csv
│       ├── input2.csv
│       └── input2-provenance.json     # 某些历史样本附带的选择依据
├── inputs/recent-red-heart/           # 选择列表、来源依据
├── reviews/red-heart-time/            # 顺序及取消/重新点红心核验
├── diagnostics/wiki/                 # 百科临时探测响应
├── diagnostics/scripts/              # 本轮诊断脚本
└── temporary/qr/                     # 临时二维码资料
```

`a3b49eec-25ab-4b20-8be8-b506883cb6f0`是分析快照的UUID。它标识歌曲百科补全后保存的一条分析结果，不是歌单ID、用户ID或日期。该快照冻结了当时的输入1（100首）、输入2（50首）、辅助数据和分析结果。导出读取同一条数据库快照，不因后来取消/重新点红心而自动修改。重复导出同一快照仍写相同目录，manifest的导出时间更新；新快照写新目录。

`collection-time-review.json`是后来实时读取的红心顺序核验，覆盖当时全部309首，与旧快照的100/50首样本不是同一份数据。因此现放到`reviews/red-heart-time/collection-time-review.json`，不塞进历史快照导出目录。Grin取消/重新点红心的观测也放在该目录；它们不能反向改写旧快照。

```powershell
npm run data:organize
npm run export:account
```

整理命令只移动明确列出的历史文件，目标重名时停止，不触碰数据库及密钥；重复执行无新增移动。旧快照缺manifest时补充说明，未知历史导出时间记null，不以文件修改时间冒充。导出命令自动维护目录说明、快照manifest及latest索引。输入来源副本仍属其原快照，不由最新输入覆盖。

这些目录含私人数据，不提交Git；数据库TTL和账户删除不自动清理独立导出/核验文件。旧文档中的根目录诊断文件路径为历史记录，当前以本目录说明为准。
