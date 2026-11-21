# 分步交互式导入与配置指南（Import Guide）

> **更推荐的交互式配置方式**：
> 1. **图形化浏览器向导（零依赖、可离线直开）**：下载仓库后直接双击打开 [docs/setup-guide.html](./setup-guide.html)（勾选进度自动保存、一键生成专属工作流 JSON 与测试命令）。
> 2. **终端交互向导（Node.js 18+）**：在仓库根目录运行 `node scripts/setup-wizard.mjs`，按问答自动生成 `workflows/my-webhook-to-bark.json`。

如果你更习惯在 GitHub 页面上一步步对照手动配置，请依次完成以下 6 个检查项：

---

## Step 1：检查部署前提与 Docker 环境变量

- [ ] 已部署 **n8n**（建议 `>= 1.60.0`）
- [ ] iOS 设备已安装 **Bark**，并获取了你的 **Device Key**（官方 `https://api.day.app/<Key>` 或自建 Bark 服务）
- [ ] 在 n8n 的 `docker-compose.yml` / `.env` 中配置了以下环境变量并重启容器：

```yaml
environment:
  - TZ=Asia/Shanghai
  # 允许 Code 节点使用内置 fs 模块，用于「剧集多集入库文件队列聚合」与可选日志落盘
  # 注：若不开启，入库通知会自动降级为逐条直发，不会丢失消息
  - NODE_FUNCTION_ALLOW_BUILTIN=fs
```

---

## Step 2：导入工作流模板到 n8n

- [ ] 打开 n8n 网页控制台，点击 **Add Workflow** 新建空白工作流
- [ ] 点击画布右上角菜单 **`⋯`** → **`Import from File...`**
- [ ] 选择仓库中的 [workflows/webhook-to-bark.json](../workflows/webhook-to-bark.json)（如果你用向导生成了专属版，则选 `workflows/my-webhook-to-bark.json`）

---

## Step 3：完成 2 项必改配置（与可选图标/链接）

<details open>
<summary><b>必改 1：配置「发送到 Bark」节点的推送地址与 Device Key</b></summary>

1. 双击画布最右侧的 **`发送到 Bark`**（HTTP Request）节点；
2. 将 **URL** 从模板占位符 `https://api.day.app/YOUR_BARK_DEVICE_KEY` 改为你的真实地址：
   - 官方服务器：`https://api.day.app/你的DeviceKey`
   - 自建 Bark：`https://你的Bark域名/你的DeviceKey`
3. 保持 Method 为 `POST`，Body 为 JSON `={{ JSON.stringify($json.bark) }}`，点击保存。

</details>

<details>
<summary><b>必改 2（公网强烈建议）：为 Webhook 节点添加身份认证</b></summary>

1. 双击最左侧的 **`Webhook - /renotify`** 节点；
2. 如需修改入口路径，可调整 **Path**（默认 `renotify`，完整地址为 `https://<你的n8n>/webhook/renotify`）；
3. 建议将 **Authentication** 设为 **Basic Auth** 或 **Header Auth**（如 `X-API-KEY`），防止公网被恶意刷推送。

</details>

<details>
<summary><b>可选：自定义图标 URL、MoviePilot/Jellyfin 跳转链接与聚合参数</b></summary>

所有外部 URL 与核心参数均已集中提取到各 Code 节点的最顶部，带清晰中文注释：

