# dsh-tinyfish

**让 dsh 的网页搜索免费——电脑和手机都能用。**

- **免费。** dsh 内置的 `web_search` / `web_fetch` 走 DeepSeek 的 Search & Fetch API，按
  **$0.75 / 1,000 次搜索**、**$0.75 / 1,000 次抓取**计费。TinyFish 的搜索和抓取免费
  （有限速，不需要信用卡），效果相当。
- **两端同一套。** 桌面 `dsh` 和手机端 dsh-go 用同一个脚本，不用手改配置；远程 / 局域网 profile 也适用。
- **撤得干净。** 回滚一条命令，key 不会写进 YAML。

重启后新会话里是 `mcp__tinyfish__search`、`mcp__tinyfish__fetch_content`，不再有
`web_search` / `web_fetch`。

## 安装

免费 key：<https://agent.tinyfish.ai/api-keys>

```bash
git clone https://github.com/gg686-jkl/dsh-tinyfish-mcp.git
cd dsh-tinyfish-mcp
node install.mjs --key sk-tinyfish-xxxx
```

没有 git（手机常见）：

```bash
curl -fsSL https://codeload.github.com/gg686-jkl/dsh-tinyfish-mcp/tar.gz/refs/heads/main | tar xz
cd dsh-tinyfish-mcp-main && node install.mjs --key sk-tinyfish-xxxx
```

然后重启 app，开一个**新会话**；当前会话仍保留启动时的工具。

## 检查

```bash
dsh --profile "${DSH_PROFILE:-web}" --dump-config | grep -c 'serverName: tinyfish'   # 应为 1
```

安装时会打印 `composed profile: …` 和 `TinyFish MCP row mounted: true`。出现 `STILL PRESENT`
或 `false` 说明没生效。

## 回滚 / dsh 升级后

```bash
node install.mjs --revert    # 恢复内置 web 工具
node install.mjs --force     # 按新版 dsh 重新生成
```

## 它改了什么

- 只在当前 profile 的 `cordis.patch.yml` 里追加一段带标记的块；首次安装留一份 `.bak`。
- 所有带 `tool-web` 的 shipped preset（`standard`、`cordis`、`ptc`）都会被覆盖，换 preset 也换不回付费工具。
- key 存在 `$DSH_HOME/tinyfish.key`（0600），不会写进 YAML。

## 出错怎么办

- 提示 `could not find the dsh installation` —— 命令前加 `DSH_INSTALL=/opt/dsh`（dsh-go 的位置）。
- 装错了 profile —— 加 `--profile <name>`，默认跟随 `$DSH_PROFILE`。
- 只想改一个 preset —— `--presets standard`。

## 交给 agent

把 [PROMPT.md](PROMPT.md) 和 key 一起给 coding agent，它会执行安装和检查，并把两行摘要回报给你。

要求 dsh ≥ 0.2；不安装任何依赖（MCP 客户端是 dsh 自带的）。

---

[English](README.md) · MIT
