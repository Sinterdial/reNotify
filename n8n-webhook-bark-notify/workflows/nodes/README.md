# 独立节点 JSON 目录说明

本目录存放从 [../webhook-to-bark.json](../webhook-to-bark.json) 同步导出的 **14 个独立可替换节点**（均已脱敏）。

## 适用场景

当你已经在自己的 n8n 中配置好了 Bark 地址和自定义图标，后续仓库仅更新了某一个解析节点（例如优化了 `解析 - MoviePilot` 或 `解析 - Grafana`）时，无需重新导入整条工作流：

1. 打开对应的单节点 JSON 文件，复制其中的 `parameters.jsCode`（或直接全选 JSON 在 n8n 画布按 `Ctrl+V` 粘贴）；
2. 替换原有节点后，保留你顶部自定义好的图标常量即可。

## 节点清单

- **入口与日志**：`准备请求.json`
- **应用解析器**：`解析 - MoviePilot.json`、`解析 - RSS.json`、`解析 - Grafana.json`、`解析 - Dockhand.json`、`解析 - Wallos.json`、`解析 - Diun.json`、`解析 - Zerobyte.json`
- **去重与响应**：`通知去重.json`、`响应 200.json`、`是否有待发消息.json`
- **剧集入库聚合**：`入库缓冲.json`、`刷出入库缓冲.json`、`合并入库通知.json`
