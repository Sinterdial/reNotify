# 安全与隐私说明（Security Policy）

## 部署安全建议

本工作流对外暴露一个 HTTP Webhook 入口（默认 `/webhook/renotify`）。为了防止未授权调用或推送垃圾通知，强烈建议在公网暴露时做好以下防护：

1. **为 Webhook 节点开启认证**：
   在 n8n 的 `Webhook - /renotify` 节点中，将 **Authentication** 设置为 **Basic Auth** 或 **Header Auth**（如 `X-API-KEY`），并在上游应用配置对应凭据。
2. **使用 HTTPS 与反向代理**：
   建议通过 Nginx / Caddy / Traefik 等反向代理为 n8n 和自建 Bark 服务启用 TLS，避免凭据与通知内容明文传输。
3. **保护你的 Bark Device Key 与本地配置**：
   仓库已通过 `.gitignore` 忽略 `workflows/my-*.json` 与 `*.customized.json`。如你 Fork 本仓库或自行同步配置，请切勿将包含真实 Bark Key、Cookie、Token 或内网地址的文件提交至公开仓库。
4. **控制 `NODE_FUNCTION_ALLOW_BUILTIN=fs` 权限范围**：
   仅当你使用「剧集入库文件队列聚合」或可选文件日志（`LOG_PATH`）时才需要在 n8n 容器开启 `NODE_FUNCTION_ALLOW_BUILTIN=fs`；未开启时工作流会自动降级为逐条直发，不影响正常推送。

## 反馈安全问题

如果你在工作流代码或测试脚本中发现潜在安全隐患（如路径穿越、命令注入或敏感信息泄露），请通过 GitHub Security Advisory 或私信维护者反馈，请勿直接在公开 Issue 中披露可利用的敏感细节。
