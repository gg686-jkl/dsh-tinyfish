# dsh-tinyfish

**给 dsh 免费用上搜索和抓取 —— 而且不改变模型已经认识的工具。**

[English](README.md) | 中文

![工具不变，后端免费](assets/hero.zh.png)

dsh 自带的 `web_search` / `web_fetch` 背后是 DeepSeek 的付费 Search & Fetch API（**各 $0.75 / 1,000 次**）。
本项目保留这两个工具 —— 名字、参数、描述全同 —— 只把请求转给免费的 TinyFish。

## 安装

先领免费 key：<https://agent.tinyfish.ai/api-keys>，然后：

```bash
git clone https://github.com/gg686-jkl/dsh-tinyfish-mcp.git
cd dsh-tinyfish-mcp
node install.mjs --key sk-tinyfish-xxxx
```

没有 git（手机上常见）：

```bash
curl -fsSL https://codeload.github.com/gg686-jkl/dsh-tinyfish-mcp/tar.gz/refs/heads/main | tar xz
cd dsh-tinyfish-mcp-main && node install.mjs --key sk-tinyfish-xxxx
```

重启 dsh，开一个**新会话**。搞定 —— 此后搜索和抓取都走 TinyFish。

## 检查

```bash
dsh --profile "${DSH_PROFILE:-web}" --dump-config | grep -c web-tinyfish   # 期望 1
```

## 撤销

```bash
node install.mjs --revert
```

## 常见问题

**工具会变吗？** 不会。`web_search` / `web_fetch` 的名字、参数 schema、描述、输出格式都是官方原版；
本项目只是把 TinyFish 注册成 `ctx.web` 的 provider，模型看到的还是它训练时认识的那两个工具。

**要花钱吗？** 不用。TinySearch 免费（30 次/分），TinyFetch 免费（1,000 URL/天），都不扣钱包。

**浏览器自动化、深度研究呢？** 那些 TinyFish 收费，所以默认不挂。需要的话
`node install.mjs --key … --with-mcp`，会以 `mcp__tinyfish__*` 的形式加进来。

**那为什么不整个用 TinyFish 的 MCP？** 它的工具名会被加上命名空间（`mcp__tinyfish__search`），参数也不一样，
模型得重新学；保留官方工具没有这个代价。

**dsh-go 手机端能用吗？** 能，同样的命令，不装任何依赖。

**以前装过 MCP-only 的旧版？** `node install.mjs --key … --force` 原地升级。

<details>
<summary><b>让 agent 帮你装</b> —— 复制这段，填上 key</summary>

```text
把本机 dsh profile 的搜索/抓取后端从 DeepSeek 的付费 Search & Fetch API 换成 TinyFish，但不要改变模型看到的东西：已安装的 @deepseek-ai/dsh-tool-web 必须继续提供 web_search / web_fetch，名字和参数都不动 —— 脚本只是把 TinyFish 注册成 ctx.web 的 provider。按顺序做，任何一步失败就停下。

TinyFish key: sk-tinyfish-xxxx

1. `command -v dsh` 必须输出路径。记下 $DSH_PROFILE 和 $DSH_PROFILE_DIR，那就是要改的 profile，不要换。
2. git clone https://github.com/gg686-jkl/dsh-tinyfish-mcp.git
   （没有 git：curl -fsSL https://codeload.github.com/gg686-jkl/dsh-tinyfish-mcp/tar.gz/refs/heads/main | tar xz）
3. cd dsh-tinyfish-mcp && node install.mjs --key sk-tinyfish-xxxx
   如果它说找不到 dsh 安装目录，用 DSH_INSTALL=/opt/dsh 前缀重跑。
4. 原样贴回这三行：provider row mounted / web seam pointed at tinyfish / official web_search/web_fetch enabled。任何一行是 false 就算失败。
5. 运行：dsh --profile "${DSH_PROFILE:-web}" --dump-config | grep -c 'web-tinyfish'   （期望 1）
6. 告诉我重启 app 并开新会话。新会话里 web_search / web_fetch 应该和以前一模一样，结果来自 TinyFish。

约束：只改当前 profile 的 cordis.patch.yml（脚本会备份）；不要改 package.json、不要写 AGENTS.md、不要碰其他 profile；不要删/禁用 tool-web。完整版见 PROMPT.md。
```

</details>

## 说明

- 需要 dsh ≥ 0.2；除了这个仓库本身，什么都不装。
- key 存在 `$DSH_HOME/tinyfish.key`（mode 600），不进 YAML。
- 需要 TinyFish 的高级抓取参数（`format`、CSS selector、一次 10 个 URL），或者想在同一会话里跑自动化/深研？
  用 `--with-mcp`，那些能力 TinyFish 按量收费。

MIT
