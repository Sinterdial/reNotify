# 更新日志（Changelog）

本文件记录 `n8n-webhook-bark-notify` 工作流及配套工具的主要变更，遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 规范。

## [1.0.0] - 2026-11-21

### 新增
- **完整多源 Webhook → Bark 转发工作流**（`workflows/webhook-to-bark.json`），采用清晰分层画布布局与 14 个独立可替换节点（`workflows/nodes/`）。
- **7 大类自托管服务原生解析器**：
  - **MoviePilot**：订阅添加/完成（自动补齐季号）/修改（过滤无意义记账字段）/删除、下载开始、单集与多集范围入库聚合（文件队列 + 20 秒静默防抖 + 120 秒兜底必发 + 异常 `.processing` 自动恢复）、刷流插件、站点私信、体育赛事、通用站内通知；影视封面图自动通过 Bark `image` 附图展示。
  - **RSS / Miniflux**：其乐 Keylol（游戏名与关键词提炼 + Steam 头图）、Spotify（艺人/单曲/专辑区分）、PT 风向旗、直播开播、GitHub Releases 与通用 RSS。
  - **Dockhand**：容器/Stack/环境事件、批量镜像可更新清单、镜像清理完成/失败通知，内置 `selfh.st` 图标索引 24 小时缓存。
  - **Grafana**：告警触发（`firing`）与恢复（`resolved`）自动区分，支持按系统/文件夹关键词自定义图标（`GRAFANA_SYSTEM_ICONS`）。
  - **Wallos**：订阅到期提醒（兼容单复数字段）。
  - **Diun / Zerobyte**：Docker 镜像更新与备份任务通知。
- **幂等去重与安全保护**：
  - 120 秒内相同内容自动去重并返回 HTTP 200（`deduped: true`），避免上游重试风暴；
  - 全局内置 APNs 4KB UTF-8 字节安全截断保护；
  - 各解析节点顶部集中暴露图标 URL 与业务网址变量，方便一键维护。
- **交互式导入与配置体系**：
  - 浏览器离线交互式配置向导（`docs/setup-guide.html`）；
  - 零依赖终端交互式向导（`scripts/setup-wizard.mjs`）；
  - GitHub 分步导入文档（`docs/IMPORT_GUIDE.md`）。