| 节点名称 | 顶部可配置变量 | 说明 |
| :--- | :--- | :--- |
| `准备请求` | `LOG_PATH` / `LOG_MAX_BYTES` | 原始日志落盘路径（默认 `""` 关闭，开启如 `/home/node/.n8n/reNotify_log.txt`） |
| `通知去重` | `DEDUPE_WINDOW_SECONDS` | 相同内容去重窗口，默认 `120` 秒（设为 `0` 关闭） |
| `刷出入库缓冲` | `TRANSFER_IDLE_SECONDS` / `TRANSFER_MAX_WAIT_SECONDS` | 剧集多集入库静默合并窗口（默认 `20` 秒）与最长兜底等待（默认 `120` 秒） |
| `解析 - MoviePilot` | `MP_BASE_URL` / `JELLYFIN_*` / `MP_DEFAULT_ICON` / `SITE_ICONS` | MoviePilot 与 Jellyfin 跳转地址、兜底图标与站点图标映射 |
| `解析 - Grafana` | `GRAFANA_DEFAULT_ICON` / `GRAFANA_SYSTEM_ICONS` | Grafana 默认图标及按文件夹/告警名关键词匹配的不同系统 Logo |
| `解析 - RSS` | `KEYLOL_ICON` / `PT_CHANNEL_ICON` / `LIVE_STREAM_ICON` / `SPOTIFY_ARTIST_ICONS` | RSS 细分来源图标 |
| `解析 - Wallos` / `Diun` / `Zerobyte` | `WALLOS_ICON` / `DIUN_DOCKER_ICON` / `ZEROBYTE_ICON` | 各应用通知图标（Wallos/Diun 已默认配好公共 `selfh.st` 图标） |

</details>

---

## Step 4：激活工作流

- [ ] 点击 n8n 画布右上角 **Active** 开关，使其变为绿色激活状态。
- [ ] 注意区分两个入口：
  - **正式入口**：`https://<你的n8n>/webhook/renotify`（激活后长期生效，填到各个上游应用里）
  - **测试入口**：`https://<你的n8n>/webhook-test/renotify`（仅在画布点一次 *Test / Execute workflow* 后短时间有效）

---

## Step 5：接入上游应用（按需配置）

<details>
<summary><b>查看 7 类应用的 Webhook 配置要点</b></summary>

| 上游应用 | 配置路径与要点 |
| :--- | :--- |
| **MoviePilot** | 设定 → 通知 → 新增 **Webhook** 渠道：URL 填 `https://<你的n8n>/webhook/renotify`，方法 `POST`，格式 `JSON`，按需勾选事件类型。 |
| **Miniflux (RSS)** | Settings → Integrations → **Webhook**：填入 URL，勾选 `new_entries`（以及用于测试的 `save_entry`）。 |
| **Grafana** | Alerting → Contact points → 新增 **Webhook**：URL 填入口地址，HTTP Method 选 `POST`。 |
| **Dockhand** | Settings → Notifications → Webhook：指向入口 URL，接收容器/Stack/镜像更新与清理事件。 |
| **Wallos** | Settings → Notifications → Webhook：配置 POST JSON，指向入口 URL。 |
| **Diun** | `DIUN_NOTIF_WEBHOOK_ENDPOINT=https://<你的n8n>/webhook/renotify`、`DIUN_NOTIF_WEBHOOK_METHOD=POST`。 |
| **Zerobyte** | 通知配置中选择 Webhook POST JSON，字段含 `zerobyte_title` 与 `zerobyte_message`。 |

</details>

---

## Step 6：发送脱敏测试包验收

- [ ] **方式 A（Linux / macOS / Git Bash：`curl` 冒烟测试）**：

```bash
curl -X POST "https://<你的n8n>/webhook/renotify" \
  -H "Content-Type: application/json" \
  -d '{"zerobyte_title":"连通性测试","zerobyte_message":"如果你在手机 Bark 收到这条消息，说明工作流已部署成功！","__test":true}'
```

- [ ] **方式 B（Windows PowerShell 冒烟测试）**：

```powershell
Invoke-RestMethod -Method Post `
  -Uri "https://<你的n8n>/webhook/renotify" `
  -ContentType "application/json" `
  -Body '{"zerobyte_title":"连通性测试","zerobyte_message":"如果你在手机 Bark 收到这条消息，说明工作流已部署成功！","__test":true}'
```

手机端若收到带 `【🧪测试】` 前缀的通知（且 Miniflux 对任意文章点「保存」也能触发测试推送），即表示工作流已部署验证通过！
