#!/usr/bin/env node
/**
 * n8n Webhook → Bark 交互式终端配置向导（零依赖，需要 Node.js 18+）
 *
 * 功能说明：
 * 1. 通过问答方式收集你的 Bark 地址/Key、n8n Webhook 路径、可选 MoviePilot/Jellyfin 链接、
 *    自定义应用图标/Grafana 分系统 Logo 以及聚合去重参数；
 * 2. 基于脱敏模板 `workflows/webhook-to-bark.json` 安全生成可直接导入 n8n 的 `workflows/my-webhook-to-bark.json`
 *    （该文件已加入 .gitignore，不会被误提交到 GitHub）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TEMPLATE_PATH = path.join(ROOT, "workflows", "webhook-to-bark.json");
const OUT_WF_PATH = path.join(ROOT, "workflows", "my-webhook-to-bark.json");

const rl = readline.createInterface({ input, output });

async function ask(question, defaultVal = "") {
  const hint = defaultVal ? ` [默认: ${defaultVal}]` : "";
  const answer = (await rl.question(`${question}${hint}: `)).trim();
  return answer || defaultVal;
}

function replaceConstStr(code, name, value) {
  const re = new RegExp(`const\\s+${name}\\s*=\\s*"[^"]*";`);
  return code.replace(re, () => `const ${name} = ${JSON.stringify(value)};`);
}

async function main() {
  console.log("\n==============================================================");
  console.log("  n8n Webhook → Bark 交互式导入配置向导");
  console.log("  纯本地运行，不会上传任何数据；生成文件自动被 .gitignore 忽略");
  console.log("==============================================================\n");

  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error(`未找到工作流模板文件：${TEMPLATE_PATH}`);
    process.exit(1);
  }

  console.log("【步骤 1/5】Bark 推送目标（必填）");
  const barkServer = (
    await ask("  1) Bark 服务器地址（官方填 https://api.day.app，或自建地址）", "https://api.day.app")
  ).replace(/\/+$/, "");
  let barkKey = "";
  while (!barkKey) {
    barkKey = await ask("  2) Bark Device Key（从 iOS Bark App 首页复制）");
    if (!barkKey) console.log("     ⚠ Device Key 不能为空，请重新输入。");
  }
  const barkFullUrl = `${barkServer}/${barkKey}`;

  console.log("\n【步骤 2/5】n8n Webhook 入口设置");
  const n8nBaseUrl = (
    await ask("  1) 你的 n8n 访问地址（如 https://n8n.example.com）", "https://your-n8n.example.com")
  ).replace(/\/+$/, "");
  const webhookPath = (await ask("  2) Webhook 路径（不带前导斜杠）", "renotify")).replace(/^\/+/, "");
  const authType = (await ask("  3) 是否计划在 Webhook 节点开启认证？(none / basic / header)", "none")).toLowerCase();

  console.log("\n【步骤 3/5】MoviePilot / Jellyfin 跳转链接（可选，直接回车跳过）");
  const mpBaseUrl = (await ask("  1) MoviePilot 地址（例如 https://mp.example.com）", "")).replace(/\/+$/, "");
  const jellyfinBase = (await ask("  2) Jellyfin 根地址（例如 https://jellyfin.example.com）", "")).replace(/\/+$/, "");

  console.log("\n【步骤 4/5】自定义应用图标与 Grafana 分系统 Logo（可选）");
  const wantIcons = (await ask("  是否现在自定义各应用图标 URL？(y/N)", "N")).toLowerCase() === "y";
  const icons = {
    mpDefault: "",
    sports: "",
    grafana: "",
    wallos: "",
    diunDocker: "",
    diunDefault: "",
    zerobyte: "",
    keylol: "",
    ptChannel: "",
    live: "",
    grafanaSystems: [],
    sites: [],
    artists: [],
  };

  if (wantIcons) {
    console.log("  （直接回车表示保持模板默认或留空）");
    icons.mpDefault = await ask("  - MoviePilot 默认兜底图标 (MP_DEFAULT_ICON)", "");
    icons.sports = await ask("  - MoviePilot 体育赛事图标 (SPORTS_ICON)", "");
    icons.grafana = await ask("  - Grafana 默认图标 (GRAFANA_DEFAULT_ICON)", "https://cdn.jsdelivr.net/gh/selfhst/icons/png/grafana.png");
    icons.wallos = await ask("  - Wallos 图标 (WALLOS_ICON)", "https://cdn.jsdelivr.net/gh/selfhst/icons/png/wallos.png");
    icons.diunDocker = await ask("  - Diun Docker Hub 图标 (DIUN_DOCKER_ICON)", "https://cdn.jsdelivr.net/gh/selfhst/icons/png/docker.png");
    icons.diunDefault = await ask("  - Diun 非 Docker Hub 图标 (DIUN_DEFAULT_ICON)", "");
    icons.zerobyte = await ask("  - Zerobyte 图标 (ZEROBYTE_ICON)", "");
    icons.ptChannel = await ask("  - RSS PT 频道图标 (PT_CHANNEL_ICON)", "");
    icons.live = await ask("  - RSS 直播开播图标 (LIVE_STREAM_ICON)", "");

    console.log("  - 可追加 Grafana 分系统 Logo（格式: 关键词1,关键词2 = 图标URL，直接回车结束）");
    while (true) {
      const line = await ask("    Grafana 系统规则");
      if (!line) break;
      const idx = line.indexOf("=");
      if (idx > 0) {
        const kws = line.slice(0, idx).split(/[,，]/).map((s) => s.trim()).filter(Boolean);
        const url = line.slice(idx + 1).trim();
        if (kws.length) icons.grafanaSystems.push([kws, url]);
      }
    }

    console.log("  - 可追加 MoviePilot 站点图标（格式: 站点关键词 = 图标URL，直接回车结束）");
    while (true) {
      const line = await ask("    MP 站点图标规则");
      if (!line) break;
      const idx = line.indexOf("=");
      if (idx > 0) {
        const k = line.slice(0, idx).trim();
        const url = line.slice(idx + 1).trim();
        if (k && url) icons.sites.push([k, url]);
      }
    }

    console.log("  - 可追加 Spotify 艺人图标（格式: 艺人名 = 图标URL，直接回车结束）");
    while (true) {
      const line = await ask("    Spotify 艺人图标");
      if (!line) break;
      const idx = line.indexOf("=");
      if (idx > 0) {
        const k = line.slice(0, idx).trim().toLowerCase();
        const url = line.slice(idx + 1).trim();
        if (k && url) icons.artists.push([k, url]);
      }
    }
  }

  console.log("\n【步骤 5/5】去重、剧集入库聚合与文件日志（直接回车保持推荐默认值）");
  const dedupeSec = await ask("  1) 相同通知去重窗口（秒，0 表示关闭）", "120");
  const idleSec = await ask("  2) 剧集多集入库静默合并窗口（秒）", "20");
  const logPath = await ask("  3) 原始通知落盘日志路径（留空关闭，如 /home/node/.n8n/reNotify_log.txt）", "");

  // 加载并修补工作流模板
  const wf = JSON.parse(fs.readFileSync(TEMPLATE_PATH, "utf8"));
  for (const node of wf.nodes || []) {
    if (node.type === "n8n-nodes-base.webhook") {
      node.parameters.path = webhookPath;
      node.name = `Webhook - /${webhookPath}`;
    }
    if (node.name === "发送到 Bark" && node.parameters) {
      node.parameters.url = barkFullUrl;
    }
    if (typeof node.parameters?.jsCode !== "string") continue;
    let code = node.parameters.jsCode;

    if (node.name === "准备请求" && logPath) {
      code = replaceConstStr(code, "LOG_PATH", logPath);
    }
    if (node.name === "通知去重" && /^\d+$/.test(dedupeSec)) {
      code = code.replace(/const DEDUPE_WINDOW_SECONDS = \d+;/, () => `const DEDUPE_WINDOW_SECONDS = ${Number(dedupeSec)};`);
    }
    if (node.name === "刷出入库缓冲" && /^\d+$/.test(idleSec)) {
      code = code.replace(/const TRANSFER_IDLE_SECONDS = \d+;/, () => `const TRANSFER_IDLE_SECONDS = ${Number(idleSec)};`);
    }
    if (node.name === "合并入库通知" && icons.mpDefault) {
      code = replaceConstStr(code, "MP_DEFAULT_ICON", icons.mpDefault);
    }
    if (node.name === "解析 - MoviePilot") {
      if (icons.mpDefault) code = replaceConstStr(code, "MP_DEFAULT_ICON", icons.mpDefault);
      if (icons.sports) code = replaceConstStr(code, "SPORTS_ICON", icons.sports);
      if (mpBaseUrl) code = replaceConstStr(code, "MP_BASE_URL", mpBaseUrl);
      if (jellyfinBase) code = code.replace(/https:\/\/your-jellyfin\.example\.com/g, () => jellyfinBase);
      if (icons.sites.length > 0) {
        const entries = icons.sites.map(([k, u]) => `  [${JSON.stringify(k)}, ${JSON.stringify(u)}]`).join(",\n");
        code = code.replace(/const SITE_ICONS = \[[\s\S]*?\];/, () => `const SITE_ICONS = [\n${entries}\n];`);
      }
    }
    if (node.name === "解析 - Grafana") {
      if (icons.grafana) code = replaceConstStr(code, "GRAFANA_DEFAULT_ICON", icons.grafana);
      if (icons.grafanaSystems.length > 0) {
        const entries = icons.grafanaSystems.map(([kws, u]) => `  [${JSON.stringify(kws)}, ${JSON.stringify(u)}]`).join(",\n");
        code = code.replace(/const GRAFANA_SYSTEM_ICONS = \[[\s\S]*?\];/, () => `const GRAFANA_SYSTEM_ICONS = [\n${entries}\n];`);
      }
    }
    if (node.name === "解析 - RSS") {
      if (icons.ptChannel) code = replaceConstStr(code, "PT_CHANNEL_ICON", icons.ptChannel);
      if (icons.live) code = replaceConstStr(code, "LIVE_STREAM_ICON", icons.live);
      if (icons.artists.length > 0) {
        const obj = Object.fromEntries(icons.artists);
        code = code.replace(/const SPOTIFY_ARTIST_ICONS = \{[\s\S]*?\};/, () => `const SPOTIFY_ARTIST_ICONS = ${JSON.stringify(obj, null, 2)};`);
      }
    }
    if (node.name === "解析 - Wallos" && icons.wallos) {
      code = replaceConstStr(code, "WALLOS_ICON", icons.wallos);
    }
    if (node.name === "解析 - Diun") {
      if (icons.diunDocker) code = replaceConstStr(code, "DIUN_DOCKER_ICON", icons.diunDocker);
      if (icons.diunDefault) code = replaceConstStr(code, "DIUN_DEFAULT_ICON", icons.diunDefault);
    }
    if (node.name === "解析 - Zerobyte" && icons.zerobyte) {
      code = replaceConstStr(code, "ZEROBYTE_ICON", icons.zerobyte);
    }

    node.parameters.jsCode = code;
  }

  const oldWhKey = "Webhook - /renotify";
  const newWhKey = `Webhook - /${webhookPath}`;
  if (newWhKey !== oldWhKey && wf.connections?.[oldWhKey]) {
    wf.connections[newWhKey] = wf.connections[oldWhKey];
    delete wf.connections[oldWhKey];
  }

  fs.writeFileSync(OUT_WF_PATH, JSON.stringify(wf, null, 2) + "\n", "utf8");

  const webhookUrl = `${n8nBaseUrl}/webhook/${webhookPath}`;
  console.log("\n✅ 专属工作流生成成功！");
  console.log(`   输出文件：${OUT_WF_PATH}`);
  console.log("\n下一步操作指引：");
  console.log("  [1] 在 n8n Docker 环境变量中确认已配置：");
  console.log("      - TZ=Asia/Shanghai");
  console.log("      - NODE_FUNCTION_ALLOW_BUILTIN=fs  （启用剧集入库聚合与可选日志）");
  console.log("  [2] 打开 n8n → 新建工作流 → 右上角 ⋯ → Import from File → 选择 workflows/my-webhook-to-bark.json");
  if (authType !== "none") {
    console.log(`  [3] 打开节点「${newWhKey}」，将 Authentication 设为 ${authType === "basic" ? "Basic Auth" : "Header Auth"} 并填入凭据`);
  }
  console.log("  [4] 点击右上角开关激活工作流（Active = ON）");
  console.log(`  [5] 将各应用的 Webhook 地址指向：${webhookUrl}`);
  console.log("  [6] 运行以下冒烟测试命令验证连通性：");
  console.log(`      curl -X POST "${webhookUrl}" -H "Content-Type: application/json" -d '{"zerobyte_title":"连通性测试","zerobyte_message":"部署验证成功！","__test":true}'\n`);

  rl.close();
}

main().catch((err) => {
  console.error("向导运行出错：", err);
  rl.close();
  process.exit(1);
});
