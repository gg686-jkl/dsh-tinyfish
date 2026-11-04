# dsh-tinyfish

把 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 里默认的 `web_search` / `web_fetch` 换成 [TinyFish](https://agent.tinyfish.ai) 的 MCP 工具
（`mcp__tinyfish__search`、`mcp__tinyfish__fetch_content`、`mcp__tinyfish__run_web_automation` …）。

一条命令，任何跑着 dsh 的机器都适用：桌面 `dsh`、手机端 dsh-go、局域网里的 remote profile。

[English](README.md) | 中文

## 它改了什么

只改当前 profile 的 `cordis.patch.yml`，追加一段带标记的块：

1. 挂上 TinyFish MCP server（`https://agent.tinyfish.ai/mcp`，streamable HTTP，API key 认证）。
2. 给**每一个 shipped preset 里带 `tool-web` 的 preset**（当前是 `standard`、`cordis`、`ptc`）各生成一份覆盖，只删掉 `tool-web`——于是新会话里只有 `mcp__tinyfish__*`，没有内置的 `web_search` / `web_fetch`。

为什么不止 `standard`：`agent-preset-registry` 解析新会话时先看 `selectedDefault`，再看 `default`。两者都可以是 `standard` 以外的 preset，而 `cordis` / `ptc` 同样带着 `tool-web`。只改 `standard` 时，新会话一旦落在 `cordis`，`web_search` 就还在。

覆盖是从本机安装的 dsh 现场生成的，所以不用管 dsh 版本差异。不碰 `package.json`、不装依赖（MCP 客户端是 dsh 自带的包）、不需要 pnpm。

## 用法

先拿 key：<https://agent.tinyfish.ai/api-keys>

```bash
git clone https://github.com/gg686-jkl/dsh-tinyfish-mcp.git
cd dsh-tinyfish-mcp
node install.mjs --key sk-tinyfish-xxxx
```

机器上没有 git（手机内置的 Ubuntu 常常没有）：

```bash
curl -fsSL https://codeload.github.com/gg686-jkl/dsh-tinyfish-mcp/tar.gz/refs/heads/main | tar xz
cd dsh-tinyfish-mcp-main
node install.mjs --key sk-tinyfish-xxxx
```

脚本默认读 `$DSH_PROFILE_DIR` / `$DSH_PROFILE`（在 dsh 会话里跑时它们已经设好）；要装到别的 profile 就加 `--profile <name>`。

默认覆盖**所有**带 `tool-web` 的 shipped preset。只想改其中一个：

```bash
node install.mjs --key sk-tinyfish-xxxx --presets standard
```

`dsh` 在 PATH 上是个启动器 shim（dsh-go 手机版就是这样）时，脚本会读启动器里真正的 `lib/bin.js` 路径来定位安装目录，不用手动指定。实在找不到会提示：给 `DSH_INSTALL` 赋值为含 `node_modules/@deepseek-ai/dsh` 的目录（dsh-go 通常是 `/opt/dsh`）。

## 验证

```bash
dsh --profile "${DSH_PROFILE:-web}" --dump-config | grep -c 'serverName: tinyfish'
```

安装脚本自己也会打印一行摘要，正常长这样：

```
composed profile: cordis (22 plugins, tool-web removed), ptc (22 plugins, tool-web removed), standard (21 plugins, tool-web removed)
TinyFish MCP row mounted: true
```

每个 preset 的 `plugins` 数等于 shipped 版本减一（少了 `tool-web`）；显示 `tool-web STILL PRESENT` 就说明覆盖没生效。

然后**重启 app，开一个新会话**，让它报一下自己的工具：应该能看到 `mcp__tinyfish__search`，看不到 `web_search`。

## 回滚 / dsh 升级后

```bash
node install.mjs --revert    # 删掉整段（含所有 preset 覆盖），恢复内置 web 工具
node install.mjs --force     # 升级 dsh 之后按新版本的 preset 重新生成
```

`--revert` 会删掉从 `# >>> dsh-tinyfish` 到 `# <<< dsh-tinyfish` 的整段，所以各 preset 的覆盖一起还原。首次安装前会留一份 `cordis.patch.yml.bak`。

## 说明

- key 写到 `$DSH_HOME/tinyfish.key`（mode 600），patch 里用 `!!js` 在激活时读取，YAML 里没有明文。
- 当前会话不变，新会话才生效（dsh 的 agent preset 在会话开始时固定）。app 重启后恢复的会话会按当前定义重新绑定。
- 如果你是用 bundle 装的（本仓库根目录同时就是那个 bundle：`package.json` + `cordis.patch.yml` + `locale/` + `icon.svg`），脚本检测到 TinyFish 已挂载会直接跳过。那条路适合桌面 `plugin_manager install_bundle`，但它只覆盖 `standard`，preset 快照也固定在编写时的 dsh 版本，升级后必须重新同步；要一次覆盖所有 preset，用 `install.mjs`。
- 不写 `AGENTS.md`：MCP 工具自身的描述已经带了 TinyFish 的用法约定（先 `search` 再 `fetch_content`、`run_web_automation` 报错可能仍在跑等）。

## 让 agent 一键部署

把 [PROMPT.md](PROMPT.md) 连同 key 一起交给 agent 就行。里面写好了完整步骤（clone → install → 验证 → 重启提示）和约束（只改 profile patch、不动 `package.json`、不写 `AGENTS.md`、不碰其他 profile）。也可以直接贴这一句：

```text
帮我用 TinyFish MCP 替换这个 dsh profile 的内置 web_search / web_fetch。完整步骤见 https://github.com/gg686-jkl/dsh-tinyfish-mcp 的 PROMPT.md。key：sk-tinyfish-xxxx
```

## 给 agent 的步骤

（可直接粘贴的完整版见 [PROMPT.md](PROMPT.md)。）

1. `command -v dsh` 确认 dsh 在 PATH；记下 `$DSH_PROFILE` / `$DSH_PROFILE_DIR`。
2. 用上面的 `git clone`，没有 git 就用 tarball。
3. `node install.mjs --key <用户给的 key>`（用户没给就停下来问）。
4. 跑一次「验证」里的命令，把 `composed profile:` 那行和 grep 输出贴给用户。摘要里出现 `tool-web STILL PRESENT`，或脚本报找不到 dsh 安装目录（可试 `DSH_INSTALL=/opt/dsh`）要如实说明。
5. 告诉用户重启 app 并开新会话；当前会话的工具列表不会变。

## 相关

- TinyFish 面向 coding agent 的说明：<https://docs.tinyfish.ai/for-coding-agents>
- 完整 API：<https://docs.tinyfish.ai/llms-full.txt>
- 依赖：dsh ≥ 0.2（`@deepseek-ai/dsh-mcp-client`，以及 `@deepseek-ai/dsh-web-app` 的 `presets/*.patch.yml`）

MIT
